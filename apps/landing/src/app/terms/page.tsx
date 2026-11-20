import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Terms of Service — ${BRAND_NAME}`,
  description: `The terms that govern use of the ${BRAND_NAME} gym management platform.`,
};

const EFFECTIVE_DATE = 'July 22, 2026';

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      <section>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of {BRAND_NAME} (the
          &ldquo;Service&rdquo;), a gym management platform operated by <strong>Noetech</strong>, based in
          Biñan City, Laguna, Philippines (&ldquo;Noetech,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;). By creating an account or using the Service, you agree to these Terms. If you
          are using the Service on behalf of a gym, you confirm you have authority to bind that gym to
          these Terms.
        </p>
      </section>

      <section>
        <h2>1. The Service</h2>
        <p>
          {BRAND_NAME} provides gym owners and staff with a web dashboard and admin console for managing
          members, check-ins, plans, renewals, billing, and communication, and provides gym members with a
          mobile app for check-ins, membership status, and optional AI-assisted fitness and nutrition
          features.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          Gym owner and staff accounts are created through an invitation from Noetech or from an existing
          gym administrator. Member accounts are created by gym staff or through a self-service activation
          link. You are responsible for keeping your login credentials confidential and for all activity
          under your account.
        </p>
      </section>

      <section>
        <h2>3. Subscriptions and billing</h2>
        <ul>
          <li>Gym owners subscribe to a plan, priced in Philippine Pesos (₱), to access the Service.</li>
          <li>New gyms may be granted a free trial period. At the end of the trial, continued access requires payment.</li>
          <li>Payments are currently submitted and verified manually by Noetech staff; we do not yet process card payments automatically.</li>
          <li>Unpaid invoices past their due date may result in the account being marked past due and, if unresolved, suspended until payment is verified.</li>
          <li>Fees are non-refundable except where required by law or agreed by Noetech in writing.</li>
        </ul>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Access or attempt to access data belonging to a gym you are not a member or staff of.</li>
          <li>Use the Service for any unlawful purpose or in a way that violates another person&rsquo;s rights.</li>
          <li>Attempt to probe, scan, or breach the security or tenant isolation of the Service.</li>
          <li>Use automated means to scrape or extract data from the Service without our written consent.</li>
          <li>Misuse AI-assisted features to generate harmful, abusive, or misleading content.</li>
        </ul>
      </section>

      <section>
        <h2>5. Member data and gym ownership</h2>
        <p>
          As between a gym and Noetech, the gym owns the membership data it collects through the Service
          (member records, check-ins, renewals). Noetech processes this data on the gym&rsquo;s behalf to
          provide the Service, as described in our <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2>6. AI features and health disclaimer</h2>
        <p>
          AI-generated content &mdash; including meal suggestions, the AI coach, and admin insights &mdash;
          is provided for informational purposes only and is not medical, nutritional, or professional
          advice. Always consult a qualified professional before making health or fitness decisions, and do
          not rely on AI output as a substitute for professional guidance.
        </p>
      </section>

      <section>
        <h2>7. Intellectual property</h2>
        <p>
          The Service, including its software, design, and branding, is owned by Noetech and protected by
          applicable intellectual property laws. These Terms do not grant you any rights to our trademarks
          or branding beyond what is necessary to use the Service.
        </p>
      </section>

      <section>
        <h2>8. Termination</h2>
        <p>
          A gym owner may stop using the Service at any time. We may suspend or terminate access if fees
          remain unpaid after notice, if these Terms are violated, or if required by law. Upon termination,
          we may retain data as described in our Privacy Policy.
        </p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p>
          The Service is provided &ldquo;as is.&rdquo; To the fullest extent permitted by law, Noetech is
          not liable for indirect, incidental, or consequential damages arising from your use of the
          Service, including reliance on AI-generated content.
        </p>
      </section>

      <section>
        <h2>10. Governing law</h2>
        <p>
          These Terms are governed by the laws of the Republic of the Philippines. Any dispute arising from
          these Terms shall be subject to the exclusive jurisdiction of the courts of Biñan City, Laguna.
        </p>
      </section>

      <section>
        <h2>11. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will be reflected by updating the
          effective date above; continued use of the Service after changes take effect constitutes
          acceptance.
        </p>
      </section>

      <section>
        <h2>12. Contact us</h2>
        <p>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:privacy@noetecha.com">privacy@noetecha.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
