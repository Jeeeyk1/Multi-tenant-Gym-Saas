import { UpdateSignupRequestStatusUseCase } from './update-signup-request-status.use-case';
import type { LeadsRepository } from '../../infrastructure/persistence/leads.repository';
import { SignupRequestStatus } from '../../../../common/enums';

const repo = {
  findById: jest.fn(),
  updateStatus: jest.fn(),
} as unknown as jest.Mocked<LeadsRepository>;

describe('UpdateSignupRequestStatusUseCase', () => {
  let useCase: UpdateSignupRequestStatusUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateSignupRequestStatusUseCase(repo);
  });

  it('marks a NEW request CONTACTED with notes', async () => {
    repo.findById.mockResolvedValue({ id: 'lead-1', status: SignupRequestStatus.NEW } as never);
    repo.updateStatus.mockResolvedValue({ id: 'lead-1', status: SignupRequestStatus.CONTACTED } as never);

    await useCase.execute('lead-1', SignupRequestStatus.CONTACTED, 'Called, interested');

    expect(repo.updateStatus).toHaveBeenCalledWith('lead-1', SignupRequestStatus.CONTACTED, 'Called, interested');
  });

  it('throws when the request does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', SignupRequestStatus.REJECTED)).rejects.toMatchObject({
      code: 'SIGNUP_REQUEST_NOT_FOUND',
    });
  });

  it('refuses to change status once already converted', async () => {
    repo.findById.mockResolvedValue({ id: 'lead-1', status: SignupRequestStatus.CONVERTED } as never);
    await expect(useCase.execute('lead-1', SignupRequestStatus.REJECTED)).rejects.toMatchObject({
      code: 'SIGNUP_REQUEST_ALREADY_CONVERTED',
    });
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});
