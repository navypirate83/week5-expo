import { Tabs } from 'expo-router';

import { CardIcon, D20Icon, GearIcon } from '@/components/tab-icons';
import { Colors } from '@/constants/theme';
// We use the app's own light/dark helper (not React Native's) so the tab bar always
// agrees with the rest of the app, including when the page loads in a web browser.
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHaptics } from '@/hooks/use-haptics';

// This is the bar of three icons along the bottom of the screen.
// It is one file used on phones AND in the web browser, so what you see is the same.
// Each <Tabs.Screen> below is one button, and "name" must match a file in src/app/:
//   "index"    -> src/app/index.tsx     (the main screen, with the d20 icon)
//   "cards"    -> src/app/cards.tsx     (the card screen, with the card icon)
//   "settings" -> src/app/settings/     (the settings screen, with the gear icon. This folder
//                                        also holds the Features guide, which is opened with
//                                        the Features button on the settings screen)
export default function AppTabs() {
  // Find out whether the phone is in light or dark mode, then pick matching colors.
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  // press() is the firmer buzz we give each time a bottom button is tapped.
  const { press } = useHaptics();

  return (
    <Tabs
      // "tabPress" fires whenever any of the three bottom buttons is tapped.
      screenListeners={{ tabPress: () => press() }}
      screenOptions={{
        // We draw our own header-less screens, so hide the default title bar at the top.
        headerShown: false,
        // Hide the text labels so only the icons show.
        tabBarShowLabel: false,
        // Icon color: bright for the selected tab, dimmer for the others.
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        // Give the bar the same background as the rest of the app.
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.backgroundSelected },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Life',
          // "color" is picked by the tab bar (bright when selected), so we pass it along.
          tabBarIcon: ({ color, size }) => <D20Icon color={color} size={size + 10} />,
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cards',
          tabBarIcon: ({ color, size }) => <CardIcon color={color} size={size + 10} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <GearIcon color={color} size={size + 10} />,
        }}
      />
    </Tabs>
  );
}
