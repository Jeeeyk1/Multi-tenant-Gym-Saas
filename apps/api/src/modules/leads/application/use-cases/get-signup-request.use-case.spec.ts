import { GetSignupRequestUseCase } from './get-signup-request.use-case';
import type { LeadsRepository } from '../../infrastructure/persistence/leads.repository';

const repo = { findById: jest.fn() } as unknown as jest.Mocked<LeadsRepository>;

describe('GetSignupRequestUseCase', () => {
  let useCase: GetSignupRequestUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetSignupRequestUseCase(repo);
  });

  it('returns the signup request when found', async () => {
    repo.findById.mockResolvedValue({ id: 'lead-1' } as never);
    await expect(useCase.execute('lead-1')).resolves.toEqual({ id: 'lead-1' });
  });

  it('throws when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toMatchObject({ code: 'SIGNUP_REQUEST_NOT_FOUND' });
  });
});
