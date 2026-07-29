import { Ionicons } from '@expo/vector-icons';
import type { WorkoutType } from '../types';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export interface WorkoutTypeMeta {
  type: WorkoutType;
  icon: IoniconName;
  color: string;
}

/** Single source of truth for how each workout type is presented (icon + accent color).
 * Shared across the workout, train, and history screens. */
export const WORKOUT_TYPES: WorkoutTypeMeta[] = [
  { type: 'Strength', icon: 'barbell', color: '#8B5CF6' },
  { type: 'Cardio', icon: 'walk', color: '#F97316' },
  { type: 'HIIT', icon: 'flash', color: '#EF4444' },
  { type: 'CrossFit', icon: 'flame', color: '#F59E0B' },
  { type: 'Yoga', icon: 'body', color: '#10B981' },
  { type: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

export const DEFAULT_WORKOUT_ICON: IoniconName = 'barbell';
export const DEFAULT_WORKOUT_COLOR = '#6B7280';

const BY_TYPE: Record<string, WorkoutTypeMeta> = Object.fromEntries(
  WORKOUT_TYPES.map((meta) => [meta.type, meta]),
);

export function workoutTypeMeta(type: string): WorkoutTypeMeta | undefined {
  return BY_TYPE[type];
}

export function workoutTypeIcon(type: string): IoniconName {
  return BY_TYPE[type]?.icon ?? DEFAULT_WORKOUT_ICON;
}

export function workoutTypeColor(type: string): string {
  return BY_TYPE[type]?.color ?? DEFAULT_WORKOUT_COLOR;
}
