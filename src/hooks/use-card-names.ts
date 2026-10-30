import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { CACHE_MAX_AGE_MS } from '@/constants/cache';
import { fetchCardNames } from '@/services/scryfall';

// This hook keeps the list of every card name on the phone, so searching works with no
// internet. How it behaves:
//   1. On start it loads the saved list from the phone right away (works offline).
//   2. If the saved list is more than 7 days old (or missing), and the phone is online,
//      it downloads Scryfall's list again in the background.
//   3. If the new list is different, it replaces the saved one. If not, nothing changes.
//   4. If there is no internet, it quietly keeps using what is saved.

const NAMES_KEY = 'card-names'; // the saved list itself
const CHECKED_KEY = 'card-names-checked'; // when we last asked Scryfall, as a number
const RECHECK_AFTER_MS = CACHE_MAX_AGE_MS; // 7 days

// What the screen needs to know about the list:
//   loading  - still reading what is saved on the phone
//   ready    - we have a list we can search
//   empty    - nothing saved and couldn't download it (first run with no internet)
type Status = 'loading' | 'ready' | 'empty';

export function useCardNames() {
  const [names, setNames] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  // true while a download from Scryfall is in progress
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Downloads the list and saves it if it changed. "force" skips the 7-day wait.
  const refresh = useCallback(async (saved: string[], force: boolean) => {
    const checkedText = await AsyncStorage.getItem(CHECKED_KEY).catch(() => null);
    const checkedAt = checkedText ? Number(checkedText) : 0;
    const isFresh = saved.length > 0 && Date.now() - checkedAt < RECHECK_AFTER_MS;
    if (isFresh && !force) return;

    setUpdating(true);
    try {
      const latest = await fetchCardNames();
      // Only save (and re-search) when Scryfall's list really is different from ours.
      const changed = latest.length !== saved.length || latest.some((name, i) => name !== saved[i]);
      if (changed) {
        setNames(latest);
        await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(latest)).catch(() => {});
      }
      await AsyncStorage.setItem(CHECKED_KEY, String(Date.now())).catch(() => {});
      setStatus('ready');
      setError(null);
    } catch (e) {
      // Offline or Scryfall is down. If we already have a saved list, that's fine: carry on.
      if (saved.length === 0) {
        setStatus('empty');
        setError(e instanceof Error ? e.message : 'Could not download the card list.');
      }
    } finally {
      setUpdating(false);
    }
  }, []);

  // When the screen first appears: load what's saved, then check for updates.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved: string[] = [];
      try {
        const text = await AsyncStorage.getItem(NAMES_KEY);
        if (text) saved = JSON.parse(text);
      } catch {
        // Damaged or unreadable save: treat it as "nothing saved".
      }
      if (cancelled) return;
      if (saved.length > 0) {
        setNames(saved);
        setStatus('ready');
      }
      // (On a first run with nothing saved, refresh() sets "ready" or "empty" itself.)
      await refresh(saved, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Lets the "Try again" button download the list right now.
  const retry = useCallback(() => {
    setStatus('loading');
    refresh(names, true);
  }, [names, refresh]);

  return { names, status, updating, error, retry };
}
