import { Module } from '@nestjs/common';
import { BadgesRepository } from './infrastructure/persistence/badges.repository';
import { CheckAutoBadgesUseCase } from './application/use-cases/check-auto-badges.use-case';
import { CheckMilestoneBadgeUseCase } from './application/use-cases/check-milestone-badge.use-case';
import { CloseCycleUseCase } from './application/use-cases/close-cycle.use-case';
import { ListMemberBadgesUseCase } from './application/use-cases/list-member-badges.use-case';
import { CreateCustomBadgeUseCase } from './application/use-cases/create-custom-badge.use-case';
import { CreateMilestoneBadgeUseCase } from './application/use-cases/create-milestone-badge.use-case';
import { AwardCustomBadgeUseCase } from './application/use-cases/award-custom-badge.use-case';
import { ListCustomBadgesUseCase } from './application/use-cases/list-custom-badges.use-case';
import { ListMilestoneBadgesUseCase } from './application/use-cases/list-milestone-badges.use-case';
import { BadgesController } from './presentation/controllers/badges.controller';
import { BadgesService } from './badges.service';

@Module({
  controllers: [BadgesController],
  providers: [
    BadgesRepository,
    CheckAutoBadgesUseCase,
    CheckMilestoneBadgeUseCase,
    CloseCycleUseCase,
    ListMemberBadgesUseCase,
    ListCustomBadgesUseCase,
    ListMilestoneBadgesUseCase,
    CreateCustomBadgeUseCase,
    CreateMilestoneBadgeUseCase,
    AwardCustomBadgeUseCase,
    BadgesService,
  ],
  exports: [BadgesService, CloseCycleUseCase],
})
export class BadgesModule {}
