import { Stack } from 'expo-router';

// The settings tab holds two screens that sit on top of each other like a stack of cards:
//   "index"    -> src/app/settings/index.tsx     (the settings screen you land on)
//   "features" -> src/app/settings/features.tsx  (the guide, opened with the Features button)
// Tapping the Features button puts the guide on top, and the guide's "Settings" button takes it
// off again. Because both live inside this one tab, the bottom bar and its gear icon stay the same.
// We hide the default title bar because each screen draws its own title.
// Even if someone opens the Features page straight from its web address, the settings screen
// is placed underneath it, so the "Settings" button on the Features page always has a screen to
// go back to.
export const unstable_settings = { initialRouteName: 'index' };

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
