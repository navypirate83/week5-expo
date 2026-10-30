import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

// A box that shows its contents turned on their side (90 or 270 degrees), filling the space
// it is given.
//
// Turning something sideways is tricky because its width and height swap places. A panel that
// should fill a tall, narrow slot (say 171 wide and 375 tall) has to be built as a WIDE, short
// panel (375 wide and 171 tall) and then turned, so that after turning it fits the slot exactly.
// This does that in three steps:
//   1. Measure the slot we were given (the first View, with onLayout).
//   2. Make a second box with the width and height swapped, and put the contents in it.
//   3. Center that box over the slot and turn it. It turns around its own center, so after
//      turning, it lines up with the slot perfectly.
//
//   degrees  - 90 turns clockwise (the top of the contents points right),
//              270 turns the other way (the top of the contents points left)
//   children - what to show, usually a LifePanel
export function RotatedSlot({ degrees, children }: { degrees: 90 | 270; children: ReactNode }) {
  // The size of the slot. We don't know it until the screen has been drawn once.
  const [slot, setSlot] = useState<{ width: number; height: number } | null>(null);

  return (
    <View
      style={styles.slot}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSlot({ width, height });
      }}>
      {slot && (
        <View
          style={{
            position: 'absolute',
            // Width and height swapped, as explained above.
            width: slot.height,
            height: slot.width,
            // Move it so its center is at the slot's center. (It is bigger than the slot in one
            // direction and smaller in the other, so one of these is negative. That's fine.)
            left: (slot.width - slot.height) / 2,
            top: (slot.height - slot.width) / 2,
            transform: [{ rotate: `${degrees}deg` }],
          }}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The slot shares the available space equally with its neighbors.
  slot: {
    flex: 1,
  },
});
