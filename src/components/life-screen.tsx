import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifePanel } from '@/components/life-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The screen that shows everyone's life totals once the number of players is chosen.
// Each player count gets its own layout. So far only the 2-player layout exists:
//   - Player 1 is the bottom half of the screen (right way up, facing the phone's holder)
//   - Player 2 is the top half, turned upside down for the person sitting across the table
//
//   players      - how many players are in the game
//   startingLife - the life every player starts with (from the Starting Life Total setting)
//   onExit       - called when "Players" is tapped, to go back to choosing the player count
//                  ("New game" doesn't leave the screen: it just resets everyone's life)
export function LifeScreen({
  players,
  startingLife,
  onExit,
}: {
  players: number;
  startingLife: number;
  onExit: () => void;
}) {
  const theme = useTheme();

  // Everyone's life total, in a list: lives[0] is Player 1, lives[1] is Player 2...
  // They all start at the Starting Life Total setting.
  const [lives, setLives] = useState<number[]>(() => Array.from({ length: players }, () => startingLife));

  // Which game this is (1, 2, 3...). It goes up each time "New game" is tapped.
  const [gameNumber, setGameNumber] = useState(1);

  // Changes one player's life by +1 or -1. We copy the list and change only that player's number.
  function adjustLife(playerIndex: number, change: number) {
    setLives((current) => current.map((life, index) => (index === playerIndex ? life + change : life)));
  }

  // Starts over: every player's life goes back to the Starting Life Total, and we stay on this screen.
  // If you changed Starting Life Total in Settings during the game, the new value is used here.
  function newGame() {
    setLives(Array.from({ length: players }, () => startingLife));
    // Counting up changes the panels' "key" below, which makes fresh panels. That also wipes
    // any change badge (like "+3") that was still showing from the old game.
    setGameNumber((current) => current + 1);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {players === 2 ? (
          // THE 2-PLAYER LAYOUT: two panels stacked, with a gap between them.
          <View style={styles.panels}>
            {/* The top half: Player 2, turned upside down. */}
            <LifePanel
              key={`player-2-game-${gameNumber}`}
              playerNumber={2}
              life={lives[1]}
              onAdjust={(change) => adjustLife(1, change)}
              upsideDown
            />
            {/* The bottom half: Player 1. */}
            <LifePanel
              key={`player-1-game-${gameNumber}`}
              playerNumber={1}
              life={lives[0]}
              onAdjust={(change) => adjustLife(0, change)}
            />
          </View>
        ) : (
          // The other player counts don't have a layout yet.
          <View style={styles.comingSoon}>
            <ThemedText type="subtitle">{players} players</ThemedText>
            <ThemedText themeColor="textSecondary">This layout hasn&apos;t been built yet.</ThemedText>
          </View>
        )}

        {/* Two small buttons side by side in the middle of the screen, where the panels meet:
              "New game" resets everyone's life, and "Players" goes back to choosing how many
              players. ("Players" was added so you aren't stuck on this screen. Tell me if you
              want it elsewhere.) */}
        <View style={styles.controls} pointerEvents="box-none">
          <Pressable
            onPress={newGame}
            accessibilityRole="button"
            accessibilityLabel="New game"
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">New game</ThemedText>
          </Pressable>
          <Pressable
            onPress={onExit}
            accessibilityRole="button"
            accessibilityLabel="Change number of players"
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">Players</ThemedText>
          </Pressable>
        </View>
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
  // The column is never wider than MaxContentWidth.
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
  },
  // The two panels, one above the other with a gap between them. Each takes half the height.
  panels: {
    flex: 1,
    gap: Spacing.three,
  },
  // The message shown for player counts that have no layout yet.
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  // The row holding the two pills, floating exactly where the two panels meet (the middle of
  // the screen). "left: 0, right: 0" plus centering puts the pair in the middle horizontally.
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  // One small rounded button.
  pill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  // Slight dimming while pressed.
  pressed: {
    opacity: 0.6,
  },
});
