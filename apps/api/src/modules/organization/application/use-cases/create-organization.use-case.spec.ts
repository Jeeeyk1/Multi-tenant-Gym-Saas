import { CreateOrganizationUseCase } from './create-organization.use-case';
import { ConflictError } from '../../../../common/errors';
import type { OrganizationRepository } from '../../infrastructure/persistence/organization.repository';

const mockRepo = {
  findBySlug: jest.fn(),
  findUserByEmail: jest.fn(),
  createWithOwner: jest.fn(),
} as unknown as OrganizationRepository;

const validInput = {
  name: 'Fitlife PH',
  slug: 'fitlife',
  ownerEmail: 'owner@fitlife.com',
  ownerFullName: 'Jake',
};

describe('CreateOrganizationUseCase', () => {
  let useCase: CreateOrganizationUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateOrganizationUseCase(mockRepo);
  });

  it('creates the organization when slug and email are both available', async () => {
    (mockRepo.findBySlug as jest.Mock).mockResolvedValue(null);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);
    (mockRepo.createWithOwner as jest.Mock).mockResolvedValue({
      organizationId: 'org-1',
      inviteToken: 'token-abc',
    });

    const result = await useCase.execute(validInput);

    expect(result.organizationId).toBe('org-1');
    expect(result.inviteToken).toBe('token-abc');
    expect(mockRepo.createWithOwner).toHaveBeenCalledWith(validInput);
  });

  it('throws ConflictError when slug is already taken', async () => {
    (mockRepo.findBySlug as jest.Mock).mockResolvedValue({ id: 'org-existing' });

    await expect(useCase.execute(validInput)).rejects.toThrow(ConflictError);
    expect(mockRepo.findUserByEmail).not.toHaveBeenCalled();
    expect(mockRepo.createWithOwner).not.toHaveBeenCalled();
  });

  it('throws ConflictError when owner email is already taken', async () => {
    (mockRepo.findBySlug as jest.Mock).mockResolvedValue(null);
    (mockRepo.findUserByEmail as jest.Mock).mockResolvedValue({ id: 'user-existing' });

    await expect(useCase.execute(validInput)).rejects.toThrow(ConflictError);
    expect(mockRepo.createWithOwner).not.toHaveBeenCalled();
  });
});
