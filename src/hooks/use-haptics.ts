import * as Haptics from 'expo-haptics';

import { useSettings } from '@/context/settings-context';

// Gives a control a tiny "tick" you can feel, like tapping a key on the phone keyboard.
// It respects the Haptic Feedback setting: if that is off, tick() does nothing.
//
//   const { tick } = useHaptics();
//   tick();      // buzzes only if Haptic Feedback is on
//   tick(true);  // buzzes no matter what (used when the switch itself is turned on)
export function useHaptics() {
  const { settings } = useSettings();

  function tick(force = false) {
    if (!force && !settings.hapticFeedback) return;
    // selectionAsync is the lightest buzz available: the same one the keyboard uses.
    // On devices with no vibration motor (like a web browser) it quietly does nothing.
    Haptics.selectionAsync().catch(() => {});
  }

  return { tick };
}
