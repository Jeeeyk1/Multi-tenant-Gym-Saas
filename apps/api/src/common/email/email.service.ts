import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { normalizeHex, onAccent } from './accent';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromAddress: string;
  private readonly webUrl: string;
  private readonly landingUrl: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.fromAddress = config.get<string>('EMAIL_FROM') ?? 'hello@getversolutions.com';
    this.webUrl = config.get<string>('WEB_URL') ?? 'http://localhost:9002';
    this.landingUrl = config.get<string>('LANDING_URL') ?? 'http://localhost:9004';
  }

  async sendOwnerInvite(opts: {
    to: string;
    fullName: string;
    gymName: string;
    gymCode: string;
    token: string;
  }) {
    const link = `${this.webUrl}/activate?token=${opts.token}`;
    await this.send({
      to: opts.to,
      subject: `You're invited to manage ${opts.gymName} on FitOps`,
      html: template({
        title: `Welcome to ${escapeHtml(opts.gymName)}!`,
        preheader: `Activate your account and start managing your gym.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${escapeHtml(opts.fullName)}</strong>,</p>
          <p style="margin:0 0 16px">
            Your gym <strong>${escapeHtml(opts.gymName)}</strong> has been set up on FitOps.
            You're all set to start managing your gym — members, schedules, check-ins, and more.
          </p>
          <p style="margin:0 0 24px">
            Click the button below to activate your account and set your password.
            This link expires in <strong>7 days</strong>.
          </p>
        `,
        ctaLabel: 'Activate My Account',
        ctaUrl: link,
        footer: `Your gym code is <strong>${escapeHtml(opts.gymCode)}</strong> — you'll need this to sign in.`,
      }),
    });
  }

  async sendPasswordReset(opts: { to: string; fullName: string; token: string }) {
    const link = `${this.webUrl}/reset-password?token=${opts.token}`;
    await this.send({
      to: opts.to,
      subject: 'Reset your password',
      html: template({
        title: 'Reset your password',
        preheader: 'You requested a password reset. Click to set a new password.',
        body: `
          <p style="margin:0 0 16px">Hi <strong>${escapeHtml(opts.fullName)}</strong>,</p>
          <p style="margin:0 0 16px">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in <strong>1 hour</strong>.
          </p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
            If you didn't request this, you can safely ignore this email — your password won't change.
          </p>
        `,
        ctaLabel: 'Reset Password',
        ctaUrl: link,
        footer: 'For security, this link can only be used once.',
      }),
    });
  }

  async sendMemberInvite(opts: {
    to: string;
    fullName: string;
    gymName: string;
    gymCode: string;
    token: string;
    gymLogoUrl?: string | null;
    gymAccent?: string | null;
  }) {
    const link = `${this.webUrl}/member-activate?token=${opts.token}&code=${encodeURIComponent(opts.gymCode)}`;
    return this.send({
      to: opts.to,
      fromName: `${opts.gymName} via FitOps`,
      subject: `You've been invited to join ${opts.gymName}`,
      html: template({
        gym: { name: opts.gymName, logoUrl: opts.gymLogoUrl, accent: opts.gymAccent },
        title: `Welcome to ${escapeHtml(opts.gymName)}!`,
        preheader: `Your membership is ready — activate your account to get started.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${escapeHtml(opts.fullName)}</strong>,</p>
          <p style="margin:0 0 16px">
            You've been added as a member of <strong>${escapeHtml(opts.gymName)}</strong>.
            Activate your account to access your membership, track check-ins, and more.
          </p>
          <p style="margin:0 0 24px">
            This link expires in <strong>7 days</strong>.
          </p>
        `,
        ctaLabel: 'Activate My Membership',
        ctaUrl: link,
        footer: `Your gym code is <strong>${escapeHtml(opts.gymCode)}</strong>.`,
      }),
    });
  }

  async sendMemberWelcome(opts: {
    to: string;
    fullName: string;
    gymName: string;
    gymCode: string;
    gymLogoUrl?: string | null;
    gymAccent?: string | null;
  }) {
    await this.send({
      to: opts.to,
      fromName: `${opts.gymName} via FitOps`,
      subject: `You're activated — welcome to ${opts.gymName}!`,
      html: template({
        gym: { name: opts.gymName, logoUrl: opts.gymLogoUrl, accent: opts.gymAccent },
        title: `You're all set, ${escapeHtml(opts.fullName)}!`,
        preheader: `Your membership is active. Download the app to get started.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${escapeHtml(opts.fullName)}</strong>,</p>
          <p style="margin:0 0 16px">
            Your membership at <strong>${escapeHtml(opts.gymName)}</strong> is now active.
            Download the FitOps mobile app and sign in using your gym code below.
          </p>
          <p style="margin:0 0 24px;text-align:center;">
            <span style="display:inline-block;background:#f4f4f5;border-radius:10px;padding:10px 24px;font-size:22px;font-weight:700;letter-spacing:3px;color:#111827;">${escapeHtml(opts.gymCode)}</span>
          </p>
        `,
        ctaLabel: 'Download the App',
        ctaUrl: this.landingUrl,
        footer: `Use code <strong>${escapeHtml(opts.gymCode)}</strong> when signing in on the mobile app.`,
      }),
    });
  }

  async sendWelcome(opts: { to: string; fullName: string; gymName: string; gymCode: string }) {
    await this.send({
      to: opts.to,
      subject: `Welcome to ${opts.gymName} — you're all set!`,
      html: template({
        title: `You're all set, ${escapeHtml(opts.fullName)}!`,
        preheader: `Your account is active. Sign in to start managing your gym.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${escapeHtml(opts.fullName)}</strong>,</p>
          <p style="margin:0 0 16px">
            Your account for <strong>${escapeHtml(opts.gymName)}</strong> is now active.
            Head to FitOps to set up your gym profile, invite members, and get started.
          </p>
        `,
        ctaLabel: 'Open FitOps',
        ctaUrl: this.webUrl,
        footer: `Your gym code is <strong>${escapeHtml(opts.gymCode)}</strong> — you'll need this to sign in.`,
      }),
    });
  }

  async sendRenewalReminder(opts: {
    to: string;
    fullName: string;
    gymName: string;
    amount: string;
    dueAt: string;
  }) {
    await this.send({
      to: opts.to,
      subject: `Upcoming renewal for ${opts.gymName}`,
      html: template({
        title: `Your subscription renews soon`,
        preheader: `${opts.amount} due ${opts.dueAt} for ${escapeHtml(opts.gymName)}.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${escapeHtml(opts.fullName)}</strong>,</p>
          <p style="margin:0 0 16px">
            Your <strong>${escapeHtml(opts.gymName)}</strong> subscription renews on <strong>${opts.dueAt}</strong>
            for <strong>${opts.amount}</strong>. Pay before then to keep your gym running without
            interruption.
          </p>
        `,
        ctaLabel: 'Go to Billing',
        ctaUrl: `${this.webUrl}/dashboard/billing`,
        footer: `Already paid? Submit your reference number from the Billing page and we'll verify it shortly.`,
      }),
    });
  }

  async sendSubscriptionSuspended(opts: { to: string; fullName: string; gymName: string }) {
    await this.send({
      to: opts.to,
      subject: `${opts.gymName} has been suspended — action needed`,
      html: template({
        title: `${escapeHtml(opts.gymName)} is suspended`,
        preheader: `Your subscription payment is overdue — the gym is now locked.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${escapeHtml(opts.fullName)}</strong>,</p>
          <p style="margin:0 0 16px">
            We didn't receive payment for <strong>${escapeHtml(opts.gymName)}</strong>'s renewal within the
            grace period, so the gym has been suspended. Staff and members won't be able to use
            the app until this is resolved.
          </p>
          <p style="margin:0 0 24px">
            Submit your payment reference on the Billing page to reactivate immediately.
          </p>
        `,
        ctaLabel: 'Go to Billing',
        ctaUrl: `${this.webUrl}/dashboard/billing`,
      }),
    });
  }

  // Plain text so visitor input can't inject HTML into the inbox.
  async sendLeadNotification(opts: {
    to: string;
    lead: { ownerName: string; gymName: string; phone: string; email: string; planInterest?: string };
  }) {
    const { lead } = opts;
    try {
      // Resend reports API failures in `error` rather than throwing.
      const { error } = await this.resend.emails.send({
        from: this.sender('FitOps'),
        to: opts.to,
        replyTo: lead.email,
        subject: `New free trial request: ${lead.gymName}`,
        text: [
          `Name: ${lead.ownerName}`,
          `Gym: ${lead.gymName}`,
          `Mobile: ${lead.phone}`,
          `Email: ${lead.email}`,
          `Plan interest: ${lead.planInterest ?? '—'}`,
        ].join('\n'),
      });
      if (error) this.logger.error(`Failed to send lead notification: ${error.name}`);
    } catch (err) {
      // The lead is already saved; a failed notification must not fail the request.
      this.logger.error(`Failed to send lead notification: ${(err as Error).name}`);
    }
  }

  // Quoted so commas, '@' or parentheses in a gym name can't break the From header.
  private sender(name: string): string {
    return `"${name.replace(/["\\\r\n]/g, '')}" <${this.fromAddress}>`;
  }

  /** Returns false if the email was not sent. Never throws, so a failed email can't block the primary flow. */
  private async send(opts: { to: string; subject: string; html: string; fromName?: string }): Promise<boolean> {
    try {
      // Resend reports API failures in `error` rather than throwing.
      const { error } = await this.resend.emails.send({
        from: this.sender(opts.fromName ?? 'FitOps'),
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      if (error) {
        this.logger.error(`Failed to send email to ${opts.to}: ${error.message}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}: ${(err as Error).message}`);
      return false;
    }
  }
}

const NAVY = '#0A2540';
const INK = '#0E1116';
const VOLT = '#CCFF00';
const CODE_BLUE = '#1D4ED8';
const SIGNAL_BLUE = '#3B82F6';

// Built from table cells so it renders where SVG and images are blocked.
function fitOpsLockup(): string {
  const tile = `<td width="12" height="12" style="width:12px;height:12px;background-color:${NAVY};border-radius:3px;font-size:0;line-height:0;">&nbsp;</td>`;
  const dot = `<td width="12" height="12" style="width:12px;height:12px;background-color:${SIGNAL_BLUE};border-radius:6px;font-size:0;line-height:0;">&nbsp;</td>`;
  const gap = `<td width="2" style="width:2px;font-size:0;line-height:0;">&nbsp;</td>`;
  return `<table cellpadding="0" cellspacing="0" role="presentation"><tr>
    <td style="padding-right:10px;vertical-align:middle;">
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>${tile}${gap}${dot}</tr>
        <tr><td colspan="3" height="2" style="height:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>${tile}${gap}${tile}</tr>
      </table>
    </td>
    <td style="vertical-align:middle;font-family:Manrope,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;letter-spacing:-0.4px;color:${NAVY};">
      <span style="font-weight:800;">Fit</span><span style="font-weight:500;">Ops</span>
    </td>
  </tr></table>`;
}

interface GymBrand {
  name: string;
  logoUrl?: string | null;
  accent?: string | null;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gymHeader(gym: GymBrand): string {
  const logo = gym.logoUrl && /^https:\/\//.test(gym.logoUrl)
    ? `<img src="${escapeHtml(gym.logoUrl)}" alt="" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:10px;object-fit:contain;background:#ffffff;" />`
    : '';
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="background-color:${INK};border-radius:12px;"><tr>
    ${logo ? `<td style="padding:12px 0 12px 16px;vertical-align:middle;">${logo}</td>` : ''}
    <td style="padding:12px 20px 12px ${logo ? '12px' : '20px'};vertical-align:middle;color:#ffffff;font-family:Manrope,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.3px;">${escapeHtml(gym.name)}</td>
  </tr></table>`;
}

function template(opts: {
  /** Member emails only. */
  gym?: GymBrand;
  title: string;
  preheader: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer?: string;
}): string {
  const accent = opts.gym ? (normalizeHex(opts.gym.accent) ?? VOLT) : CODE_BLUE;
  const accentText = opts.gym ? onAccent(accent) : '#ffffff';
  const endorsement = opts.gym ? 'Powered by FitOps' : 'FitOps · a VerSolutions product';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${opts.preheader}</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / brand -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              ${opts.gym ? gymHeader(opts.gym) : fitOpsLockup()}
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:40px 40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

              <!-- Title -->
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${opts.title}</h1>

              <!-- Body -->
              <div style="font-size:15px;line-height:1.6;color:#374151;">
                ${opts.body}
              </div>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
                <tr>
                  <td style="background-color:${accent};border-radius:10px;">
                    <a href="${opts.ctaUrl}"
                       style="display:inline-block;padding:14px 28px;color:${accentText};font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:-0.1px;">
                      ${opts.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
                Or paste this link in your browser:<br />
                <a href="${opts.ctaUrl}" style="color:${opts.gym ? '#374151' : CODE_BLUE};word-break:break-all;">${opts.ctaUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer note -->
          ${opts.footer ? `
          <tr>
            <td style="padding:20px 8px 0;text-align:center;font-size:13px;color:#6b7280;">
              ${opts.footer}
            </td>
          </tr>` : ''}

          <!-- Legal footer -->
          <tr>
            <td style="padding:24px 8px 0;text-align:center;font-size:12px;color:#9ca3af;">
              You received this email because an account was created on your behalf.<br />
              If this wasn't you, you can safely ignore this email.
            </td>
          </tr>
          <tr>
            <td style="padding:16px 8px 0;text-align:center;font-size:12px;color:#9ca3af;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;">
              ${endorsement}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
