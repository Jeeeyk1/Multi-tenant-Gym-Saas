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
import { EquipBadgeUseCase } from './application/use-cases/equip-badge.use-case';
import { ListEquippedBadgesUseCase } from './application/use-cases/list-equipped-badges.use-case';
import { GetBadgeCollectionUseCase } from './application/use-cases/get-badge-collection.use-case';
import { MarkBadgesSeenUseCase } from './application/use-cases/mark-badges-seen.use-case';
import { ListLaddersUseCase } from './application/use-cases/list-ladders.use-case';
import { SaveLadderUseCase } from './application/use-cases/save-ladder.use-case';
import { BadgeNotifier } from './application/badge-notifier';
import { LadderService } from './application/ladder.service';
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
    EquipBadgeUseCase,
    ListEquippedBadgesUseCase,
    GetBadgeCollectionUseCase,
    MarkBadgesSeenUseCase,
    ListLaddersUseCase,
    SaveLadderUseCase,
    BadgeNotifier,
    LadderService,
    BadgesService,
  ],
  exports: [BadgesService, CloseCycleUseCase],
})
export class BadgesModule {}
