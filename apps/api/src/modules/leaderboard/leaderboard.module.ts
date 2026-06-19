import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/adapters/storage/storage.module';
import { BadgesModule } from '../badges/badges.module';
import { LeaderboardController } from './presentation/controllers/leaderboard.controller';
import { LeaderboardRepository } from './infrastructure/persistence/leaderboard.repository';
import { ListExercisesUseCase } from './application/use-cases/list-exercises.use-case';
import { AddGymExerciseUseCase } from './application/use-cases/add-gym-exercise.use-case';
import { GetLeaderboardConfigUseCase } from './application/use-cases/get-leaderboard-config.use-case';
import { UpdateLeaderboardConfigUseCase } from './application/use-cases/update-leaderboard-config.use-case';
import { UploadPrPhotoUseCase } from './application/use-cases/upload-pr-photo.use-case';
import { SubmitPrUseCase } from './application/use-cases/submit-pr.use-case';
import { ListPendingSubmissionsUseCase } from './application/use-cases/list-pending-submissions.use-case';
import { ApproveSubmissionUseCase } from './application/use-cases/approve-submission.use-case';
import { RejectSubmissionUseCase } from './application/use-cases/reject-submission.use-case';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { GetMyPrsUseCase } from './application/use-cases/get-my-prs.use-case';

@Module({
  imports: [StorageModule, BadgesModule],
  controllers: [LeaderboardController],
  providers: [
    LeaderboardRepository,
    ListExercisesUseCase,
    AddGymExerciseUseCase,
    GetLeaderboardConfigUseCase,
    UpdateLeaderboardConfigUseCase,
    UploadPrPhotoUseCase,
    SubmitPrUseCase,
    ListPendingSubmissionsUseCase,
    ApproveSubmissionUseCase,
    RejectSubmissionUseCase,
    GetLeaderboardUseCase,
    GetMyPrsUseCase,
  ],
})
export class LeaderboardModule {}
