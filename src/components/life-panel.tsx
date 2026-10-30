import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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

// How long the change badge stays on screen after the last tap, in milliseconds (5 seconds).
const BADGE_SHOW_MS = 5000;

// Turns the running total into the text shown in the badge: 3 becomes "+3", -3 becomes "−3",
// and 0 stays "0" (for example after tapping + once and then - once).
function formatChange(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return `−${Math.abs(change)}`;
  return '0';
}

// One player's panel: their life total, with + and - buttons on the left of it.
// In the lower right corner it also shows the {H} symbol with a number next to it
// (the number is always 0 for now; a way to change it comes later).
//
//   life         - the life total to show
//   onAdjust     - called with +1 or -1 when a button is tapped
//   upsideDown   - turns the whole panel 180 degrees, for the player sitting across the table
//   playerNumber - used only to name the buttons for screen readers
export function LifePanel({
  life,
  onAdjust,
  upsideDown = false,
  playerNumber,
}: {
  life: number;
  onAdjust: (change: number) => void;
  upsideDown?: boolean;
  playerNumber: number;
}) {
  const theme = useTheme();

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

  // Called for every tap of + (change = 1) or - (change = -1).
  function handleTap(change: number) {
    // 1. Change the real life total.
    onAdjust(change);
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
      style={[styles.panel, upsideDown && { transform: [{ rotate: '180deg' }] }]}>
      {/* LEFT SIDE: the + button above the - button. */}
      <View style={styles.buttons}>
        <Pressable
          onPress={() => handleTap(1)}
          accessibilityRole="button"
          accessibilityLabel={`Player ${playerNumber}: add 1 life`}
          style={({ pressed }) => [
            styles.adjustButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <AdjustSign plus />
        </Pressable>
        <Pressable
          onPress={() => handleTap(-1)}
          accessibilityRole="button"
          accessibilityLabel={`Player ${playerNumber}: lose 1 life`}
          style={({ pressed }) => [
            styles.adjustButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <AdjustSign />
        </Pressable>
      </View>

      {/* MIDDLE: the life total, as large as will fit. */}
      <View style={styles.lifeArea}>
        <ThemedText
          accessibilityLabel={`Player ${playerNumber} life: ${life}`}
          style={styles.life}
          adjustsFontSizeToFit
          numberOfLines={1}>
          {life}
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

      {/* LOWER RIGHT: the {H} symbol (from Scryfall) and the number next to it. */}
      <View style={styles.counter}>
        <RichText size={32}>{'{H}'}</RichText>
        <ThemedText style={styles.counterNumber}>0</ThemedText>
      </View>
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
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
  },
});
