import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Dropdown,
  SegmentedControl,
  SettingRow,
  ToggleSwitch,
} from '@/components/settings-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { MAX_PLAYER_OPTIONS, useSettings, type ThemeChoice } from '@/context/settings-context';

// The choices shown in the Theme setting, in the order they appear on screen.
const THEME_OPTIONS: { label: string; value: ThemeChoice }[] = [
  { label: 'Light', value: 'light' },
  { label: 'System', value: 'system' },
  { label: 'Dark', value: 'dark' },
];

// The settings screen (the gear tab). Each line reads its current value from the
// shared settings and calls updateSetting when you change it.
export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();
  const { tick } = useHaptics();

  return (
    // The full-screen background.
    <ThemedView style={styles.container}>
      {/* SafeAreaView keeps content out of the phone's notch and status bar. */}
      <SafeAreaView style={styles.safeArea}>
        {/* ScrollView lets the page scroll if the settings don't fit on a small screen. */}
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Settings</ThemedText>

          {/* The rounded box that holds all the settings lines. */}
          <ThemedView type="backgroundElement" style={styles.group}>
            {/* Haptic Feedback: an on/off switch. */}
            <SettingRow label="Haptic Feedback">
              <ToggleSwitch
                label="Haptic Feedback"
                value={settings.hapticFeedback}
                onChange={(next) => {
                  updateSetting('hapticFeedback', next);
                  // Turning haptics ON: the switch's own tick was skipped (it was still off
                  // a moment ago), so give one tick now to show that haptics are working.
                  if (next) tick(true);
                }}
              />
            </SettingRow>

            {/* Theme: choose Light, System (follow the phone), or Dark. */}
            <SettingRow label="Theme">
              <SegmentedControl
                options={THEME_OPTIONS}
                value={settings.theme}
                onChange={(next) => updateSetting('theme', next)}
              />
            </SettingRow>

            {/* Max Players: a dropdown with 2 to 6. */}
            <SettingRow label="Max Players">
              <Dropdown
                label="Max Players"
                options={MAX_PLAYER_OPTIONS}
                value={settings.maxPlayers}
                onChange={(next) => updateSetting('maxPlayers', next)}
              />
            </SettingRow>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Fill the whole screen and center the content column on wide screens (like a browser).
  container: {
    flex: 1,
    alignItems: 'center',
  },
  // The column is never wider than MaxContentWidth, so it stays readable on big screens.
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  // Space around the page's content.
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  // The rounded box behind the settings lines.
  group: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
