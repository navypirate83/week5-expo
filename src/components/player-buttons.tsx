import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { FIRST_PLAYER_NUMBER, playerRows } from '@/lib/player-layout';
import { useTheme } from '@/hooks/use-theme';

// The space between neighboring buttons, in pixels.
const GAP = Spacing.four;
// The empty margin around the whole group of buttons, in pixels.
const PADDING = Spacing.three;
// The biggest a button is allowed to be, so they don't become giant on a wide screen.
const MAX_DIAMETER = 280;

// The large round buttons on the main screen, arranged by how many players are allowed.
// "maxPlayers" comes from the Max Players setting; playerRows() turns it into rows.
// "onSelect" is called with the number on the button that was tapped, which is the number
// of players in the game (the button labeled 4 starts a 4-player game).
export function PlayerButtons({
  maxPlayers,
  onSelect,
}: {
  maxPlayers: number;
  onSelect: (players: number) => void;
}) {
  const theme = useTheme();
  const rows = playerRows(maxPlayers);

  // How much room we have to work with. We don't know until the screen is drawn, so
  // onLayout tells us afterwards, and we draw the buttons once we have the numbers.
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);

  // Work out one button size that fits every row: it must fit across the widest row
  // and down all the rows. We take whichever limit is smaller (and never exceed the maximum).
  let diameter = 0;
  if (area) {
    const widestRow = Math.max(...rows);
    // The measured size includes the padding around the edges, which buttons can't use.
    const usableWidth = area.width - PADDING * 2;
    const usableHeight = area.height - PADDING * 2;
    const fitsAcross = (usableWidth - GAP * (widestRow - 1)) / widestRow;
    const fitsDown = (usableHeight - GAP * (rows.length - 1)) / rows.length;
    diameter = Math.max(0, Math.floor(Math.min(fitsAcross, fitsDown, MAX_DIAMETER)));
  }

  // Buttons are numbered in reading order (left to right, top to bottom), starting at
  // FIRST_PLAYER_NUMBER (2): so the first button says 2, the next 3, and so on.
  // We start one below it because the counter goes up by one before each button is drawn.
  let playerNumber = FIRST_PLAYER_NUMBER - 1;

  return (
    // The area the buttons live in. It fills the screen, and the rows share it equally.
    <View
      style={styles.area}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setArea({ width, height });
      }}>
      {area &&
        rows.map((count, rowIndex) => (
          // One row of buttons, centered. A row with a single button puts it in the middle.
          <View key={rowIndex} style={[styles.row, { gap: GAP }]}>
            {Array.from({ length: count }, () => {
              playerNumber += 1;
              const number = playerNumber;
              return (
                // One round button: a square with corners rounded so far that it becomes a circle.
                // Tapping it starts a game with that many players.
                <Pressable
                  key={number}
                  onPress={() => onSelect(number)}
                  accessibilityRole="button"
                  accessibilityLabel={`${number} players`}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      width: diameter,
                      height: diameter,
                      borderRadius: diameter / 2,
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                    // A slight dimming while a finger is on it, so it feels pressable.
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText style={[styles.number, { fontSize: diameter * 0.4, lineHeight: diameter * 0.5 }]}>
                    {number}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fill all the space available. The rows split it evenly, each centered in its share.
  area: {
    flex: 1,
    padding: PADDING,
    justifyContent: 'center',
    gap: GAP,
  },
  // One row: buttons side by side, centered across the screen.
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // The look of every button: a thick outline, with the number centered inside.
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  // The dimmed look while pressed.
  pressed: {
    opacity: 0.7,
  },
  // The player number inside the button.
  number: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
