import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { CACHE_MAX_AGE_MS } from '@/constants/cache';
import { fetchCard, fetchRulings, type CardData, type Ruling } from '@/services/scryfall';

// This hook looks up everything we show for one card: its text, its picture addresses
// and its rulings. Cards you have looked at before are saved on the phone, so their text
// and rulings still show when you are offline.
//
// A saved card is used as-is for 7 days (see src/constants/cache.ts), with no internet
// request at all. After that it is refreshed from Scryfall when online, and if the phone is
// offline the old saved copy keeps being shown.

// What the card view needs to know:
//   idle     - no card chosen yet
//   loading  - fetching (and nothing saved to show in the meantime)
//   ready    - we have a card to show (maybe a saved copy, see "fromSaved")
//   error    - nothing to show; "error" says why
type Status = 'idle' | 'loading' | 'ready' | 'error';

// What we keep on the phone for each card. "savedAt" is when we downloaded it, as a number
// of milliseconds. Copies saved before this field existed don't have one, so they count as old.
type Saved = { card: CardData; rulings: Ruling[]; savedAt?: number };

// Saved cards live under a key like "card:The Ur-Dragon".
const keyFor = (name: string) => `card:${name}`;

export function useCardDetails(name: string | null) {
  const [status, setStatus] = useState<Status>('idle');
  const [data, setData] = useState<Saved | null>(null);
  const [error, setError] = useState<string | null>(null);
  // true when what's on screen came from the phone's memory and the internet couldn't update it
  const [fromSaved, setFromSaved] = useState(false);

  // Runs again every time a different card is chosen.
  useEffect(() => {
    if (!name) {
      setStatus('idle');
      setData(null);
      return;
    }

    // If the user picks another card before this lookup finishes, "cancelled" becomes true
    // and the slow answer for the old card is thrown away instead of replacing the new one.
    let cancelled = false;
    setError(null);
    setFromSaved(false);

    (async () => {
      // Step 1: show the saved copy straight away if there is one.
      let saved: Saved | null = null;
      try {
        const text = await AsyncStorage.getItem(keyFor(name));
        if (text) saved = JSON.parse(text);
      } catch {
        // Unreadable save: ignore it and fetch fresh.
      }
      if (cancelled) return;
      if (saved) {
        setData(saved);
        setStatus('ready');
      } else {
        setData(null);
        setStatus('loading');
      }

      // If the saved copy is less than 7 days old, it is good enough: stop here, no download.
      if (saved?.savedAt !== undefined && Date.now() - saved.savedAt < CACHE_MAX_AGE_MS) return;

      // Step 2: the copy is missing or old, so ask Scryfall for the latest and save it.
      try {
        const { card, rulingsUrl } = await fetchCard(name);
        const rulings = await fetchRulings(rulingsUrl);
        if (cancelled) return;
        const fresh: Saved = { card, rulings, savedAt: Date.now() };
        setData(fresh);
        setStatus('ready');
        setFromSaved(false);
        AsyncStorage.setItem(keyFor(name), JSON.stringify(fresh)).catch(() => {});
      } catch (e) {
        if (cancelled) return;
        if (saved) {
          // Offline, but we still have the old copy on screen.
          setFromSaved(true);
        } else {
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Something went wrong loading this card.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [name]);

  return { status, card: data?.card ?? null, rulings: data?.rulings ?? [], error, fromSaved };
}
