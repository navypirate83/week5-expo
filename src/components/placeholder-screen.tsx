import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// A simple empty screen with a title and one line of text, centered in the middle.
// The three tab screens use it for now, so each page has something to show.
// When we build a real screen, we swap this out for the real content.
export function PlaceholderScreen({ title, note }: { title: string; note: string }) {
  return (
    // The full-screen background.
    <ThemedView style={styles.container}>
      {/* SafeAreaView keeps our content out of the phone's notch and status bar. */}
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText themeColor="textSecondary">{note}</ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Fill the whole screen.
  container: {
    flex: 1,
  },
  // Stack the title and note in the center, with a gap between them.
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
});
