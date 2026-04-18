import { Injectable } from '@nestjs/common';
import { NotFoundError, ForbiddenError } from '../../../../common/errors';
import { OrganizationRepository } from '../../infrastructure/persistence/organization.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class GetOrganizationUseCase {
  constructor(private readonly repo: OrganizationRepository) {}

  async execute(slug: string, caller: AuthenticatedUser) {
    const org = await this.repo.findBySlug(slug);
    if (!org) throw new NotFoundError('Organization not found', 'ORG_NOT_FOUND');

    // Org-level callers can only see their own org
    if (caller.type === 'org' && caller.organizationId !== org.id) {
      throw new ForbiddenError('Access denied', 'ORG_ACCESS_DENIED');
    }

    return org;
  }
}
