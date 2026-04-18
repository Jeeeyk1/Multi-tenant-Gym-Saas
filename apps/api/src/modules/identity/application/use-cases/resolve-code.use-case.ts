import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { IdentityRepository } from '../../infrastructure/persistence/identity.repository';

export interface ResolveCodeResult {
  type: 'ORGANIZATION' | 'GYM';
  name: string;
  slug?: string;
  code?: string;
}

@Injectable()
export class ResolveCodeUseCase {
  constructor(private readonly repo: IdentityRepository) {}

  async execute(code: string): Promise<ResolveCodeResult> {
    // Check organizations first (slug match)
    const org = await this.repo.findOrgBySlug(code);
    if (org) {
      return { type: 'ORGANIZATION', name: org.name, slug: org.slug };
    }

    // Check gyms (code match — always uppercase)
    const gym = await this.repo.findGymByCode(code);
    if (gym) {
      return { type: 'GYM', name: gym.name, code: gym.code };
    }

    throw new NotFoundError('Code not found');
  }
}
