import { BadgeRarity } from '../../../common/enums';
import { badgeKey, badgeRarity, badgeSharePct } from './badge-rarity';

describe('badgeRarity', () => {
  it('is legendary at 5% or less in a gym of 20+', () => {
    expect(badgeRarity(1, 20)).toBe(BadgeRarity.LEGENDARY);
    expect(badgeRarity(5, 100)).toBe(BadgeRarity.LEGENDARY);
    expect(badgeRarity(0, 40)).toBe(BadgeRarity.LEGENDARY);
  });

  it('is epic at 15% or less in a gym of 10+', () => {
    expect(badgeRarity(6, 100)).toBe(BadgeRarity.EPIC);
    expect(badgeRarity(1, 10)).toBe(BadgeRarity.EPIC);
    expect(badgeRarity(1, 19)).toBe(BadgeRarity.EPIC);
  });

  it('is never rare in a small gym or when most members have it', () => {
    expect(badgeRarity(0, 9)).toBeNull();
    expect(badgeRarity(16, 100)).toBeNull();
    expect(badgeRarity(0, 0)).toBeNull();
  });
});

describe('badgeSharePct', () => {
  it('rounds to a whole percent', () => {
    expect(badgeSharePct(1, 3)).toBe(33);
    expect(badgeSharePct(0, 0)).toBeNull();
  });
});

describe('badgeKey', () => {
  it('names the definition the badge came from', () => {
    expect(badgeKey({ badgeCatalogId: 'c1', milestoneBadgeId: null, customBadgeId: null })).toBe('catalog:c1');
    expect(badgeKey({ badgeCatalogId: null, milestoneBadgeId: 'm1', customBadgeId: null })).toBe('milestone:m1');
    expect(badgeKey({ badgeCatalogId: null, milestoneBadgeId: null, customBadgeId: 'x1' })).toBe('custom:x1');
  });
});
