import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DefeatColor, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { isDefeated } from '@/lib/defeat';

// The + or - sign inside a round button, drawn as thick bars instead of typed as text.
// A typed character is never perfectly centered, because fonts leave extra space above and
// below the letters. Bars are placed by the layout, so they sit exactly in the middle.
//   plus - true draws a + (a horizontal bar crossed by a vertical bar); false draws a -
function AdjustSign({ plus = false }: { plus?: boolean }) {
  const theme = useTheme();
  return (
    // A box the size of the sign. The buttons center this box, and the bars are centered inside it.
    <View style={styles.sign}>
      {/* The horizontal bar, used by both + and -. */}
      <View style={[styles.bar, styles.horizontalBar, { backgroundColor: theme.text }]} />
      {/* The vertical bar, only for +. It crosses the horizontal one in the middle. */}
      {plus && <View style={[styles.bar, styles.verticalBar, { backgroundColor: theme.text }]} />}
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
// When the player is defeated (see src/lib/defeat.ts) the whole panel turns medium red.
//
//   life           - the player's life total
//   poison         - the player's poison counters
//   maxPoison      - the Max Poison Counters setting: reaching it counts as defeat
//   onAdjustLife   - called with +1 or -1 when a button is tapped while life is the big number
//   onAdjustPoison - called with +1 or -1 when a button is tapped while poison is the big number
//   upsideDown     - turns the whole panel 180 degrees, for the player sitting across the table
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
  size = 'normal',
  playerNumber,
}: {
  life: number;
  poison: number;
  maxPoison: number;
  onAdjustLife: (change: number) => void;
  onAdjustPoison: (change: number) => void;
  upsideDown?: boolean;
  size?: PanelSize;
  playerNumber: number;
}) {
  const theme = useTheme();
  const { tick } = useHaptics();
  // True when this player has lost: life at 0 or below, or poison at the maximum or more.
  const defeated = isDefeated(life, poison, maxPoison);

  // Which number is the big one right now: false = life (normal), true = poison counters.
  const [showingPoison, setShowingPoison] = useState(false);
  // The number in the big spot, and its name for the buttons' screen reader labels.
  const bigNumber = showingPoison ? poison : life;
  const counterName = showingPoison ? 'poison counters' : 'life';

  // The running total of the recent + and - taps, shown in a small badge beside the life total.
  // null means "no recent taps", so no badge is showing.
  const [recentChange, setRecentChange] = useState<number | null>(null);
  // The 5-second countdown that hides the badge. We keep it in a "ref" (a box that holds a
  // value without redrawing the screen when it changes) so we can cancel and restart it.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Called for every tap of + (change = 1) or - (change = -1).
  function handleTap(change: number) {
    // Poison counters can't go below 0, so a - tap at 0 does nothing at all.
    if (showingPoison && poison + change < 0) return;
    // 0. A light tick you can feel, on every tap. (It stays silent if Haptic Feedback is off in Settings.)
    tick();
    // 1. Change the number that is currently big: poison counters or life.
    if (showingPoison) onAdjustPoison(change);
    else onAdjustLife(change);
    // 2. Add this tap to the running total: -1, -1, +1 becomes -1. The badge updates right away.
    setRecentChange((current) => (current ?? 0) + change);
    // 3. Restart the countdown. The badge disappears after 5 seconds with no taps, and the
    //    running total starts again from zero on the next tap.
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRecentChange(null), BADGE_SHOW_MS);
  }

  return (
    // The panel's rounded box. Turning it 180 degrees flips EVERYTHING inside it, so the
    // buttons stay on that player's left and the numbers read the right way up for them.
    <ThemedView
      type="backgroundElement"
      accessibilityLabel={defeated ? `Player ${playerNumber} is defeated` : undefined}
      style={[
        styles.panel,
        size === 'compact' && styles.compactPanel,
        size === 'small' && styles.compactPanel,
        // A defeated player's panel turns medium red, replacing the normal background.
        defeated && { backgroundColor: DefeatColor },
        upsideDown && { transform: [{ rotate: '180deg' }] },
      ]}>
      {/* LEFT SIDE: the + button above the - button. */}
      <View style={[styles.buttons, size !== 'normal' && styles.compactButtons]}>
        <Pressable
          onPress={() => handleTap(1)}
          accessibilityRole="button"
          accessibilityLabel={`Player ${playerNumber}: add 1 ${showingPoison ? 'poison counter' : 'life'}`}
          style={({ pressed }) => [
            styles.adjustButton,
            size === 'compact' && styles.compactAdjustButton,
            size === 'small' && styles.smallAdjustButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <AdjustSign plus />
        </Pressable>
        <Pressable
          onPress={() => handleTap(-1)}
          accessibilityRole="button"
          accessibilityLabel={`Player ${playerNumber}: ${showingPoison ? 'remove 1 poison counter' : 'lose 1 life'}`}
          style={({ pressed }) => [
            styles.adjustButton,
            size === 'compact' && styles.compactAdjustButton,
            size === 'small' && styles.smallAdjustButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <AdjustSign />
        </Pressable>
      </View>

      {/* MIDDLE: the big number (life or poison counters), as large as will fit. */}
      <View style={styles.lifeArea}>
        <ThemedText
          accessibilityLabel={`Player ${playerNumber} ${counterName}: ${bigNumber}`}
          style={[
            styles.life,
            size === 'compact' && styles.compactLife,
            size === 'small' && styles.smallLife,
          ]}
          adjustsFontSizeToFit
          numberOfLines={1}>
          {bigNumber}
        </ThemedText>

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

      {/* LOWER RIGHT: the small number. Tapping it swaps it with the big number.
            Normally it shows the {H} symbol (from Scryfall) and the poison counters. While
            the poison counters are big, it shows the life total instead. */}
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
          <ThemedText style={styles.counterNumber}>{life}</ThemedText>
        ) : (
          <>
            <RichText size={COUNTER_SYMBOL_SIZE}>{'{H}'}</RichText>
            <ThemedText style={styles.counterNumber}>{poison}</ThemedText>
          </>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // The rounded box. "flex: 1" makes it share the space equally with the other panel.
  // Buttons on the left, life total taking the rest of the width.
  panel: {
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
