import { Module } from '@nestjs/common';
import { WorkoutsRepository } from './infrastructure/persistence/workouts.repository';
import { LogWorkoutSessionUseCase } from './application/use-cases/log-workout-session.use-case';
import { ListWorkoutSessionsUseCase } from './application/use-cases/list-workout-sessions.use-case';
import { WorkoutsController } from './presentation/controllers/workouts.controller';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsRepository, LogWorkoutSessionUseCase, ListWorkoutSessionsUseCase],
})
export class WorkoutsModule {}
