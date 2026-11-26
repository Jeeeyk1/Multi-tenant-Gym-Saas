import { CreateSignupRequestUseCase } from './create-signup-request.use-case';
import type { LeadsRepository } from '../../infrastructure/persistence/leads.repository';
import type { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';
import type { EmailService } from '../../../../common/email/email.service';
import type { ConfigService } from '@nestjs/config';

const repo = { create: jest.fn() } as unknown as jest.Mocked<LeadsRepository>;
const rateLimiter = { hit: jest.fn() } as unknown as jest.Mocked<RateLimiterService>;
const email = { sendLeadNotification: jest.fn() } as unknown as jest.Mocked<EmailService>;
const config = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;

const lead = { gymName: 'Test Gym', ownerName: 'Ana Reyes', phone: '0917 000 0000', email: 'ana@example.com' };

describe('CreateSignupRequestUseCase', () => {
  let useCase: CreateSignupRequestUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateSignupRequestUseCase(repo, rateLimiter, email, config);
    rateLimiter.hit.mockResolvedValue(true);
    repo.create.mockResolvedValue({ id: 'lead-1' } as never);
    config.get.mockReturnValue('team@example.com');
  });

  it('saves the lead and notifies the team when within the rate limit', async () => {
    await expect(useCase.execute(lead, '1.2.3.4')).resolves.toEqual({ id: 'lead-1' });
    expect(rateLimiter.hit).toHaveBeenCalledWith('signup-request:1.2.3.4', 5, 3600);
    expect(repo.create).toHaveBeenCalledWith(lead);
    expect(email.sendLeadNotification).toHaveBeenCalledWith({ to: 'team@example.com', lead });
  });

  it('drops honeypot submissions without saving or notifying', async () => {
    await expect(useCase.execute({ ...lead, website: 'http://spam.example' }, '1.2.3.4')).resolves.toBeNull();
    expect(repo.create).not.toHaveBeenCalled();
    expect(email.sendLeadNotification).not.toHaveBeenCalled();
  });

  it('still saves the lead when no notification inbox is configured', async () => {
    config.get.mockReturnValue(undefined);
    await useCase.execute(lead, '1.2.3.4');
    expect(repo.create).toHaveBeenCalledWith(lead);
    expect(email.sendLeadNotification).not.toHaveBeenCalled();
  });

  it('rejects with 429 once the IP is rate-limited', async () => {
    rateLimiter.hit.mockResolvedValue(false);
    await expect(useCase.execute(lead, '1.2.3.4')).rejects.toMatchObject({
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
    });
    expect(repo.create).not.toHaveBeenCalled();
  });
});
