import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useSettings } from '@/context/settings-context';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
// Tells the app whether to look "light" or "dark" right now (web version).
// If the Theme setting is Light or Dark, that choice wins. If it's System, we follow
// the browser's own light/dark mode, but only after the page has finished loading,
// because the pre-built page can't know the browser's mode.
export function useColorScheme() {
  const { settings } = useSettings();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const systemScheme = useSystemColorScheme();

  if (!hasHydrated) {
    return 'light';
  }

  return settings.theme === 'system' ? systemScheme : settings.theme;
}
