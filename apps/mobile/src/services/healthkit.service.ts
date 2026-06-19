import { Platform } from 'react-native';

export interface WorkoutMetrics {
  caloriesBurned: number | null;
  avgHeartRate: number | null;
}

// Lazy-load the native module — only available on iOS with the HealthKit entitlement.
// Using require() avoids crashing on Android where the module isn't linked.
function getHK() {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-healthkit');
    return {
      kit: mod.default as import('react-native-healthkit').default,
      ids: mod.HKQuantityTypeIdentifier as typeof import('react-native-healthkit').HKQuantityTypeIdentifier,
    };
  } catch {
    return null;
  }
}

export const healthKitService = {
  isAvailable(): boolean {
    return getHK() !== null;
  },

  async requestPermissions(): Promise<void> {
    const hk = getHK();
    if (!hk) return;
    try {
      await hk.kit.requestAuthorization(
        [],
        [hk.ids.activeEnergyBurned, hk.ids.heartRate],
      );
    } catch {
      // System dialog cancelled or HealthKit unavailable — not fatal
    }
  },

  async readSessionMetrics(startedAt: string, endedAt: string): Promise<WorkoutMetrics> {
    const hk = getHK();
    if (!hk) return { caloriesBurned: null, avgHeartRate: null };

    const from = new Date(startedAt);
    const to = new Date(endedAt);

    try {
      const [calSamples, hrSamples] = await Promise.all([
        hk.kit.queryQuantitySamples(hk.ids.activeEnergyBurned, { from, to, unit: 'kcal' }),
        hk.kit.queryQuantitySamples(hk.ids.heartRate, { from, to, unit: 'count/min' }),
      ]);

      const totalCals = calSamples.reduce((sum, s) => sum + s.quantity, 0);
      const caloriesBurned = totalCals > 0 ? Math.round(totalCals) : null;

      const avgHeartRate =
        hrSamples.length > 0
          ? Math.round(hrSamples.reduce((sum, s) => sum + s.quantity, 0) / hrSamples.length)
          : null;

      return { caloriesBurned, avgHeartRate };
    } catch {
      return { caloriesBurned: null, avgHeartRate: null };
    }
  },
};
