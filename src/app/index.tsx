import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifeScreen } from '@/components/life-screen';
import { PlayerButtons } from '@/components/player-buttons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';

// The main screen (the d20 tab). It has two states:
//   1. No game yet: "How many players?" with one large round button per choice
//      (arranged according to the Max Players setting).
//   2. A game is running: the life totals, laid out for the chosen number of players.
export default function HomeScreen() {
  // Read the settings. Max Players decides which buttons appear, and Starting Life Total
  // is the life everyone begins with.
  const { settings } = useSettings();

  // How many players were chosen. null means no game has been started yet.
  const [players, setPlayers] = useState<number | null>(null);

  // A game is running: show the life totals. "New game" sets players back to null.
  if (players !== null) {
    return (
      <LifeScreen
        // Changing the key makes a brand new screen (fresh life totals) for every new game.
        key={players}
        players={players}
        startingLife={settings.startingLife}
        onExit={() => setPlayers(null)}
      />
    );
  }

  return (
    // The full-screen background.
    <ThemedView style={styles.container}>
      {/* SafeAreaView keeps the buttons out of the phone's notch and status bar. */}
      <SafeAreaView style={styles.safeArea}>
        {/* The heading at the top of the screen. */}
        <ThemedText type="subtitle" style={styles.heading}>
          How many players?
        </ThemedText>

        {/* The buttons fill all the space left under the heading. Tapping one starts a game. */}
        <PlayerButtons maxPlayers={settings.maxPlayers} onSelect={setPlayers} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Fill the screen and center the content column on wide screens (like a browser).
  container: {
    flex: 1,
    alignItems: 'center',
  },
  // The column is never wider than MaxContentWidth, so the buttons stay a sensible size.
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  // The heading: centered, with some space above and below it.
  heading: {
    textAlign: 'center',
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
});
