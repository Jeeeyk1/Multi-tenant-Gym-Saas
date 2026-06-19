import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../../common/email/email.service';
import { ConflictError } from '../../../../common/errors';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

export interface CreateGymClientInput {
  gymName: string;
  gymCode: string;
  ownerEmail: string;
  ownerFullName: string;
}

@Injectable()
export class CreateGymClientUseCase {
  constructor(
    private readonly repo: AdminRepository,
    private readonly email: EmailService,
  ) {}

  async execute(input: CreateGymClientInput) {
    const codeTaken = await this.repo.findGymByCode(input.gymCode);
    if (codeTaken) throw new ConflictError(`Gym code '${input.gymCode}' is already taken`, 'GYM_CODE_TAKEN');

    const emailTaken = await this.repo.findUserByEmail(input.ownerEmail);
    if (emailTaken) throw new ConflictError('An account with this email already exists', 'EMAIL_TAKEN');

    const orgSlug = input.gymName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = orgSlug;
    let attempt = 0;
    while (await this.repo.findOrgBySlug(slug)) {
      attempt++;
      slug = `${orgSlug}-${attempt}`;
    }

    const result = await this.repo.createGymClient({
      orgName: input.gymName,
      orgSlug: slug,
      gymName: input.gymName,
      gymCode: input.gymCode,
      ownerEmail: input.ownerEmail,
      ownerFullName: input.ownerFullName,
    });

    await this.email.sendOwnerInvite({
      to: input.ownerEmail,
      fullName: input.ownerFullName,
      gymName: input.gymName,
      gymCode: input.gymCode,
      token: result.inviteToken,
    });

    return result;
  }
}
