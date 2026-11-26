import { isUnderFolder, publicIdFromUrl } from './cloudinary.adapter';

describe('publicIdFromUrl', () => {
  it('reads the public id from one of our delivery URLs', () => {
    expect(publicIdFromUrl('https://res.cloudinary.com/fitops/image/upload/v1712345/gym-saas/prs/abc123.jpg', 'fitops')).toBe(
      'gym-saas/prs/abc123',
    );
    expect(publicIdFromUrl('https://res.cloudinary.com/fitops/image/upload/gym-saas/food/x.png', 'fitops')).toBe('gym-saas/food/x');
  });

  it('ignores URLs that are not ours', () => {
    expect(publicIdFromUrl('https://res.cloudinary.com/someone-else/image/upload/v1/a.jpg', 'fitops')).toBeNull();
    expect(publicIdFromUrl('https://evil.example/fitops/image/upload/a.jpg', 'fitops')).toBeNull();
    expect(publicIdFromUrl('http://res.cloudinary.com/fitops/image/upload/a.jpg', 'fitops')).toBeNull();
    expect(publicIdFromUrl('not a url', 'fitops')).toBeNull();
    expect(publicIdFromUrl('https://res.cloudinary.com/fitops/image/upload/a.jpg', '')).toBeNull();
  });
});

describe('isUnderFolder', () => {
  it('matches only inside the folder', () => {
    expect(isUnderFolder('members/m1/food-logs/a', ['members/m1'])).toBe(true);
    expect(isUnderFolder('members/m10/food-logs/a', ['members/m1'])).toBe(false);
    expect(isUnderFolder('gym-saas/logos/x', ['members/m1', 'gyms/g1/leaderboard'])).toBe(false);
    expect(isUnderFolder('gyms/g1/leaderboard/p', ['members/m1', 'gyms/g1/leaderboard/'])).toBe(true);
  });
});
