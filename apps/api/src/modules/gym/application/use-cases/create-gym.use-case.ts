import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { generateGymCode, generateFallbackCode } from '../../domain/gym-code.generator';
import { GymRepository } from '../../infrastructure/persistence/gym.repository';
import type { OrgAuthUser } from '../../../../common/types/auth.types';

export interface CreateGymInput {
  name: string;
  timezone?: string;
  address?: string;
  city?: string;
  country?: string;
}

const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class CreateGymUseCase {
  constructor(private readonly repo: GymRepository) {}

  async execute(input: CreateGymInput, caller: OrgAuthUser) {
    if (caller.type !== 'org') {
      throw new ForbiddenError(
        'Only organization-level users can create gyms',
        'ORG_LEVEL_REQUIRED',
      );
    }

    const code = await this.generateUniqueCode(input.name);

    const gym = await this.repo.createWithDefaults({
      organizationId: caller.organizationId,
      name: input.name,
      code,
      timezone: input.timezone,
      address: input.address,
      city: input.city,
      country: input.country,
    });

    return gym;
  }

  private async generateUniqueCode(gymName: string): Promise<string> {
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      const code = generateGymCode(gymName);
      const taken = await this.repo.isCodeTaken(code);
      if (!taken) return code;
    }

    // All name-based attempts collided — use a fully random code
    const fallback = generateFallbackCode();
    const fallbackTaken = await this.repo.isCodeTaken(fallback);
    if (!fallbackTaken) return fallback;

    // Extremely unlikely but guard anyway
    throw new Error('Failed to generate a unique gym code. Please try again.');
  }
}
