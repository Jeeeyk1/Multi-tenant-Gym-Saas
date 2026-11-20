// Single source of truth for the product name shown across the landing site.
// Not final yet — override at deploy time with NEXT_PUBLIC_BRAND_NAME instead of editing copy.
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'LiftHub';
