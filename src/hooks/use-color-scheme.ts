import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useSettings } from '@/context/settings-context';

// Tells the app whether to look "light" or "dark" right now.
// If the Theme setting is Light or Dark, that choice wins.
// If it's System, we follow the phone's own light/dark mode.
export function useColorScheme() {
  const { settings } = useSettings();
  const systemScheme = useSystemColorScheme();

  return settings.theme === 'system' ? systemScheme : settings.theme;
}
