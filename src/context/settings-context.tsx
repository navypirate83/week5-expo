import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// The three choices for the Theme setting.
export type ThemeChoice = 'light' | 'system' | 'dark';

// The numbers of players the Max Players dropdown offers.
// Other files import this list so the dropdown and the setting always agree.
export const MAX_PLAYER_OPTIONS = [2, 3, 4, 5, 6] as const;
export type MaxPlayers = (typeof MAX_PLAYER_OPTIONS)[number];

// Everything the settings page controls, bundled together in one object.
type Settings = {
  hapticFeedback: boolean; // true = on, false = off
  theme: ThemeChoice;
  maxPlayers: MaxPlayers;
};

// What other files get when they ask for the settings: the current values,
// plus a function to change one of them.
type SettingsContextValue = {
  settings: Settings;
  // Pass the name of one setting and its new value. Example: updateSetting('theme', 'dark').
  updateSetting: <Key extends keyof Settings>(key: Key, value: Settings[Key]) => void;
};

// The starting value of each setting the first time the app opens.
const DEFAULT_SETTINGS: Settings = {
  hapticFeedback: true,
  theme: 'system',
  maxPlayers: 4,
};

// The name of the "drawer" on the phone where we keep the saved settings.
const STORAGE_KEY = 'app-settings';

// Turns whatever was saved on the phone back into a proper Settings object.
// The saved text could be missing, damaged, or from an older version of the app,
// so we check each value and fall back to the default for anything that looks wrong.
function readSavedSettings(saved: unknown): Settings {
  const data = (saved ?? {}) as Partial<Record<keyof Settings, unknown>>;
  return {
    hapticFeedback:
      typeof data.hapticFeedback === 'boolean' ? data.hapticFeedback : DEFAULT_SETTINGS.hapticFeedback,
    theme:
      data.theme === 'light' || data.theme === 'system' || data.theme === 'dark'
        ? data.theme
        : DEFAULT_SETTINGS.theme,
    maxPlayers: MAX_PLAYER_OPTIONS.find((option) => option === data.maxPlayers) ?? DEFAULT_SETTINGS.maxPlayers,
  };
}

// A "context" is a shared notice board. Any screen can read it, so the settings
// page and (later) the life tracker both see the same values without passing them around.
const SettingsContext = createContext<SettingsContextValue | null>(null);

// Wrap the whole app in this once (done in src/app/_layout.tsx). It owns the settings,
// loads them from the phone when the app starts, and saves them every time they change.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  // "loaded" becomes true once we've looked for saved settings.
  // Until then we show nothing, so you never see the defaults flash before your own settings.
  const [loaded, setLoaded] = useState(false);

  // When the app starts: look in the storage drawer for saved settings.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((text) => {
        if (text) setSettings(readSavedSettings(JSON.parse(text)));
      })
      // If reading fails (or the saved text is damaged) we just keep the defaults.
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Whenever the settings change: save them. This is why nobody has to press a "Save" button.
  // We skip saving until loading has finished, so the defaults never overwrite your saved choices.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, loaded]);

  // Copy the old settings, then replace just the one that changed.
  const updateSetting: SettingsContextValue['updateSetting'] = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  if (!loaded) return null;

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Any screen calls useSettings() to read or change the settings.
export function useSettings() {
  const value = useContext(SettingsContext);
  // If this fires, a screen is being used outside the SettingsProvider by mistake.
  if (!value) {
    throw new Error('useSettings must be used inside a SettingsProvider');
  }
  return value;
}
