import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// One OS listener for the whole app: medals in long lists all read this, so a per-component
// listener would mean dozens of subscriptions.
let reduceMotionNow = false;
const listeners = new Set<() => void>();
let started = false;

function setReduceMotion(value: boolean) {
  if (value === reduceMotionNow) return;
  reduceMotionNow = value;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (!started) {
    started = true;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True when the user asked the OS to reduce motion; animations should be skipped. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduceMotionNow);
}

/** True while a screen reader (VoiceOver / TalkBack) is running. */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) setEnabled(value);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return enabled;
}

/**
 * Show content straight away instead of "typing" it: for reduce motion, and for
 * screen readers so controls are not hidden while focus moves.
 */
export function useInstantContent(): boolean {
  const reduceMotion = useReduceMotion();
  const screenReader = useScreenReader();
  return reduceMotion || screenReader;
}
