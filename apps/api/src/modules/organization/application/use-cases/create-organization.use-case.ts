import { Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../common/errors';
import { OrganizationRepository } from '../../infrastructure/persistence/organization.repository';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerFullName: string;
}

export interface CreateOrganizationResult {
  organizationId: string;
  /** Invite token to be sent to the owner via email. Returned here for MVP. */
  inviteToken: string;
}

@Injectable()
export class CreateOrganizationUseCase {
  constructor(private readonly repo: OrganizationRepository) {}

  async execute(input: CreateOrganizationInput): Promise<CreateOrganizationResult> {
    const slugTaken = await this.repo.findBySlug(input.slug);
    if (slugTaken) {
      throw new ConflictError(
        `Organization slug '${input.slug}' is already taken`,
        'ORG_SLUG_TAKEN',
      );
    }

    const emailTaken = await this.repo.findUserByEmail(input.ownerEmail);
    if (emailTaken) {
      throw new ConflictError(
        'An account with this email already exists',
        'EMAIL_TAKEN',
      );
    }

    return this.repo.createWithOwner(input);
  }
}
