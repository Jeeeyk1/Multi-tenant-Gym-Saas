import { ListUsersUseCase } from './list-users.use-case';
import type { AdminRepository } from '../../infrastructure/persistence/admin.repository';

const mockRepo = { listUsers: jest.fn() } as unknown as jest.Mocked<AdminRepository>;

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListUsersUseCase(mockRepo);
    mockRepo.listUsers.mockResolvedValue([[{ id: 'user-1' }], 21] as any);
  });

  it('passes search and gym to the repository and returns paging info', async () => {
    const result = await useCase.execute({ page: 1, limit: 20, search: 'ana@', gymId: 'gym-1' });

    expect(mockRepo.listUsers).toHaveBeenCalledWith(1, 20, { search: 'ana@', gymId: 'gym-1' });
    expect(result).toEqual({ users: [{ id: 'user-1' }], total: 21, page: 1, limit: 20, pages: 2 });
  });
});
