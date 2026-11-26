export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  // Prisma Decimal columns arrive as strings in JSON.
  priceMonthly: number | string;
  priceYearly: number | string | null;
  memberLimit: number | null;
  features: string[];
  isPopular: boolean;
}

export async function getPlans(): Promise<PublicPlan[]> {
  try {
    const url = `${process.env.API_URL ?? 'http://localhost:9001'}/api/v1/public/plans`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export function yearlySaving(plan: PublicPlan): number | null {
  if (plan.priceYearly == null) return null;
  const saving = Number(plan.priceMonthly) * 12 - Number(plan.priceYearly);
  return saving > 0 ? saving : null;
}

export function sharedFeatures(plans: PublicPlan[]): string[] {
  const [first, ...rest] = plans;
  if (!first) return [];
  return first.features.filter((feature) => rest.every((plan) => plan.features.includes(feature)));
}
