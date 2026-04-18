import { CreateGymUseCase } from './create-gym.use-case';
import { ForbiddenError } from '../../../../common/errors';
import type { GymRepository } from '../../infrastructure/persistence/gym.repository';
import type { OrgAuthUser, GymAuthUser } from '../../../../common/types/auth.types';

const mockRepo = {
  isCodeTaken: jest.fn(),
  createWithDefaults: jest.fn(),
} as unknown as GymRepository;

const orgCaller: OrgAuthUser = {
  sub: 'user-1',
  type: 'org',
  organizationId: 'org-1',
  orgRole: 'OWNER',
};

const gymCaller: GymAuthUser = {
  sub: 'user-2',
  type: 'gym',
  gymId: 'gym-1',
  roles: ['MANAGER'],
  permissions: ['gym.settings'],
};

const validInput = { name: 'Iron Gym Manila' };

describe('CreateGymUseCase', () => {
  let useCase: CreateGymUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateGymUseCase(mockRepo);
  });

  it('creates a gym when called with a valid org-level token', async () => {
    (mockRepo.isCodeTaken as jest.Mock).mockResolvedValue(false);
    (mockRepo.createWithDefaults as jest.Mock).mockResolvedValue({
      id: 'gym-new',
      name: 'Iron Gym Manila',
      code: 'RNGMMNL2K9PX',
      organizationId: 'org-1',
    });

    const result = await useCase.execute(validInput, orgCaller);

    expect(result.id).toBe('gym-new');
    expect(mockRepo.createWithDefaults).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', name: 'Iron Gym Manila' }),
    );
  });

  it('throws ForbiddenError when called with a gym-level token', async () => {
    await expect(
      useCase.execute(validInput, gymCaller as unknown as OrgAuthUser),
    ).rejects.toThrow(ForbiddenError);

    expect(mockRepo.createWithDefaults).not.toHaveBeenCalled();
  });

  it('retries code generation on collision and succeeds on second attempt', async () => {
    (mockRepo.isCodeTaken as jest.Mock)
      .mockResolvedValueOnce(true)   // first attempt collides
      .mockResolvedValueOnce(false); // second attempt succeeds
    (mockRepo.createWithDefaults as jest.Mock).mockResolvedValue({
      id: 'gym-2',
      name: 'Iron Gym Manila',
      code: 'RNGMMNL9X3YZ',
      organizationId: 'org-1',
    });

    const result = await useCase.execute(validInput, orgCaller);

    expect(result.id).toBe('gym-2');
    expect(mockRepo.isCodeTaken).toHaveBeenCalledTimes(2);
  });

  it('the generated code is passed to createWithDefaults', async () => {
    (mockRepo.isCodeTaken as jest.Mock).mockResolvedValue(false);
    (mockRepo.createWithDefaults as jest.Mock).mockResolvedValue({
      id: 'gym-3',
      name: 'Iron Gym Manila',
      code: 'RNGMM2345678',
      organizationId: 'org-1',
    });

    await useCase.execute(validInput, orgCaller);

    const callArg = (mockRepo.createWithDefaults as jest.Mock).mock.calls[0][0];
    expect(typeof callArg.code).toBe('string');
    expect(callArg.code).toHaveLength(12);
  });
});
