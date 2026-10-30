import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { GameProvider } from '@/context/game-context';
import { SettingsProvider } from '@/context/settings-context';
import { SymbolsProvider } from '@/context/symbols-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

// Everything that needs the settings (including the light/dark choice) lives in here,
// because it must sit INSIDE the SettingsProvider below.
function ThemedApp() {
  // Our own helper: follows the Theme setting (Light / System / Dark).
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {/* SymbolsProvider loads the mana symbol pictures so any screen can show them. */}
      <SymbolsProvider>
        {/* GameProvider keeps the current game and saves it, so it survives closing the app. */}
        <GameProvider>
          <AppTabs />
        </GameProvider>
      </SymbolsProvider>
    </ThemeProvider>
  );
}

// The outermost layer of the app. SettingsProvider goes first so every screen,
// and the theme logic above, can read the saved settings.
export default function TabLayout() {
  return (
    <SettingsProvider>
      <ThemedApp />
    </SettingsProvider>
  );
}
