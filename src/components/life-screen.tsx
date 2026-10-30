import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifePanel, type PanelSize } from '@/components/life-panel';
import { RotatedSlot } from '@/components/rotated-slot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useGame } from '@/context/game-context';
import { useTheme } from '@/hooks/use-theme';
import { playerRotations } from '@/lib/player-layout';

// The screen that shows everyone's life totals once the number of players is chosen.
// Each player count gets its own layout:
//   2 players: Player 1 is the bottom half (right way up, facing the phone's holder) and
//              Player 2 is the top half, turned upside down for the person sitting across.
//   3 players: Player 1 is the bottom half, as above. The top half is split in two:
//              Player 2 on the left, turned 90 degrees, and Player 3 on the right, turned
//              the other way (270 degrees), for players sitting at the phone's left and right.
//   4 players: two rows of two sideways panels (left ones turned 90, right ones turned 270).
//   5 players: Player 1 right way up along the bottom, and two rows of two sideways panels above.
//   6 players: three rows of two sideways panels.
// Players are numbered clockwise starting from Player 1 at the bottom.
//
//   players      - how many players are in the game
//   startingLife - the life every player starts with (from the Starting Life Total setting)
//   maxPoison    - how many poison counters defeat a player (from the Max Poison Counters setting)
//   onExit       - called when "Players" is tapped, to go back to choosing the player count
//                  ("New game" doesn't leave the screen: it just resets everyone's life)
export function LifeScreen({
  players,
  startingLife,
  maxPoison,
  onExit,
}: {
  players: number;
  startingLife: number;
  maxPoison: number;
  onExit: () => void;
}) {
  const theme = useTheme();

  // The current game's numbers come from the game context, which saves them on the phone
  // every time they change: lives[0] is Player 1's life, lives[1] is Player 2's...,
  // and poisons holds each player's poison counters in the same order.
  const { game, adjustLife, adjustPoison, adjustCommander, resetGame } = useGame();
  const { lives, poisons, commander } = game;

  // How each player's panel is turned on the screen (0, 90, 180 or 270 degrees).
  const rotations = playerRotations(players);

  // Which player has commander damage open: 0 is Player 1, 1 is Player 2..., or null when
  // nobody does. A player opens it by swiping left on their panel and closes it by swiping right.
  // While it is open, every OTHER panel shows the damage its player has dealt to this player.
  const [commanderViewer, setCommanderViewer] = useState<number | null>(null);

  // Which game this is (1, 2, 3...). It goes up each time "New game" is tapped.
  const [gameNumber, setGameNumber] = useState(1);

  // Starts over: every player's life goes back to the Starting Life Total, poison counters go
  // back to 0, and we stay on this screen.
  // If you changed Starting Life Total in Settings during the game, the new value is used here.
  function newGame() {
    resetGame(startingLife);
    // Close commander damage if someone had it open. (The damage itself is reset to 0 above.)
    setCommanderViewer(null);
    // Counting up changes the panels' "key" below, which makes fresh panels. That also wipes
    // any change badge (like "+3") that was still showing from the old game.
    setGameNumber((current) => current + 1);
  }

  // Builds the panel for one player. "index" is 0 for Player 1, 1 for Player 2, and so on.
  // Every layout below uses this, so a panel works the same way wherever it is placed.
  // "options" says how this panel is turned or sized in the layout.
  function renderPanel(
    index: number,
    options: { upsideDown?: boolean; rotation?: 90 | 270; size?: PanelSize } = {},
  ) {
    return (
      <LifePanel
        // The key includes the game number, so "New game" makes brand new panels.
        key={`player-${index + 1}-game-${gameNumber}`}
        playerNumber={index + 1}
        life={lives[index]}
        poison={poisons[index]}
        maxPoison={maxPoison}
        onAdjustLife={(change) => adjustLife(index, change)}
        onAdjustPoison={(change) => adjustPoison(index, change)}
        // The most commander damage this player has taken from any ONE other player: 21 defeats them.
        mostCommanderDamage={Math.max(...commander[index])}
        // While another player has commander damage open, this panel shows (and changes) the
        // damage it has dealt to them, turned to face them.
        commanderView={
          commanderViewer !== null && commanderViewer !== index
            ? {
                viewer: commanderViewer + 1,
                facing: rotations[commanderViewer],
                damage: commander[commanderViewer][index],
                onAdjust: (change) => adjustCommander(commanderViewer, index, change),
              }
            : undefined
        }
        // A swipe left opens commander damage for this player; a swipe right closes it. The
        // other players' panels ignore swipes while someone has it open.
        onSwipe={
          commanderViewer === null || commanderViewer === index
            ? (direction) => setCommanderViewer(direction === 'left' ? index : null)
            : undefined
        }
        showCommanderHint={commanderViewer === index}
        upsideDown={options.upsideDown}
        rotation={options.rotation}
        size={options.size}
      />
    );
  }

  // Builds a row of two panels side by side, each turned on its side:
  //   - the LEFT one is turned 90 degrees clockwise (the top of its text points right),
  //     for a player sitting at the phone's left edge
  //   - the RIGHT one is turned 270 degrees (the top of its text points left),
  //     for a player sitting at the phone's right edge
  // "leftIndex" and "rightIndex" say which players they are (0 is Player 1).
  function sidewaysRow(leftIndex: number, rightIndex: number, size: PanelSize) {
    return (
      <View style={styles.sideBySide}>
        <RotatedSlot degrees={90}>{renderPanel(leftIndex, { size, rotation: 90 })}</RotatedSlot>
        <RotatedSlot degrees={270}>{renderPanel(rightIndex, { size, rotation: 270 })}</RotatedSlot>
      </View>
    );
  }

  // Where the "New game" / "Players" buttons sit, measured down from the top of the screen.
  // With 2, 3 or 4 players the panels meet in the middle, so that's where they go. With 5 or 6
  // there are three rows, so the middle is the middle of a row. The buttons would cover a
  // panel, so they go on the line between the second and third rows instead.
  const controlsTop = players >= 5 ? '66%' : '50%';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {players === 2 ? (
          // THE 2-PLAYER LAYOUT: two panels stacked, with a gap between them.
          <View style={styles.panels}>
            {/* The top half: Player 2, turned upside down. */}
            {renderPanel(1, { upsideDown: true })}
            {/* The bottom half: Player 1. */}
            {renderPanel(0)}
          </View>
        ) : players === 3 ? (
          // THE 3-PLAYER LAYOUT: Player 1 is the bottom half. The top half is split into two
          // panels side by side, each turned on its side, for players sitting at the left
          // and right edges of the phone.
          <View style={styles.panels}>
            {/* Top left: Player 2. Top right: Player 3. */}
            {sidewaysRow(1, 2, 'compact')}
            {/* The bottom half: Player 1, unchanged. */}
            {renderPanel(0)}
          </View>
        ) : players === 4 ? (
          // THE 4-PLAYER LAYOUT: two rows of two sideways panels. The players are numbered
          // clockwise from the bottom left: Player 1, then up the left side to Player 2, across to
          // Player 3 at the top right, and down to Player 4 at the bottom right.
          <View style={styles.panels}>
            {/* Top row: Player 2 (left) and Player 3 (right). */}
            {sidewaysRow(1, 2, 'compact')}
            {/* Bottom row: Player 1 (left) and Player 4 (right). */}
            {sidewaysRow(0, 3, 'compact')}
          </View>
        ) : players === 5 ? (
          // THE 5-PLAYER LAYOUT: two rows of sideways panels on top, and Player 1 right way up
          // across the whole bottom. Numbering goes clockwise from Player 1 at the bottom:
          // up the left side (Players 2, 3), then down the right side (Players 4, 5).
          <View style={styles.panels}>
            {/* Top row: Player 3 (left) and Player 4 (right). */}
            {sidewaysRow(2, 3, 'small')}
            {/* Middle row: Player 2 (left) and Player 5 (right). */}
            {sidewaysRow(1, 4, 'small')}
            {/* The bottom: Player 1, full width and right way up. */}
            {renderPanel(0)}
          </View>
        ) : players === 6 ? (
          // THE 6-PLAYER LAYOUT: three rows of two sideways panels. Numbering goes clockwise from
          // the bottom left: up the left side (Players 1, 2, 3), then down the right side (Players 4, 5, 6).
          <View style={styles.panels}>
            {/* Top row: Player 3 (left) and Player 4 (right). */}
            {sidewaysRow(2, 3, 'small')}
            {/* Middle row: Player 2 (left) and Player 5 (right). */}
            {sidewaysRow(1, 4, 'small')}
            {/* Bottom row: Player 1 (left) and Player 6 (right). */}
            {sidewaysRow(0, 5, 'small')}
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
        <View style={[styles.controls, { top: controlsTop }]} pointerEvents="box-none">
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
  // A row of panels side by side with a gap between them. It takes the same height as the
  // other half of the screen, and each panel slot in it takes half the width.
  sideBySide: {
    flex: 1,
    flexDirection: 'row',
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
