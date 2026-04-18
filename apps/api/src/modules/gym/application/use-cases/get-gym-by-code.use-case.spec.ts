import { GetGymByCodeUseCase } from './get-gym-by-code.use-case';
import { NotFoundError } from '../../../../common/errors';
import type { GymRepository } from '../../infrastructure/persistence/gym.repository';

const mockRepo = {
  findByCode: jest.fn(),
} as unknown as GymRepository;

describe('GetGymByCodeUseCase', () => {
  let useCase: GetGymByCodeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetGymByCodeUseCase(mockRepo);
  });

  it('returns gym info when code exists', async () => {
    const gym = { id: 'gym-1', name: 'Iron Gym', code: 'RNGYM2K9PX1Q', status: 'ACTIVE' };
    (mockRepo.findByCode as jest.Mock).mockResolvedValue(gym);

    const result = await useCase.execute('RNGYM2K9PX1Q');

    expect(result).toEqual(gym);
  });

  it('throws NotFoundError when code does not exist', async () => {
    (mockRepo.findByCode as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('UNKNOWN123456')).rejects.toThrow(NotFoundError);
  });
});
