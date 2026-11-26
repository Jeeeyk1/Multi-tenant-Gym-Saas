import AsyncStorage from '@react-native-async-storage/async-storage';

/** Staff who are also members choose which app they see; remembered on this device. */
export type PreferredView = 'staff' | 'member';

const KEY = 'preferred_view';

export async function getPreferredView(): Promise<PreferredView> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'member' ? 'member' : 'staff';
  } catch {
    return 'staff';
  }
}

export async function setPreferredView(view: PreferredView): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, view);
  } catch {
    // Best effort: the switch still works for this session.
  }
}

export async function clearPreferredView(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
