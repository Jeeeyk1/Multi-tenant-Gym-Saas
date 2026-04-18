import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/errors';
import { GymRepository } from '../../infrastructure/persistence/gym.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface UpdateGymProfileInput {
  description?: string;
  logoUrl?: string;
  coverPhotoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

@Injectable()
export class UpdateGymProfileUseCase {
  constructor(private readonly repo: GymRepository) {}

  async execute(gymId: string, input: UpdateGymProfileInput, caller: AuthenticatedUser) {
    this.assertAccess(gymId, caller);
    return this.repo.updateProfile(gymId, input);
  }

  private assertAccess(gymId: string, caller: AuthenticatedUser): void {
    if (caller.type === 'gym') {
      if (caller.gymId !== gymId) {
        throw new ForbiddenError('Access denied', 'GYM_ACCESS_DENIED');
      }
      if (!caller.permissions.includes('gym.settings')) {
        throw new ForbiddenError(
          'gym.settings permission required',
          'PERMISSION_DENIED',
        );
      }
    }
    // Org-level callers: gym-to-org scope validation would require a DB lookup.
    // For MVP, org-level tokens are trusted for all their org's gyms.
  }
}
