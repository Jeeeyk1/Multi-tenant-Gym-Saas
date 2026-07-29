import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — LiftHub',
  description: 'How Noetech collects, uses, and protects your data on the LiftHub platform.',
};

const EFFECTIVE_DATE = 'July 22, 2026';

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <section>
        <p>
          LiftHub (the &ldquo;Service&rdquo;) is a gym management platform operated by{' '}
          <strong>Noetech</strong>, based in Biñan City, Laguna, Philippines (&ldquo;Noetech,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). This Privacy Policy explains how we
          collect, use, disclose, and protect personal data when a gym, its staff, or its members use our
          web dashboard, admin console, or mobile app. It is written to comply with the Philippine Data
          Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations.
        </p>
      </section>

      <section>
        <h2>1. Information we collect</h2>
        <p>We collect the following categories of personal data, depending on how you use the Service:</p>
        <ul>
          <li><strong>Account data</strong> — name, email address, phone number, and password (stored as a salted hash, never in plain text).</li>
          <li><strong>Membership data</strong> — membership number, plan, join date, expiry date, check-in and attendance history, and renewal/payment records.</li>
          <li>
            <strong>Health and fitness data</strong> — if you choose to use fitness features, this may
            include age, height, weight, fitness goals, activity level, training experience, injuries, diet
            type, workout and meal history, and conversations with the AI coach. This is sensitive personal
            information under the Data Privacy Act and is collected only with your consent.
          </li>
          <li><strong>Payment records</strong> — invoice amounts, payment method, and payment reference/proof submitted for manual verification by gym or platform staff. We do not collect or store full card numbers.</li>
          <li><strong>Communications</strong> — messages sent through in-app chat, announcements, and support requests.</li>
          <li><strong>Technical data</strong> — device/browser information, IP address, and request logs (including a request ID) used to diagnose and fix issues.</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use your information</h2>
        <ul>
          <li>Operate core gym-management features: member registration, check-ins, plan renewals, and billing.</li>
          <li>Provide optional AI-assisted features (meal suggestions, AI coach, admin insights) that you or your gym choose to enable.</li>
          <li>Send transactional emails, such as account activation, renewal reminders, and trial notices.</li>
          <li>Maintain the security and integrity of the Service, including tenant isolation between gyms.</li>
          <li>Comply with legal obligations and respond to lawful requests.</li>
        </ul>
      </section>

      <section>
        <h2>3. Who can see your data</h2>
        <p>
          The Service is multi-tenant: a gym&rsquo;s staff can only see data belonging to members of that
          specific gym. Noetech staff may access data as needed to operate, support, and secure the
          platform, or when manually verifying a payment.
        </p>
      </section>

      <section>
        <h2>4. Third-party service providers</h2>
        <p>
          We share limited data with the following sub-processors, solely to provide the Service. Some of
          these providers process data on servers located outside the Philippines; where this occurs, we
          rely on their contractual and security commitments to protect your data.
        </p>
        <ul>
          <li><strong>Anthropic</strong> and <strong>Groq</strong> — process AI Coach, meal-suggestion, and admin-insight requests you or your gym initiate.</li>
          <li><strong>Resend</strong> — delivers transactional emails (invites, renewal and trial notices).</li>
          <li><strong>Cloudinary</strong> — stores images you upload, such as profile photos or payment proof.</li>
        </ul>
        <p>We do not sell personal data to third parties.</p>
      </section>

      <section>
        <h2>5. Data retention</h2>
        <p>
          We retain personal data for as long as your account or your gym&rsquo;s subscription is active,
          and for a reasonable period afterward to meet legal, accounting, or dispute-resolution needs.
          You may request earlier deletion as described in Section 7.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          We use encryption in transit, hashed credentials, role- and permission-based access control, and
          tenant-scoped data access to protect your information. No system is completely secure, but we
          work to keep the Service and your data safe.
        </p>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>Under the Data Privacy Act, you have the right to:</p>
        <ul>
          <li>Be informed that your personal data is being processed.</li>
          <li>Access a copy of your personal data.</li>
          <li>Correct inaccurate or outdated data.</li>
          <li>Object to or withdraw consent for certain processing.</li>
          <li>Request erasure or blocking of data, where legally permitted.</li>
          <li>Request a copy of your data in a portable format.</li>
          <li>File a complaint with the National Privacy Commission (privacy.gov.ph).</li>
        </ul>
        <p>To exercise any of these rights, contact us using the details in Section 10.</p>
      </section>

      <section>
        <h2>8. Children&rsquo;s data</h2>
        <p>
          The Service is intended for members aged 16 and older. Members aged 16&ndash;17 may only be
          enrolled with the consent of a parent or legal guardian, obtained by the gym at enrollment. We do
          not knowingly collect personal data from children under 16.
        </p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p>
          Our web dashboard uses a session cookie strictly to keep you signed in. We do not use advertising
          or third-party tracking cookies.
        </p>
      </section>

      <section>
        <h2>10. Contact us</h2>
        <p>
          For privacy questions or to exercise your rights, contact us at{' '}
          <a href="mailto:privacy@noetecha.com">privacy@noetecha.com</a>, or write to us in Biñan City,
          Laguna, Philippines.
        </p>
      </section>

      <section>
        <h2>11. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected by
          updating the effective date above.
        </p>
      </section>
    </LegalLayout>
  );
}
