import clsx from 'clsx';
import { CONTACT_EMAIL } from '@/lib/brand';
import { formatPeso, sharedFeatures, yearlySaving, type PublicPlan } from '@/lib/plans';
import { ButtonLink } from './ui/ButtonLink';
import { Container } from './ui/Container';
import { CheckIcon, UsersIcon } from './ui/icons';
import { SectionHeader } from './ui/SectionHeader';
import { TrustList } from './ui/TrustList';
import { motionDelay } from '@/lib/motion';

const TRUST_ITEMS = [
  'Free trial',
  'No credit card required',
  'Free setup assistance',
  'Cancel anytime',
];
const CUSTOM_PLAN_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Custom plan')}`;

function PlanCard({ plan, step }: { plan: PublicPlan; step: number }) {
  const popular = plan.isPopular;
  const saving = yearlySaving(plan);

  return (
    // Reveal on the li, hover lift on the card: both use transform.
    <li style={motionDelay(step)} className="reveal flex flex-[1_1_280px]">
      <div
        className={clsx(
          'lift-card flex w-full flex-col gap-3.5 rounded-[20px] p-8',
          popular
            ? 'lift-card-popular bg-plan-popular border border-navy-line'
            : 'border border-line bg-white',
        )}
      >
        {popular ? (
          <span className="self-start rounded-full bg-volt px-3 py-1 text-xs font-semibold text-navy">
            Most popular
          </span>
        ) : (
          <span aria-hidden="true" className="hidden h-6 md:block" />
        )}
        <h3
          className={clsx(
            'font-display text-[22px] font-extrabold',
            popular ? 'text-white' : 'text-ink',
          )}
        >
          {plan.name}
        </h3>
        {plan.description && (
          <p className={clsx('text-[15px]', popular ? 'text-ink-on-navy' : 'text-ink-secondary')}>
            {plan.description}
          </p>
        )}
        <p className="flex items-baseline gap-1.5">
          <span
            className={clsx(
              'font-display text-[46px] font-extrabold tracking-[-0.04em]',
              popular ? 'text-white' : 'text-ink',
            )}
          >
            {formatPeso(Number(plan.priceMonthly))}
          </span>
          <span
            className={clsx('text-[15px]', popular ? 'text-ink-on-navy' : 'text-ink-secondary')}
          >
            / month
          </span>
        </p>
        {plan.priceYearly != null && (
          <p className={clsx('text-sm', popular ? 'text-ink-on-navy' : 'text-ink-secondary')}>
            or {formatPeso(Number(plan.priceYearly))} / year
            {saving && (
              <>
                {' · '}
                <b className={popular ? 'text-volt' : 'text-success'}>save {formatPeso(saving)}</b>
              </>
            )}
          </p>
        )}
        {plan.memberLimit != null && (
          <p
            className={clsx(
              'flex items-center gap-2 rounded-xl px-3.5 py-3 text-[15px] font-semibold',
              popular ? 'bg-white/5 text-white' : 'bg-cloud text-ink',
            )}
          >
            <UsersIcon size={18} className={popular ? 'text-volt' : 'text-code'} />
            Up to {plan.memberLimit.toLocaleString('en-PH')} active members
          </p>
        )}
        <ButtonLink
          href="#trial"
          variant={popular ? 'volt' : 'primary'}
          className="mt-auto h-[52px]"
        >
          Start free trial
        </ButtonLink>
      </div>
    </li>
  );
}

function PricingUnavailable() {
  return (
    <p className="rounded-[20px] border border-line p-8 text-center text-[15px] text-ink-secondary">
      Pricing is temporarily unavailable. Email{' '}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="font-semibold text-code underline-offset-4 hover:underline"
      >
        {CONTACT_EMAIL}
      </a>{' '}
      and we&apos;ll send it to you.
    </p>
  );
}

export function PricingSection({ plans }: { plans: PublicPlan[] }) {
  const included = sharedFeatures(plans);

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="bg-white py-20 sm:py-24">
      <Container className="flex flex-col gap-11">
        <SectionHeader
          id="pricing-heading"
          align="center"
          eyebrow="Pricing"
          title="Every feature, on every plan."
          subtitle="Plans differ only by gym size. Prices include VAT."
        />

        {plans.length === 0 ? (
          <PricingUnavailable />
        ) : (
          <ul className="flex flex-wrap items-stretch gap-5">
            {plans.map((plan, index) => (
              <PlanCard key={plan.id} plan={plan} step={index} />
            ))}
          </ul>
        )}

        <div className="reveal flex flex-wrap gap-5">
          {included.length > 0 && (
            <div className="flex flex-[2_1_460px] flex-col gap-4 rounded-[20px] border border-line px-6 py-7 sm:px-8">
              <h3 className="text-xs font-semibold tracking-[0.1em] text-ink-secondary">
                INCLUDED IN EVERY PLAN
              </h3>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-3 text-[15px] text-ink">
                {included.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <CheckIcon size={18} className="mt-0.5 flex-none text-code" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-[1_1_280px] flex-col gap-4">
            <p className="rounded-[20px] bg-navy p-[22px] text-[15px] leading-normal text-white">
              <b className="text-volt">Pays for itself:</b> if your members pay {formatPeso(2000)} a
              month, keeping just 2 of them from leaving covers Standard.
            </p>
            <p className="rounded-[20px] border-[1.5px] border-founding-border bg-founding-tint p-[22px] text-[15px] leading-normal text-ink">
              <b>Founding gyms:</b> 50% off monthly for your first year.{' '}
              <a href="#founding" className="font-semibold text-code underline underline-offset-2">
                10 spots only.
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <TrustList items={TRUST_ITEMS} tone="light" className="justify-center" />
          <p className="text-[15px] text-ink-secondary">
            Extra branches +{formatPeso(2499)}/month each. More than 500 members?{' '}
            <a
              href={CUSTOM_PLAN_HREF}
              className="font-semibold text-code underline-offset-4 hover:underline"
            >
              Talk to us about a custom plan
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
}
