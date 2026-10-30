import * as Haptics from 'expo-haptics';

import { useSettings } from '@/context/settings-context';

// Gives a control a tiny "tick" you can feel, like tapping a key on the phone keyboard.
// It respects the Haptic Feedback setting: if that is off, tick() does nothing.
//
//   const { tick } = useHaptics();
//   tick();      // buzzes only if Haptic Feedback is on
//   tick(true);  // buzzes no matter what (used when the switch itself is turned on)
//   press();     // a firmer buzz for the bottom page buttons
export function useHaptics() {
  const { settings } = useSettings();

  function tick(force = false) {
    if (!force && !settings.hapticFeedback) return;
    // selectionAsync is the lightest buzz available: the same one the keyboard uses.
    // On devices with no vibration motor (like a web browser) it quietly does nothing.
    Haptics.selectionAsync().catch(() => {});
  }

  // A firmer buzz, about twice the strength of tick(), for the big page buttons
  // along the bottom of the screen. It also does nothing when Haptic Feedback is off.
  function press() {
    if (!settings.hapticFeedback) return;
    // "Medium" is one step stronger than the keyboard-style tick.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }

  return { tick, press };
}
