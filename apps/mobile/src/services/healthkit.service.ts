import { Platform } from 'react-native';

export interface WorkoutMetrics {
  caloriesBurned: number | null;
  avgHeartRate: number | null;
}

type HKModule = typeof import('@kingstinct/react-native-healthkit');

// Lazy-load the native module — only available on iOS with the HealthKit entitlement.
// Using require() avoids crashing on Android where the module isn't linked.
function getHK(): HKModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@kingstinct/react-native-healthkit') as HKModule;
  } catch {
    return null;
  }
}

const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;
const HEART_RATE = 'HKQuantityTypeIdentifierHeartRate' as const;

export const healthKitService = {
  isAvailable(): boolean {
    return getHK() !== null;
  },

  async requestPermissions(): Promise<void> {
    const hk = getHK();
    if (!hk) return;
    try {
      await hk.requestAuthorization({ toRead: [ACTIVE_ENERGY, HEART_RATE] });
    } catch {
      // System dialog cancelled or HealthKit unavailable — not fatal
    }
  },

  async readSessionMetrics(startedAt: string, endedAt: string): Promise<WorkoutMetrics> {
    const hk = getHK();
    if (!hk) return { caloriesBurned: null, avgHeartRate: null };

    const startDate = new Date(startedAt);
    const endDate = new Date(endedAt);

    try {
      const dateFilter = { date: { startDate, endDate } };
      const [calSamples, hrSamples] = await Promise.all([
        hk.queryQuantitySamples(ACTIVE_ENERGY, { limit: -1, unit: 'kcal', filter: dateFilter }),
        hk.queryQuantitySamples(HEART_RATE, { limit: -1, unit: 'count/min', filter: dateFilter }),
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
