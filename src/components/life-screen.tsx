import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifePanel, type PanelSize } from '@/components/life-panel';
import { RotatedSlot } from '@/components/rotated-slot';
import { DiceIcon } from '@/components/tab-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useGame } from '@/context/game-context';
import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { playerRotations } from '@/lib/player-layout';

// ---- ROLLING FOR WHO GOES FIRST ----
// How long each player's panel stays lit while the roll goes around, in milliseconds (half a second).
const HIGHLIGHT_MS = 500;
// The roll goes around the table at least this many times before it stops.
const MIN_ROUNDS = 2;
// When it stops, the winner's panel blinks this many times, each blink taking BLINK_MS off and
// BLINK_MS on.
const BLINKS = 4;
const BLINK_MS = 200;

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
  // The color each player chose for their life total area, in Settings.
  const { settings } = useSettings();

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

  // ---- THE "WHO GOES FIRST" ROLL ----
  // rolling       - true while the roll is running (the dice button does nothing then)
  // litPlayer     - which player's panel is lit up right now (0 is Player 1), or null for none
  // turnOrder     - once a roll has finished: each player's place in the turn order (the first
  //                 entry is Player 1's place, and so on; 1 goes first). null before any roll.
  const [rolling, setRolling] = useState(false);
  const [litPlayer, setLitPlayer] = useState<number | null>(null);
  const [turnOrder, setTurnOrder] = useState<number[] | null>(null);
  // The timers that run the roll. Each lighting up, blink and the final result is one timer,
  // all set at the moment the dice button is pressed. We keep them so they can be cancelled.
  const rollTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // If this screen goes away in the middle of a roll, cancel the timers.
  useEffect(() => {
    const timers = rollTimers;
    return () => timers.current.forEach(clearTimeout);
  }, []);

  // Cancels a roll that is running and clears the lit panel.
  function stopRoll() {
    rollTimers.current.forEach(clearTimeout);
    rollTimers.current = [];
    setLitPlayer(null);
    setRolling(false);
  }

  // The dice button. It lights up the players one at a time going clockwise (players are
  // numbered clockwise, so that is Player 1, 2, 3...), at least two full times around, then
  // stops on a random player and blinks. That player goes first, and the others follow clockwise.
  function rollForTurnOrder() {
    if (rolling) return;
    setRolling(true);
    setTurnOrder(null);

    // Pick the winner now, then work out how many steps the light needs to take to end on them:
    // at least MIN_ROUNDS times around, plus once more around half of the time so the length
    // is not always the same.
    const winner = Math.floor(Math.random() * players);
    const earliestEnd = MIN_ROUNDS * players - 1;
    const stepsToWinner = (((winner - earliestEnd) % players) + players) % players;
    const lastStep = earliestEnd + stepsToWinner + players * Math.floor(Math.random() * 2);

    // Schedules something to happen "ms" milliseconds from now.
    const later = (ms: number, action: () => void) => {
      rollTimers.current.push(setTimeout(action, ms));
    };

    // The light moves to the next player every HIGHLIGHT_MS.
    for (let step = 0; step <= lastStep; step++) {
      later(step * HIGHLIGHT_MS, () => setLitPlayer(step % players));
    }
    // Then the winner blinks: off, on, off, on...
    const blinkStart = (lastStep + 1) * HIGHLIGHT_MS;
    for (let blink = 0; blink < BLINKS; blink++) {
      later(blinkStart + blink * 2 * BLINK_MS, () => setLitPlayer(null));
      later(blinkStart + blink * 2 * BLINK_MS + BLINK_MS, () => setLitPlayer(winner));
    }
    // Finally the light goes out and the turn order numbers appear: the winner is 1 and the
    // players after them, going clockwise, are 2, 3, 4...
    later(blinkStart + BLINKS * 2 * BLINK_MS + BLINK_MS, () => {
      const order = Array.from({ length: players }, () => 0);
      for (let place = 0; place < players; place++) order[(winner + place) % players] = place + 1;
      setLitPlayer(null);
      setTurnOrder(order);
      setRolling(false);
    });
  }

  // Starts over: every player's life goes back to the Starting Life Total, poison counters go
  // back to 0, and we stay on this screen.
  // If you changed Starting Life Total in Settings during the game, the new value is used here.
  function newGame() {
    resetGame(startingLife);
    // Cancel any roll and take away the turn order numbers: it is a new game.
    stopRoll();
    setTurnOrder(null);
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
        color={settings.playerColors[index]}
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
        // Lit up while the "who goes first" roll is on this player, and numbered afterwards.
        highlighted={litPlayer === index}
        turnOrder={turnOrder?.[index]}
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

        {/* Three small buttons side by side along the bottom of the screen, between the life
              totals and the tab bar: "New game" resets everyone's life, the dice roll for who
              goes first, and "Players" goes back to choosing how many players. They sit in their own row under the panels, so
              they never cover a life total. */}
        <View style={styles.controls}>
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
          {/* The dice: rolls for who goes first (see rollForTurnOrder above). */}
          <Pressable
            onPress={rollForTurnOrder}
            accessibilityRole="button"
            accessibilityLabel="Roll for who goes first"
            accessibilityState={{ disabled: rolling }}
            style={({ pressed }) => [
              styles.pill,
              styles.diceButton,
              { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <DiceIcon color={theme.text} size={28} />
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
  // The row holding the two pills, under the panels and centered. It takes only the height it
  // needs, and the panels above it share all the remaining space.
  controls: {
    paddingTop: Spacing.three,
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
  // The dice button: a pill with the dice drawing in it, a bit less padded since the picture
  // is taller than the words.
  diceButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
  },
  // Slight dimming while pressed.
  pressed: {
    opacity: 0.6,
  },
});
