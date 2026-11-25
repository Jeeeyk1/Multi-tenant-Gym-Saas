import { defaultLadder, isValidLadder, ladderBadgeName } from './lift-ladder';

describe('lift ladders', () => {
  it('uses per-exercise defaults for the global lifts', () => {
    expect(defaultLadder({ name: 'Dumbbell Bench Press', category: 'CHEST' })).toEqual({ BRONZE: 30, SILVER: 40, GOLD: 50 });
  });

  it('falls back to the exercise category for gym-specific lifts', () => {
    expect(defaultLadder({ name: 'Hack Squat', category: 'LEGS' })).toEqual({ BRONZE: 60, SILVER: 90, GOLD: 120 });
  });

  it('requires strictly increasing, positive weights', () => {
    expect(isValidLadder({ BRONZE: 30, SILVER: 40, GOLD: 50 })).toBe(true);
    expect(isValidLadder({ BRONZE: 40, SILVER: 40, GOLD: 50 })).toBe(false);
    expect(isValidLadder({ BRONZE: 0, SILVER: 40, GOLD: 50 })).toBe(false);
  });

  it('names each rung after the lift and tier', () => {
    expect(ladderBadgeName('Back Squat', 'GOLD' as never)).toBe('Back Squat · Gold');
  });
});
