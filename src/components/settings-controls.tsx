import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';

// This file holds the small building blocks the settings page is made from:
//   SettingRow       - one line: a label on the left and a control on the right
//   ToggleSwitch     - an on/off switch
//   SegmentedControl - a row of buttons where exactly one is selected (Light / System / Dark)
//   Dropdown         - a button that opens a list of choices

// ONE SETTINGS LINE: the setting's name on the left, and whatever control we give it on the right.
export function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      {children}
    </View>
  );
}

// ON/OFF SWITCH: a thin wrapper around React Native's built-in Switch.
// "value" is true when the switch is on. "onChange" is called with the new value when tapped.
export function ToggleSwitch({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const theme = useTheme();
  const { tick } = useHaptics();
  return (
    <Switch
      value={value}
      // A light tick, then pass the new on/off value along.
      onValueChange={(next) => {
        tick();
        onChange(next);
      }}
      // Read aloud by screen readers so the switch has a name.
      accessibilityLabel={label}
      // Colors: the track is the pill shape, the thumb is the round knob.
      trackColor={{ false: theme.backgroundSelected, true: '#3c87f7' }}
      thumbColor="#ffffff"
    />
  );
}

// ROW OF CHOICE BUTTONS: used for Light / System / Dark.
// "options" lists the choices. The one matching "value" is highlighted.
export function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: Value }[];
  value: Value;
  onChange: (next: Value) => void;
}) {
  const { tick } = useHaptics();
  return (
    <ThemedView type="backgroundSelected" style={styles.segmentTrack}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            // A light tick, then pick this choice.
            onPress={() => {
              tick();
              onChange(option.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            // The selected button gets a lighter "pill" behind it; the others stay see-through.
            style={[styles.segment, selected && styles.segmentSelected]}>
            <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

// DROPDOWN: shows the current choice. Tapping it opens a list that floats over the page
// right under the button; tapping an item picks it, and tapping anywhere else closes it.
export function Dropdown<Value extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly Value[];
  value: Value;
  onChange: (next: Value) => void;
  label: string;
}) {
  // Where the button is on the screen (x, y, width, height), measured when it is tapped.
  // The list opens exactly under it. null means the list is closed.
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );
  const buttonRef = useRef<ComponentRef<typeof Pressable>>(null);
  const { tick } = useHaptics();
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const open = anchor !== null;

  // Measures where the button is, which also opens the list.
  function openList() {
    tick();
    buttonRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  }

  return (
    <View style={styles.dropdown}>
      {/* The button you tap to open the list. It shows the current choice. */}
      <Pressable
        ref={buttonRef}
        onPress={openList}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}>
        <ThemedView type="backgroundSelected" style={styles.dropdownButton}>
          <ThemedText type="small">{value}</ThemedText>
          {/* A small arrow: points down when closed, up when open. */}
          <ThemedText type="small" themeColor="textSecondary">
            {open ? '▲' : '▼'}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* The floating list. A Modal is a layer drawn above the whole screen, so the list
          can cover anything underneath it. "transparent" lets the page show through. */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAnchor(null)}>
        {/* An invisible layer over the whole screen. Tapping it closes the list,
            the way tapping outside a real dropdown does. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setAnchor(null)}
          accessibilityLabel="Close list"
        />
        {anchor && (
          // The list itself, placed just under the button and as wide as the button.
          <View
            style={[
              styles.dropdownList,
              {
                left: anchor.x,
                top: anchor.y + anchor.height + Spacing.one,
                width: anchor.width,
                // Never taller than the space between the button and the bottom of the screen.
                // A long list (like the 9 starting life totals) scrolls inside this height.
                maxHeight: Math.max(
                  120,
                  screenHeight - (anchor.y + anchor.height + Spacing.one) - Spacing.three,
                ),
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
              },
            ]}>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    tick();
                    onChange(option);
                    setAnchor(null);
                  }}
                  accessibilityRole="menuitem"
                  // The currently chosen item gets a highlight so you can see which one is picked.
                  style={[
                    styles.dropdownItem,
                    option === value && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText type={option === value ? 'smallBold' : 'small'}>{option}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // A settings line: label on the left, control on the right, same height for every line.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 48,
  },
  // Lets the label take the leftover space and line up with the middle of a 40px-tall control.
  label: {
    flex: 1,
    paddingTop: Spacing.two,
  },
  // The gray rounded bar behind the Light / System / Dark buttons.
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.one,
  },
  // One button inside that bar.
  segment: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  // The highlight shown behind the chosen button.
  segmentSelected: {
    backgroundColor: 'rgba(128, 128, 128, 0.35)',
  },
  // Keeps the button and its list stacked and lined up at the right edge.
  dropdown: {
    alignItems: 'flex-end',
    minWidth: 88,
  },
  // The button that shows the current number and the arrow.
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    minWidth: 88,
  },
  // The floating list. "absolute" means we place it at exact screen coordinates (under the
  // button) instead of letting the page layout decide, so it can cover whatever is below.
  // The outline and shadow make it look lifted off the page.
  dropdownList: {
    position: 'absolute',
    borderRadius: Spacing.two,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    // The Android version of the shadow.
    elevation: 12,
  },
  // One choice in the list.
  dropdownItem: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
