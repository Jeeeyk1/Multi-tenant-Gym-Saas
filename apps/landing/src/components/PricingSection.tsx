'use client';

import { useState } from 'react';
import { SubscribeModal } from './SubscribeModal';

interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  features: string[];
  isPopular: boolean;
}

// Mirrors the live "Standard" row in saas_plans (db/migrations/0045_seed_saas_plan.sql) —
// used only if that table is unreachable, so it must stay in sync with the real plan.
const FALLBACK_PLANS: SaasPlan[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Everything you need to run your gym — one plan, no tiers to compare.',
    priceMonthly: 3499,
    priceYearly: 34990,
    isPopular: true,
    features: [
      'Up to 150 active members',
      'Member mobile app (iOS & Android)',
      'Smart check-in system',
      'Staff & owner web dashboard',
      'Membership plans, renewals & billing',
      'Announcements & community chat',
      'Leaderboard & badges',
      'AI Coach — workout & meal plans for members',
      'AI Insights — ask questions about your gym data',
      'Email support',
    ],
  },
];

function formatPhp(amount: number) {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function PricingSection({ plans }: { plans: SaasPlan[] }) {
  const [yearly, setYearly] = useState(false);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);

  // There's one real plan — everything included, no tiers to compare or upsell into.
  const plan = plans[0] ?? FALLBACK_PLANS[0];
  const monthlyAmount = yearly && plan.priceYearly ? plan.priceYearly / 12 : Number(plan.priceMonthly);

  return (
    <section id="pricing" className="py-24 px-6 border-t border-border/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-4xl font-bold text-foreground mb-4">One plan. Everything included.</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            No tiers to compare, no features locked behind an upgrade. Just one price for
            everything your gym needs.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-surface border border-border rounded-full p-1 gap-1">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${
                !yearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                yearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                yearly ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-success/10 text-success'
              }`}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Single plan card — split layout instead of a comparison grid, since there's nothing to compare */}
        <div className="rounded-3xl border border-border bg-surface overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* Left: price + CTA */}
            <div className="md:col-span-2 p-8 md:p-10 flex flex-col justify-center bg-primary/5 border-b md:border-b-0 md:border-r border-border">
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{plan.description}</p>
              )}

              <div className="mt-6">
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-foreground tracking-tight">
                    {formatPhp(monthlyAmount)}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1.5">/mo</span>
                </div>
                {yearly && plan.priceYearly && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Billed {formatPhp(plan.priceYearly)} yearly · Save {formatPhp(Number(plan.priceMonthly) * 12 - plan.priceYearly)}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSubscribingPlan(plan.name)}
                className="mt-8 w-full text-center py-3.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                Get started
              </button>
            </div>

            {/* Right: what's included */}
            <div className="md:col-span-3 p-8 md:p-10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                What&apos;s included
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary flex-shrink-0 mt-0.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
          {['Free trial', 'No credit card required', 'Cancel anytime', 'Free setup assistance'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Have more than 150 members or multiple branches?{' '}
          <a href="mailto:hello@lifthub.app" className="text-primary font-medium hover:underline">
            Talk to us
          </a>
        </p>
      </div>

      {subscribingPlan && (
        <SubscribeModal plan={subscribingPlan} onClose={() => setSubscribingPlan(null)} />
      )}
    </section>
  );
}
