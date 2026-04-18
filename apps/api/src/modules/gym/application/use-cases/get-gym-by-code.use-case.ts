import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/errors';
import { GymRepository } from '../../infrastructure/persistence/gym.repository';

@Injectable()
export class GetGymByCodeUseCase {
  constructor(private readonly repo: GymRepository) {}

  async execute(code: string) {
    const gym = await this.repo.findByCode(code);
    if (!gym) throw new NotFoundError('Gym not found', 'GYM_NOT_FOUND');
    return gym;
  }
}
