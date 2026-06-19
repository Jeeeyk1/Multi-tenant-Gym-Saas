'use client';

import { useState } from 'react';

interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  features: string[];
  isPopular: boolean;
}

const FALLBACK_PLANS: SaasPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Everything you need to run your gym efficiently',
    priceMonthly: 2299,
    priceYearly: 22990,
    isPopular: false,
    features: [
      'Up to 100 members',
      'Member mobile app (iOS & Android)',
      'Smart check-in system',
      'Staff web portal',
      'Membership plan management',
      'Renewal tracking',
      'Announcements & messaging',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Starter plus AI-powered tools for smarter management',
    priceMonthly: 3299,
    priceYearly: 32990,
    isPopular: true,
    features: [
      'Everything in Starter',
      'Unlimited members',
      'AI management assistant',
      'Ask AI about your gym data & reports',
      'AI workout coaching for members',
      'Food photo analysis (meal tracking)',
      'Advanced analytics & insights',
      'Priority support',
    ],
  },
];

function formatPhp(amount: number) {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function PricingSection({ plans }: { plans: SaasPlan[] }) {
  const [yearly, setYearly] = useState(false);

  const displayPlans = plans.length > 0 ? plans : FALLBACK_PLANS;

  return (
    <section id="pricing" className="py-24 px-6 border-t border-border/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-4xl font-bold text-foreground mb-4">Simple, affordable pricing</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Designed for Philippine gym owners. No hidden fees, no per-seat charges.
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayPlans.map((plan) => {
            const monthlyAmount = yearly && plan.priceYearly
              ? plan.priceYearly / 12
              : Number(plan.priceMonthly);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.isPopular
                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                    : 'bg-surface border-border'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap tracking-wide">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{plan.description}</p>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-foreground tracking-tight">
                      {formatPhp(monthlyAmount)}
                    </span>
                    <span className="text-muted-foreground text-sm mb-1.5">/mo</span>
                  </div>
                  {yearly && plan.priceYearly && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed {formatPhp(plan.priceYearly)} yearly · Save {formatPhp(Number(plan.priceMonthly) * 12 - plan.priceYearly)}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
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

                <a
                  href="mailto:hello@lifthub.app"
                  className={`w-full text-center py-3.5 rounded-xl text-sm font-semibold transition ${
                    plan.isPopular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-background border border-border text-foreground hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  Get started — 14 days free
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
          {['14-day free trial', 'No credit card required', 'Cancel anytime', 'Free setup assistance'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need a custom plan for multiple locations?{' '}
          <a href="mailto:hello@lifthub.app" className="text-primary font-medium hover:underline">
            Talk to us
          </a>
        </p>
      </div>
    </section>
  );
}
