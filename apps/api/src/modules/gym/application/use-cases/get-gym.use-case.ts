import { Injectable } from '@nestjs/common';
import { NotFoundError, ForbiddenError } from '../../../../common/errors';
import { GymRepository } from '../../infrastructure/persistence/gym.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class GetGymUseCase {
  constructor(private readonly repo: GymRepository) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    const gym = await this.repo.findById(gymId);
    if (!gym) throw new NotFoundError('Gym not found', 'GYM_NOT_FOUND');

    // Gym-level callers can only access their own gym
    if (caller.type === 'gym' && caller.gymId !== gymId) {
      throw new ForbiddenError('Access denied', 'GYM_ACCESS_DENIED');
    }

    return gym;
  }
}
