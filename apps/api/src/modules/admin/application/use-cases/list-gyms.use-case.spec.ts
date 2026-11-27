import { ListGymsUseCase } from './list-gyms.use-case';
import type { AdminRepository } from '../../infrastructure/persistence/admin.repository';
import { GymStatus } from '../../../../common/enums';

const mockRepo = { listGyms: jest.fn() } as unknown as jest.Mocked<AdminRepository>;

describe('ListGymsUseCase', () => {
  let useCase: ListGymsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListGymsUseCase(mockRepo);
    mockRepo.listGyms.mockResolvedValue([[{ id: 'gym-1' }], 45] as any);
  });

  it('passes search and status to the repository and returns paging info', async () => {
    const result = await useCase.execute({ page: 2, limit: 20, search: 'iron', status: GymStatus.ACTIVE });

    expect(mockRepo.listGyms).toHaveBeenCalledWith(2, 20, { search: 'iron', status: GymStatus.ACTIVE });
    expect(result).toEqual({ gyms: [{ id: 'gym-1' }], total: 45, page: 2, limit: 20, pages: 3 });
  });

  it('defaults to the first page of 20 with no filters', async () => {
    await useCase.execute();
    expect(mockRepo.listGyms).toHaveBeenCalledWith(1, 20, { search: undefined, status: undefined });
  });
});
