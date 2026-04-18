import { ResolveCodeUseCase } from './resolve-code.use-case';
import { NotFoundError } from '../../../../common/errors';
import type { IdentityRepository } from '../../infrastructure/persistence/identity.repository';

const mockRepo = {
  findOrgBySlug: jest.fn(),
  findGymByCode: jest.fn(),
} as unknown as IdentityRepository;

describe('ResolveCodeUseCase', () => {
  let useCase: ResolveCodeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ResolveCodeUseCase(mockRepo);
  });

  it('returns ORGANIZATION when org slug matches', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue({
      id: 'org-1',
      name: 'Fitlife PH',
      slug: 'fitlife',
    });

    const result = await useCase.execute('fitlife');

    expect(result).toEqual({ type: 'ORGANIZATION', name: 'Fitlife PH', slug: 'fitlife' });
    expect(mockRepo.findGymByCode).not.toHaveBeenCalled();
  });

  it('returns GYM when gym code matches (org check fails first)', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(null);
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue({
      id: 'gym-1',
      name: 'Fitlife Manila',
      code: 'FITMNL',
    });

    const result = await useCase.execute('FITMNL');

    expect(result).toEqual({ type: 'GYM', name: 'Fitlife Manila', code: 'FITMNL' });
  });

  it('throws NotFoundError when code matches neither org nor gym', async () => {
    (mockRepo.findOrgBySlug as jest.Mock).mockResolvedValue(null);
    (mockRepo.findGymByCode as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('UNKNOWN')).rejects.toThrow(NotFoundError);
  });
});
