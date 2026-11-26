import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadsRepository, type CreateSignupRequestInput } from '../../infrastructure/persistence/leads.repository';
import { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import { EmailService } from '../../../../common/email/email.service';
import { TooManyRequestsError } from '../../../../common/errors';

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;

export interface SubmitSignupRequestInput extends CreateSignupRequestInput {
  website?: string;
}

@Injectable()
export class CreateSignupRequestUseCase {
  private readonly logger = new Logger(CreateSignupRequestUseCase.name);

  constructor(
    private readonly repo: LeadsRepository,
    private readonly rateLimiter: RateLimiterService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: SubmitSignupRequestInput, ip: string) {
    const withinLimit = await this.rateLimiter.hit(`signup-request:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!withinLimit) {
      throw new TooManyRequestsError('Too many submissions — please try again later');
    }

    const { website, ...lead } = input;
    if (website) return null;

    const created = await this.repo.create(lead);
    await this.notify(lead);
    return created;
  }

  private async notify(lead: CreateSignupRequestInput) {
    const to = this.config.get<string>('LEADS_NOTIFY_EMAIL');
    if (!to) {
      this.logger.warn('LEADS_NOTIFY_EMAIL is not set; skipping the new lead notification.');
      return;
    }
    await this.email.sendLeadNotification({ to, lead });
  }
}
