import { Module } from '@nestjs/common';
import { AdminController } from './presentation/controllers/admin.controller';
import { AdminRepository } from './infrastructure/persistence/admin.repository';
import { SystemAdminGuard } from './presentation/guards/system-admin.guard';
import { GetPlatformStatsUseCase } from './application/use-cases/get-platform-stats.use-case';
import { ListGymsUseCase } from './application/use-cases/list-gyms.use-case';
import { GetGymDetailUseCase } from './application/use-cases/get-gym-detail.use-case';
import { CreateGymClientUseCase } from './application/use-cases/create-gym-client.use-case';
import { UpdateGymStatusUseCase } from './application/use-cases/update-gym-status.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { ListPlansUseCase } from './application/use-cases/list-plans.use-case';
import { CreatePlanUseCase } from './application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from './application/use-cases/update-plan.use-case';
import { DeletePlanUseCase } from './application/use-cases/delete-plan.use-case';
import { ResendInviteUseCase } from './application/use-cases/resend-invite.use-case';

@Module({
  controllers: [AdminController],
  providers: [
    AdminRepository,
    SystemAdminGuard,
    GetPlatformStatsUseCase,
    ListGymsUseCase,
    GetGymDetailUseCase,
    CreateGymClientUseCase,
    UpdateGymStatusUseCase,
    ListUsersUseCase,
    ListPlansUseCase,
    CreatePlanUseCase,
    UpdatePlanUseCase,
    DeletePlanUseCase,
    ResendInviteUseCase,
  ],
})
export class AdminModule {}
