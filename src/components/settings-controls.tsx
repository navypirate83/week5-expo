import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

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

// DROPDOWN: shows the current choice. Tapping it opens a list underneath;
// tapping an item picks it and closes the list.
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
  // "open" remembers whether the list is showing right now.
  const [open, setOpen] = useState(false);
  const { tick } = useHaptics();

  return (
    <View style={styles.dropdown}>
      {/* The button you tap to open or close the list. */}
      <Pressable
        // A light tick, then open or close the list.
        onPress={() => {
          tick();
          setOpen((current) => !current);
        }}
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

      {/* The list of choices. It only exists while "open" is true. */}
      {open && (
        <ThemedView type="backgroundSelected" style={styles.dropdownList}>
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                tick();
                onChange(option);
                setOpen(false);
              }}
              accessibilityRole="menuitem"
              style={styles.dropdownItem}>
              {/* The currently chosen item is bold so you can see which one is picked. */}
              <ThemedText type={option === value ? 'smallBold' : 'small'}>{option}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}
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
  // The list that appears under the button.
  dropdownList: {
    marginTop: Spacing.one,
    borderRadius: Spacing.two,
    minWidth: 88,
    overflow: 'hidden',
  },
  // One choice in the list.
  dropdownItem: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
