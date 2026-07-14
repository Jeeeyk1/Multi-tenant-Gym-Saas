import { ConvertSignupRequestUseCase } from './convert-signup-request.use-case';
import type { LeadsRepository } from '../../infrastructure/persistence/leads.repository';
import { SignupRequestStatus } from '../../../../common/enums';

const repo = {
  findById: jest.fn(),
  markConverted: jest.fn(),
} as unknown as jest.Mocked<LeadsRepository>;

describe('ConvertSignupRequestUseCase', () => {
  let useCase: ConvertSignupRequestUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ConvertSignupRequestUseCase(repo);
  });

  it('links the created gym and marks the request CONVERTED', async () => {
    repo.findById.mockResolvedValue({ id: 'lead-1', status: SignupRequestStatus.CONTACTED } as never);
    repo.markConverted.mockResolvedValue({ id: 'lead-1', status: SignupRequestStatus.CONVERTED, convertedGymId: 'gym-1' } as never);

    await useCase.execute('lead-1', 'gym-1');

    expect(repo.markConverted).toHaveBeenCalledWith('lead-1', 'gym-1');
  });

  it('throws when the request does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'gym-1')).rejects.toMatchObject({ code: 'SIGNUP_REQUEST_NOT_FOUND' });
  });

  it('is not idempotent — re-converting an already-converted request throws', async () => {
    repo.findById.mockResolvedValue({ id: 'lead-1', status: SignupRequestStatus.CONVERTED } as never);
    await expect(useCase.execute('lead-1', 'gym-2')).rejects.toMatchObject({ code: 'SIGNUP_REQUEST_ALREADY_CONVERTED' });
    expect(repo.markConverted).not.toHaveBeenCalled();
  });
});
