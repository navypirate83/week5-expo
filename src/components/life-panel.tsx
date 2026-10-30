import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PANEL_COLORS, type ManaColor } from '@/constants/mana-colors';
import { Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { isDefeated } from '@/lib/defeat';

// The + or - sign inside a round button, drawn as thick bars instead of typed as text.
// A typed character is never perfectly centered, because fonts leave extra space above and
// below the letters. Bars are placed by the layout, so they sit exactly in the middle.
//   plus - true draws a + (a horizontal bar crossed by a vertical bar); false draws a -
//   color - the color of the bars (the panel's text color)
function AdjustSign({ plus = false, color }: { plus?: boolean; color: string }) {
  return (
    // A box the size of the sign. The buttons center this box, and the bars are centered inside it.
    <View style={styles.sign}>
      {/* The horizontal bar, used by both + and -. */}
      <View style={[styles.bar, styles.horizontalBar, { backgroundColor: color }]} />
      {/* The vertical bar, only for +. It crosses the horizontal one in the middle. */}
      {plus && <View style={[styles.bar, styles.verticalBar, { backgroundColor: color }]} />}
    </View>
  );
}

// The mark shown in the background of a defeated player's panel: a circle with a slash through
// it (like a "no entry" sign), outlined in white. It is drawn on a 100 x 100 grid and
// stretched to fit the panel, staying round. A thin dark edge is drawn under the white so the
// mark still shows up on a light panel. "pointerEvents none" lets taps pass straight through.
function DefeatMark() {
  // The slash runs from the top left to the bottom right, ending exactly on the circle.
  const CENTER = 50;
  const RADIUS = 38;
  const EDGE = RADIUS * Math.SQRT1_2; // how far the slash's ends are from the center, across and down
  const shapes = [
    { color: 'rgba(0, 0, 0, 0.35)', width: 10 }, // the dark edge, a little thicker
    { color: '#FFFFFF', width: 6 }, // the white outline on top
  ];
  return (
    <View style={styles.defeatMark} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        {shapes.map(({ color, width }) => (
          <Circle key={`circle-${color}`} cx={CENTER} cy={CENTER} r={RADIUS} stroke={color} strokeWidth={width} fill="none" />
        ))}
        {shapes.map(({ color, width }) => (
          <Line
            key={`slash-${color}`}
            x1={CENTER - EDGE}
            y1={CENTER - EDGE}
            x2={CENTER + EDGE}
            y2={CENTER + EDGE}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </View>
  );
}

// The three sizes a panel can be drawn at. See the "size" note on LifePanel below.
export type PanelSize = 'normal' | 'compact' | 'small';

// The text size of the small number in the lower right corner.
const COUNTER_FONT_SIZE = 28;
// The {H} symbol is drawn 4 sizes smaller than the number beside it. Because it is worked out
// from the number's size, they always stay 4 apart if either is changed.
const COUNTER_SYMBOL_SIZE = COUNTER_FONT_SIZE - 4;

// How long the change badge stays on screen after the last tap, in milliseconds (5 seconds).
const BADGE_SHOW_MS = 5000;

// How far a finger must slide, in pixels, to change the big number by 1 while dragging.
const DRAG_STEP_PX = 24;

// How far a finger must slide sideways, in pixels, to count as a swipe (to open or close
// commander damage).
const SWIPE_MIN_PX = 40;

// When another player has opened commander damage, THIS panel shows how much damage this
// player's commander has dealt to them. This is everything the panel needs to know for that:
//   viewer   - the number of the player who opened commander damage (the one taking the damage)
//   facing   - how far that player's panel is turned on the screen (0, 90, 180 or 270 degrees).
//              The number is turned to face them, and dragging "down" means down for them.
//   damage   - how much damage this player has dealt to the viewer
//   onAdjust - called with +1 or -1 to change that damage
export type CommanderView = {
  viewer: number;
  facing: number;
  damage: number;
  onAdjust: (change: number) => void;
};

// Turns the running total into the text shown in the badge: 3 becomes "+3", -3 becomes "−3",
// and 0 stays "0" (for example after tapping + once and then - once).
function formatChange(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return `−${Math.abs(change)}`;
  return '0';
}

// One player's panel. It shows ONE big number with + and - buttons on the left of it, and a
// small number in the lower right corner. The two numbers are life and poison counters:
//   - Normally the big number is the life total, and the corner shows the {H} symbol with
//     the poison counters.
//   - Tap the corner and they SWAP: the big number becomes the poison counters (the + and -
//     buttons now change those), and the corner shows the life total.
//   - Tap the corner again and they swap back.
// When the player is defeated (see src/lib/defeat.ts) a white circle with a slash through it
// appears in the background of the panel.
//
//   life           - the player's life total
//   poison         - the player's poison counters
//   maxPoison      - the Max Poison Counters setting: reaching it counts as defeat
//   onAdjustLife   - called with +1 or -1 when a button is tapped while life is the big number
//   onAdjustPoison - called with +1 or -1 when a button is tapped while poison is the big number
//   upsideDown     - turns the whole panel 180 degrees, for the player sitting across the table
//   rotation       - how far the panel is turned on the screen (0, 90, 180 or 270 degrees). The
//                    panel doesn't turn itself this way (the layout does that), it only needs to
//                    know so that sliding a finger "down" means down for the player reading it
//   color          - the color chosen for this player in Settings: one of the five colors of
//                    Magic, or 'C' for none (the normal look). It colors the whole panel.
//   mostCommanderDamage - the most commander damage this player has taken from any ONE
//                    player. At 21 or more they are defeated.
//   commanderView  - set while ANOTHER player has commander damage open: this panel then shows
//                    the damage it has dealt to that player (see CommanderView above)
//   onSwipe        - called when a finger swipes sideways on the panel, with the direction as
//                    seen by the person reading this panel
//   showCommanderHint - true while this player has commander damage open: shows a reminder of
//                    how to close it
//   size           - how big the buttons and numbers are, for panels with less room:
//                    'normal' (the full size), 'compact' (the side-by-side panels of the 3 and
//                    4 player layouts) or 'small' (the shortest panels, in the 5 and 6 player layouts)
//   playerNumber   - used only to name the buttons for screen readers
export function LifePanel({
  life,
  poison,
  maxPoison,
  onAdjustLife,
  onAdjustPoison,
  upsideDown = false,
  rotation = 0,
  color = 'C',
  mostCommanderDamage = 0,
  commanderView,
  onSwipe,
  showCommanderHint = false,
  size = 'normal',
  playerNumber,
}: {
  life: number;
  poison: number;
  maxPoison: number;
  onAdjustLife: (change: number) => void;
  onAdjustPoison: (change: number) => void;
  upsideDown?: boolean;
  rotation?: 0 | 90 | 180 | 270;
  color?: ManaColor;
  mostCommanderDamage?: number;
  commanderView?: CommanderView;
  onSwipe?: (direction: 'left' | 'right') => void;
  showCommanderHint?: boolean;
  size?: PanelSize;
  playerNumber: number;
}) {
  const theme = useTheme();
  const { tick } = useHaptics();
  // The colors this panel is drawn in. With a chosen color, its own background, text and button
  // colors are used. With 'none', the app's normal colors for the current theme are used.
  const palette = color === 'C' ? null : PANEL_COLORS[color];
  const textColor = palette ? palette.text : theme.text;
  const buttonColor = palette ? palette.button : theme.backgroundSelected;

  // True when this player has lost: life at 0 or below, poison at the maximum or more, or 21
  // commander damage from one player.
  const defeated = isDefeated(life, poison, maxPoison, mostCommanderDamage);

  // Which number is the big one right now: false = life (normal), true = poison counters.
  const [showingPoison, setShowingPoison] = useState(false);
  // The number in the big spot, and its name for the buttons' screen reader labels. While
  // another player has commander damage open, the big number is the damage this player dealt them.
  const bigNumber = commanderView ? commanderView.damage : showingPoison ? poison : life;
  const counterName = commanderView
    ? `commander damage to Player ${commanderView.viewer}`
    : showingPoison
      ? 'poison counters'
      : 'life';

  // How this panel is turned on the screen, in degrees.
  const ownDegrees = upsideDown ? 180 : rotation;
  // How far the big number must be turned so it faces the player who opened commander damage
  // (0 when this panel already faces them, or when commander damage isn't open).
  const numberDegrees = commanderView ? (commanderView.facing - ownDegrees + 360) % 360 : 0;

  // The running total of the recent + and - taps, shown in a small badge beside the life total.
  // null means "no recent taps", so no badge is showing.
  const [recentChange, setRecentChange] = useState<number | null>(null);
  // The 5-second countdown that hides the badge. We keep it in a "ref" (a box that holds a
  // value without redrawing the screen when it changes) so we can cancel and restart it.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When commander damage opens or closes, the change badge (like "+3") belongs to the other
  // number, so it is cleared. (React allows changing state while drawing, like this, when
  // it's done to react to a change.)
  const inCommander = commanderView !== undefined;
  const [wasInCommander, setWasInCommander] = useState(inCommander);
  if (inCommander !== wasInCommander) {
    setWasInCommander(inCommander);
    setRecentChange(null);
  }

  // If this panel goes away while the countdown is running, cancel it.
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Swaps the big number between life and poison counters (the corner was tapped).
  function swapNumbers() {
    tick();
    setShowingPoison((current) => !current);
    // The change badge belongs to whichever number was big, so clear it when they swap.
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setRecentChange(null);
  }

  // Called for every tap of + (change = 1) or - (change = -1), and for every step of a drag.
  function handleTap(change: number) {
    // While another player has commander damage open, + and - change the damage this player
    // has dealt to them (it can't go below 0). The life change is handled for us.
    if (commanderView) {
      if (commanderView.damage + change < 0) return;
      tick();
      commanderView.onAdjust(change);
    } else {
      // Poison counters can't go below 0, so a - tap at 0 does nothing at all.
      if (showingPoison && poison + change < 0) return;
      // 0. A light tick you can feel, on every tap. (It stays silent if Haptic Feedback is off in Settings.)
      tick();
      // 1. Change the number that is currently big: poison counters or life.
      if (showingPoison) onAdjustPoison(change);
      else onAdjustLife(change);
    }
    // 2. Add this tap to the running total: -1, -1, +1 becomes -1. The badge updates right away.
    setRecentChange((current) => (current ?? 0) + change);
    // 3. Restart the countdown. The badge disappears after 5 seconds with no taps, and the
    //    running total starts again from zero on the next tap.
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRecentChange(null), BADGE_SHOW_MS);
  }

  // ---- DRAGGING A FINGER ON THE PANEL ----
  // Which way the finger moves MOST decides what the drag does:
  //   - mostly up or down: change the big number. It goes down by 1 for every DRAG_STEP_PX
  //     pixels of sliding down, and up for sliding up. Sliding back the other way undoes the steps.
  //   - mostly sideways: a swipe. Swiping left opens commander damage, and swiping right closes it
  //     (the screen decides which, see life-screen.tsx).

  // The "latest" handleTap and onSwipe. The finger-tracking code below is only rebuilt when the
  // panel's turn changes, so it would keep using old copies (with an old life total). Updating
  // these boxes on every redraw lets it always call the newest copies.
  const latestTap = useRef(handleTap);
  const latestSwipe = useRef(onSwipe);
  useEffect(() => {
    latestTap.current = handleTap;
    latestSwipe.current = onSwipe;
  });
  // How many steps this drag has already turned into changes (down is negative).
  const stepsApplied = useRef(0);
  // Which way the current drag is going: not decided yet, up/down, or sideways.
  const dragKind = useRef<'undecided' | 'vertical' | 'sideways'>('undecided');
  // How far the finger has gone sideways (negative = left), as the reader of the panel sees it.
  const sidewaysPx = useRef(0);
  // How the panel is turned, so "down" and "left" mean down and left for the person reading it.
  // While another player has commander damage open, that player is the one changing this
  // number, so it is THEIR down that counts.
  const turn = ((commanderView ? commanderView.facing : ownDegrees) * Math.PI) / 180;

  // (useMemo builds it once, and again only if the panel's turn changes.)
  const dragResponder = useMemo(
    // The finger-tracking functions below only touch the refs while a finger is moving (never
    // while the screen is being drawn), which is safe. The linter can't tell, so we silence it.
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        // Only take over once the finger has really moved, so a plain tap is left alone.
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6,
        // A new drag starts counting from zero.
        onPanResponderGrant: () => {
          stepsApplied.current = 0;
          dragKind.current = 'undecided';
          sidewaysPx.current = 0;
        },
        onPanResponderMove: (_event, gesture) => {
          // The finger's movement is measured on the screen. Convert it to the panel's own
          // directions (they differ when the panel is turned).
          const down = -gesture.dx * Math.sin(turn) + gesture.dy * Math.cos(turn);
          const across = gesture.dx * Math.cos(turn) + gesture.dy * Math.sin(turn);
          sidewaysPx.current = across;
          // After a little movement, decide once whether this drag is up/down or sideways.
          if (dragKind.current === 'undecided') {
            if (Math.abs(down) + Math.abs(across) < 12) return;
            dragKind.current = Math.abs(across) > Math.abs(down) ? 'sideways' : 'vertical';
          }
          if (dragKind.current !== 'vertical') return;
          // Whole steps so far; sliding down gives a negative number (the number goes down).
          const steps = -Math.trunc(down / DRAG_STEP_PX);
          // Apply only the steps we haven't applied yet, one at a time, so every step ticks.
          while (stepsApplied.current !== steps) {
            const change = steps > stepsApplied.current ? 1 : -1;
            stepsApplied.current += change;
            latestTap.current(change);
          }
        },
        // When the finger lifts after a long enough sideways swipe, report which way it went.
        onPanResponderRelease: () => {          if (dragKind.current !== 'sideways' || Math.abs(sidewaysPx.current) < SWIPE_MIN_PX) return;
          latestSwipe.current?.(sidewaysPx.current < 0 ? 'left' : 'right');
        },
      }),
    [turn],
  );

  return (
    // The panel's rounded box. Turning it 180 degrees flips EVERYTHING inside it, so the
    // buttons stay on that player's left and the numbers read the right way up for them.
    <ThemedView
      type="backgroundElement"
      accessibilityLabel={defeated ? `Player ${playerNumber} is defeated` : undefined}
      // The "panHandlers" make the WHOLE panel follow a finger dragging up or down, not just the
      // number. (Taps on the buttons and the corner still work as before.)
      {...dragResponder.panHandlers}
      style={[
        styles.panel,
        size === 'compact' && styles.compactPanel,
        size === 'small' && styles.compactPanel,
        // The chosen color replaces the normal background.
        palette && { backgroundColor: palette.background },
        upsideDown && { transform: [{ rotate: '180deg' }] },
      ]}>
      {/* The mark showing this player has lost. It comes first so everything else is drawn on top of it. */}
      {defeated && <DefeatMark />}

      {/* LEFT SIDE: the + button above the - button. */}
      <View style={[styles.buttons, size !== 'normal' && styles.compactButtons]}>
        <Pressable
          onPress={() => handleTap(1)}
          accessibilityRole="button"
          accessibilityLabel={`Player ${playerNumber}: add 1 ${commanderView ? 'commander damage' : showingPoison ? 'poison counter' : 'life'}`}
          style={({ pressed }) => [
            styles.adjustButton,
            size === 'compact' && styles.compactAdjustButton,
            size === 'small' && styles.smallAdjustButton,
            { backgroundColor: buttonColor },
            pressed && styles.pressed,
          ]}>
          <AdjustSign plus color={textColor} />
        </Pressable>
        <Pressable
          onPress={() => handleTap(-1)}
          accessibilityRole="button"
          accessibilityLabel={`Player ${playerNumber}: ${commanderView ? 'remove 1 commander damage' : showingPoison ? 'remove 1 poison counter' : 'lose 1 life'}`}
          style={({ pressed }) => [
            styles.adjustButton,
            size === 'compact' && styles.compactAdjustButton,
            size === 'small' && styles.smallAdjustButton,
            { backgroundColor: buttonColor },
            pressed && styles.pressed,
          ]}>
          <AdjustSign color={textColor} />
        </Pressable>
      </View>

      {/* MIDDLE: the big number (life or poison counters), as large as will fit. While another
          player has commander damage open, it is the damage this player dealt them, and the
          number (with a small caption saying what it is) is turned to face that player. */}
      <View style={styles.lifeArea}>
        <View style={[styles.numberBox, { transform: [{ rotate: `${numberDegrees}deg` }] }]}>
          {commanderView && (
            <ThemedText type="smallBold" selectable={false} style={[styles.caption, { color: textColor }]}>
              Commander damage to Player {commanderView.viewer}
            </ThemedText>
          )}
          <ThemedText
            accessibilityLabel={`Player ${playerNumber} ${counterName}: ${bigNumber}`}
            style={[
              styles.life,
              { color: textColor },
              size === 'compact' && styles.compactLife,
              size === 'small' && styles.smallLife,
            ]}
            adjustsFontSizeToFit
            // Stops a mouse drag on the web from highlighting the number as if it were text.
            selectable={false}
            numberOfLines={1}>
            {bigNumber}
          </ThemedText>
        </View>

        {/* THE CHANGE BADGE: just to the left of the life total and centered up and down.
            It only exists while there is a recent change to show. "pointerEvents none" means
            taps pass straight through it. "accessibilityLiveRegion" makes screen readers
            announce the new total as it changes. */}
        {recentChange !== null && (
          <View style={styles.badgeSlot} pointerEvents="none">
            <ThemedView
              type="backgroundSelected"
              style={styles.badge}
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Change ${formatChange(recentChange)}`}>
              <ThemedText style={styles.badgeText}>{formatChange(recentChange)}</ThemedText>
            </ThemedView>
          </View>
        )}
      </View>

      {/* A reminder, shown only while THIS player has commander damage open. */}
      {showCommanderHint && (
        <ThemedText type="small" selectable={false} style={[styles.hint, { color: textColor }]}>
          Swipe right to exit
        </ThemedText>
      )}

      {/* LOWER RIGHT: the small number. Tapping it swaps it with the big number.
            Normally it shows the {H} symbol (from Scryfall) and the poison counters. While
            the poison counters are big, it shows the life total instead. It is hidden while
            another player has commander damage open, because then the big number isn't
            life or poison at all. */}
      {!commanderView && (
      <Pressable
        onPress={swapNumbers}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={
          showingPoison
            ? `Player ${playerNumber}: show life total, currently ${life}`
            : `Player ${playerNumber}: show poison counters, currently ${poison}`
        }
        style={({ pressed }) => [styles.counter, pressed && styles.pressed]}>
        {showingPoison ? (
          <ThemedText style={[styles.counterNumber, { color: textColor }]}>{life}</ThemedText>
        ) : (
          <>
            <RichText size={COUNTER_SYMBOL_SIZE}>{'{H}'}</RichText>
            <ThemedText style={[styles.counterNumber, { color: textColor }]}>{poison}</ThemedText>
          </>
        )}
      </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // The rounded box. "flex: 1" makes it share the space equally with the other panel.
  // Buttons on the left, life total taking the rest of the width.
  panel: {
    // On the web, dragging a mouse would start highlighting text and cancel our drag, so
    // the panel can't be highlighted. (Phones don't do this.)
    userSelect: 'none',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  // The smaller panel: less padding and space, to fit the shorter side-by-side panels.
  compactPanel: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  // The column holding the + and - buttons, in the small panel.
  compactButtons: {
    gap: Spacing.two,
  },
  // A smaller round + or - button (56 across instead of 64).
  compactAdjustButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  // The life total (or poison count) in the compact panel: 96 instead of 120.
  compactLife: {
    fontSize: 96,
    lineHeight: 104,
  },
  // The 'small' size (used for the shortest panels) shares the compact padding and spacing,
  // but its + and - buttons are smaller still: 48 across.
  smallAdjustButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  // The life total (or poison count) in the small panel: 72.
  smallLife: {
    fontSize: 72,
    lineHeight: 80,
  },
  // The column holding the + and - buttons.
  buttons: {
    gap: Spacing.three,
  },
  // A round + or - button.
  adjustButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The box that holds a + or - sign. Its bars are centered inside it.
  sign: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Both bars are 6 thick (bold) with rounded ends, and drawn on top of each other.
  bar: {
    position: 'absolute',
    borderRadius: 3,
  },
  // The horizontal bar spans the full width of the sign box.
  horizontalBar: {
    width: 30,
    height: 6,
  },
  // The vertical bar spans the full height of the sign box.
  verticalBar: {
    width: 6,
    height: 30,
  },
  // Slight dimming while a finger is on a button.
  pressed: {
    opacity: 0.6,
  },
  // The space the life total is centered in.
  lifeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A full-size, see-through layer over the life area whose only job is to line the badge up:
  // pushed to the left edge (next to the + and - buttons), and centered from top to bottom.
  badgeSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  // The badge itself: a small rounded pill.
  badge: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    minWidth: 44,
    alignItems: 'center',
  },
  // The number inside the badge: small compared to the life total, but bold so it's easy to read.
  badgeText: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  // The circle-with-a-slash mark: fills the panel, with some space around it, and sits behind
  // everything. Slightly see-through so the numbers on top stay readable.
  defeatMark: {
    position: 'absolute',
    top: Spacing.three,
    bottom: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    opacity: 0.7,
  },
  // The big number and (in commander damage) its caption, stacked and centered. It is turned
  // as a unit to face the player who opened commander damage.
  numberBox: {
    alignItems: 'center',
  },
  // The small caption above a commander damage number.
  caption: {
    textAlign: 'center',
  },
  // The "Swipe right to exit" reminder, along the bottom edge of the panel.
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.two,
    textAlign: 'center',
  },
  // The life total itself: very large.
  life: {
    fontSize: 120,
    lineHeight: 132,
    fontWeight: '700',
    textAlign: 'center',
  },
  // The {H} symbol and its number, pinned to the lower right corner of the panel.
  counter: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  // The number beside the symbol.
  counterNumber: {
    fontSize: COUNTER_FONT_SIZE,
    lineHeight: 34,
    fontWeight: '600',
  },
});
