import { Pressable, StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { MANA_COLOR_NAMES, MANA_COLORS, type ManaColor } from '@/constants/mana-colors';
import { Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';

// The size of each color button, and of the symbol picture inside it.
const BUTTON_SIZE = 44;
const SYMBOL_SIZE = 32;

// One line on the settings screen for choosing a player's life total color: the player's name,
// then six round buttons, one for each color of Magic (white, blue, black, red, green) and
// "none" (the colorless symbol). Each button shows Scryfall's own picture of that mana symbol.
// The chosen color has a ring around it.
//
//   playerNumber - which player this line is for (1 for Player 1, and so on)
//   value        - the color that is chosen right now
//   onChange     - called with the new color when a button is tapped
export function PlayerColorPicker({
  playerNumber,
  value,
  onChange,
}: {
  playerNumber: number;
  value: ManaColor;
  onChange: (color: ManaColor) => void;
}) {
  const theme = useTheme();
  const { tick } = useHaptics();

  return (
    <View style={styles.row}>
      <ThemedText type="smallBold">Player {playerNumber}</ThemedText>

      {/* The six color buttons in a row. */}
      <View style={styles.buttons}>
        {MANA_COLORS.map((color) => {
          const selected = color === value;
          return (
            <Pressable
              key={color}
              onPress={() => {
                // Only buzz when it actually changes, like the other settings do.
                if (!selected) tick();
                onChange(color);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Player ${playerNumber} color: ${MANA_COLOR_NAMES[color]}`}
              style={({ pressed }) => [
                styles.button,
                // The ring: always there (so nothing jumps around), but only colored when chosen.
                { borderColor: selected ? theme.text : 'transparent' },
                pressed && styles.pressed,
              ]}>
              {/* The symbol picture, found from its letter in braces, like {W}. */}
              <RichText size={SYMBOL_SIZE}>{`{${color}}`}</RichText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The name on top, the buttons underneath, with some space between lines.
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  // The six buttons side by side. They wrap onto a second line on a very narrow screen.
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // One round button, with room for the ring around the symbol.
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Slight dimming while a finger is on a button.
  pressed: {
    opacity: 0.6,
  },
});
