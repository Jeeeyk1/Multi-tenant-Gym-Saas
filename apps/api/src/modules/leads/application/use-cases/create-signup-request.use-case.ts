import { Injectable } from '@nestjs/common';
import { LeadsRepository, type CreateSignupRequestInput } from '../../infrastructure/persistence/leads.repository';
import { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import { TooManyRequestsError } from '../../../../common/errors';

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;

@Injectable()
export class CreateSignupRequestUseCase {
  constructor(
    private readonly repo: LeadsRepository,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async execute(input: CreateSignupRequestInput, ip: string) {
    const withinLimit = await this.rateLimiter.hit(`signup-request:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (!withinLimit) {
      throw new TooManyRequestsError('Too many submissions — please try again later');
    }

    return this.repo.create(input);
  }
}
