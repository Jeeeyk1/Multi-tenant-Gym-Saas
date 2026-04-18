import { Injectable } from '@nestjs/common';
import { ForbiddenError, ValidationError } from '../../../../common/errors';
import { GymRepository } from '../../infrastructure/persistence/gym.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface ScheduleInput {
  dayOfWeek: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
}

@Injectable()
export class UpdateGymSchedulesUseCase {
  constructor(private readonly repo: GymRepository) {}

  async execute(
    gymId: string,
    schedules: ScheduleInput[],
    caller: AuthenticatedUser,
  ): Promise<void> {
    this.assertAccess(gymId, caller);
    this.validateSchedules(schedules);
    await this.repo.updateSchedules(gymId, schedules);
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
  }

  private validateSchedules(schedules: ScheduleInput[]): void {
    for (const s of schedules) {
      if (s.dayOfWeek < 0 || s.dayOfWeek > 6) {
        throw new ValidationError(
          `dayOfWeek must be 0–6 (got ${s.dayOfWeek})`,
          'INVALID_DAY_OF_WEEK',
        );
      }
    }
  }
}
