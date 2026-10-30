import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { CACHE_MAX_AGE_MS } from '@/constants/cache';
import { fetchSymbology, type CardSymbol } from '@/services/scryfall';

// This file keeps Scryfall's table of mana and game symbols (the little pictures for
// {W}, {2}, {T} and so on) where any screen can look them up.
//
// Like the card name list, the table is saved on the phone so it is there offline.
// It is loaded from the phone first, then downloaded again in the background if it
// is missing or more than 7 days old (see src/constants/cache.ts).

const SYMBOLS_KEY = 'mana-symbols';
const CHECKED_KEY = 'mana-symbols-checked';
const RECHECK_AFTER_MS = CACHE_MAX_AGE_MS; // 7 days

// The lookup table: "{W}" -> its picture address and description.
type SymbolTable = Record<string, CardSymbol>;

// Starts empty. Until the table loads, symbols are simply shown as text like {W}.
const SymbolsContext = createContext<SymbolTable>({});

// Wrap the app in this once (done in src/app/_layout.tsx).
export function SymbolsProvider({ children }: { children: ReactNode }) {
  const [table, setTable] = useState<SymbolTable>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Step 1: use the saved table straight away, if there is one.
      let saved: SymbolTable = {};
      try {
        const text = await AsyncStorage.getItem(SYMBOLS_KEY);
        if (text) saved = JSON.parse(text);
      } catch {
        // Unreadable save: treat as nothing saved.
      }
      if (cancelled) return;
      if (Object.keys(saved).length > 0) setTable(saved);

      // Step 2: if it's missing or old, download a fresh one.
      const checkedText = await AsyncStorage.getItem(CHECKED_KEY).catch(() => null);
      const checkedAt = checkedText ? Number(checkedText) : 0;
      const isFresh = Object.keys(saved).length > 0 && Date.now() - checkedAt < RECHECK_AFTER_MS;
      if (isFresh) return;

      try {
        const latest = await fetchSymbology();
        if (cancelled) return;
        setTable(latest);
        await AsyncStorage.setItem(SYMBOLS_KEY, JSON.stringify(latest)).catch(() => {});
        await AsyncStorage.setItem(CHECKED_KEY, String(Date.now())).catch(() => {});
      } catch {
        // Offline: keep whatever we already have. We'll try again next time the app starts.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <SymbolsContext.Provider value={table}>{children}</SymbolsContext.Provider>;
}

// Any screen calls useSymbols() to get the lookup table.
export function useSymbols() {
  return useContext(SymbolsContext);
}
