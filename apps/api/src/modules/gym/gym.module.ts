import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/adapters/storage/storage.module';
import { GymController } from './presentation/controllers/gym.controller';
import { CreateGymUseCase } from './application/use-cases/create-gym.use-case';
import { GetGymByCodeUseCase } from './application/use-cases/get-gym-by-code.use-case';
import { GetGymUseCase } from './application/use-cases/get-gym.use-case';
import { UpdateGymProfileUseCase } from './application/use-cases/update-gym-profile.use-case';
import { UpdateGymSchedulesUseCase } from './application/use-cases/update-gym-schedules.use-case';
import { GymRepository } from './infrastructure/persistence/gym.repository';

@Module({
  imports: [StorageModule],
  controllers: [GymController],
  providers: [
    GymRepository,
    CreateGymUseCase,
    GetGymByCodeUseCase,
    GetGymUseCase,
    UpdateGymProfileUseCase,
    UpdateGymSchedulesUseCase,
  ],
})
export class GymModule {}
