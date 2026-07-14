import { CreateSignupRequestUseCase } from './create-signup-request.use-case';
import type { LeadsRepository } from '../../infrastructure/persistence/leads.repository';
import type { RateLimiterService } from '../../../../common/rate-limiter/rate-limiter.service';

const repo = { create: jest.fn() } as unknown as jest.Mocked<LeadsRepository>;
const rateLimiter = { hit: jest.fn() } as unknown as jest.Mocked<RateLimiterService>;

describe('CreateSignupRequestUseCase', () => {
  let useCase: CreateSignupRequestUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateSignupRequestUseCase(repo, rateLimiter);
    rateLimiter.hit.mockResolvedValue(true);
    repo.create.mockResolvedValue({ id: 'lead-1' } as never);
  });

  it('creates a signup request when within the rate limit', async () => {
    const input = { gymName: 'Iron Paradise', ownerName: 'Juan', email: 'juan@example.com' };
    await useCase.execute(input, '1.2.3.4');
    expect(rateLimiter.hit).toHaveBeenCalledWith('signup-request:1.2.3.4', 5, 3600);
    expect(repo.create).toHaveBeenCalledWith(input);
  });

  it('rejects with 429 once the IP is rate-limited', async () => {
    rateLimiter.hit.mockResolvedValue(false);
    const input = { gymName: 'Iron Paradise', ownerName: 'Juan', email: 'juan@example.com' };
    await expect(useCase.execute(input, '1.2.3.4')).rejects.toMatchObject({
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
    });
    expect(repo.create).not.toHaveBeenCalled();
  });
});
