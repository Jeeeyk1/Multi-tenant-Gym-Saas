import { GetCheckinsTrendUseCase } from './get-checkins-trend.use-case';
import type { ReportsRepository } from '../../infrastructure/persistence/reports.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

const mockRepo = {
  getCheckinsTrend: jest.fn(),
} as unknown as jest.Mocked<ReportsRepository>;

const ownerCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'owner-1',
  gymId: 'gym-1',
  roles: ['GYM_OWNER'],
  permissions: ['reports.view'],
};

const frontDeskCaller: AuthenticatedUser = {
  type: 'gym',
  sub: 'staff-1',
  gymId: 'gym-1',
  roles: ['FRONT_DESK'],
  permissions: ['checkins.manage'],
};

describe('GetCheckinsTrendUseCase', () => {
  let useCase: GetCheckinsTrendUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetCheckinsTrendUseCase(mockRepo);
    mockRepo.getCheckinsTrend.mockResolvedValue([
      { date: new Date('2026-06-24T00:00:00Z'), count: 3 },
      { date: new Date('2026-06-25T00:00:00Z'), count: 0 },
    ]);
  });

  it('returns zero-filled, date-formatted trend points for a caller with reports.view', async () => {
    const result = await useCase.execute('gym-1', 7, ownerCaller);
    expect(mockRepo.getCheckinsTrend).toHaveBeenCalledWith('gym-1', 7);
    expect(result).toEqual([
      { date: '2026-06-24', count: 3 },
      { date: '2026-06-25', count: 0 },
    ]);
  });

  it('throws ForbiddenError when caller lacks reports.view', async () => {
    await expect(useCase.execute('gym-1', 7, frontDeskCaller)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('throws ForbiddenError when gym-level caller targets another gym', async () => {
    await expect(useCase.execute('gym-2', 7, ownerCaller)).rejects.toMatchObject({
      code: 'GYM_ACCESS_DENIED',
    });
  });
});
