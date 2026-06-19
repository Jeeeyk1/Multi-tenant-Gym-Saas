import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly webUrl: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = config.get<string>('EMAIL_FROM') ?? 'noreply@gym.noetecha.com';
    this.webUrl = config.get<string>('WEB_URL') ?? 'http://localhost:3000';
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
      subject: `You've been invited to manage ${opts.gymName}`,
      html: template({
        title: `Welcome to ${opts.gymName}!`,
        preheader: `Activate your account and start managing your gym.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${opts.fullName}</strong>,</p>
          <p style="margin:0 0 16px">
            Your gym <strong>${opts.gymName}</strong> has been set up on the platform.
            You're all set to start managing your gym — members, schedules, check-ins, and more.
          </p>
          <p style="margin:0 0 24px">
            Click the button below to activate your account and set your password.
            This link expires in <strong>7 days</strong>.
          </p>
        `,
        ctaLabel: 'Activate My Account',
        ctaUrl: link,
        footer: `Your gym code is <strong>${opts.gymCode}</strong> — you'll need this to sign in.`,
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
          <p style="margin:0 0 16px">Hi <strong>${opts.fullName}</strong>,</p>
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
  }) {
    const link = `${this.webUrl}/member-activate?token=${opts.token}&code=${opts.gymCode}`;
    await this.send({
      to: opts.to,
      subject: `You've been invited to join ${opts.gymName}`,
      html: template({
        title: `Welcome to ${opts.gymName}!`,
        preheader: `Your membership is ready — activate your account to get started.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${opts.fullName}</strong>,</p>
          <p style="margin:0 0 16px">
            You've been added as a member of <strong>${opts.gymName}</strong>.
            Activate your account to access your membership, track check-ins, and more.
          </p>
          <p style="margin:0 0 24px">
            This link expires in <strong>7 days</strong>.
          </p>
        `,
        ctaLabel: 'Activate My Membership',
        ctaUrl: link,
        footer: `Your gym code is <strong>${opts.gymCode}</strong>.`,
      }),
    });
  }

  async sendWelcome(opts: { to: string; fullName: string; gymName: string; gymCode: string }) {
    await this.send({
      to: opts.to,
      subject: `Welcome to ${opts.gymName} — you're all set!`,
      html: template({
        title: `You're all set, ${opts.fullName}!`,
        preheader: `Your account is active. Sign in to start managing your gym.`,
        body: `
          <p style="margin:0 0 16px">Hi <strong>${opts.fullName}</strong>,</p>
          <p style="margin:0 0 16px">
            Your account for <strong>${opts.gymName}</strong> is now active.
            Head to the staff portal to set up your gym profile, invite members, and get started.
          </p>
        `,
        ctaLabel: 'Go to Staff Portal',
        ctaUrl: this.webUrl,
        footer: `Your gym code is <strong>${opts.gymCode}</strong> — you'll need this to sign in.`,
      }),
    });
  }

  private async send(opts: { to: string; subject: string; html: string }) {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
    } catch (err) {
      // Log but don't throw — a failed email should never block the primary flow.
      this.logger.error(`Failed to send email to ${opts.to}: ${(err as Error).message}`);
    }
  }
}

function template(opts: {
  title: string;
  preheader: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer?: string;
}): string {
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
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#6366f1;border-radius:12px;padding:10px 20px;">
                    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">GymSaaS</span>
                  </td>
                </tr>
              </table>
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
                  <td style="background-color:#6366f1;border-radius:10px;">
                    <a href="${opts.ctaUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:-0.1px;">
                      ${opts.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
                Or paste this link in your browser:<br />
                <a href="${opts.ctaUrl}" style="color:#6366f1;word-break:break-all;">${opts.ctaUrl}</a>
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

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
