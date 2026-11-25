import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CreateCustomBadgeUseCase } from '../../application/use-cases/create-custom-badge.use-case';
import { CreateMilestoneBadgeUseCase } from '../../application/use-cases/create-milestone-badge.use-case';
import { AwardCustomBadgeUseCase } from '../../application/use-cases/award-custom-badge.use-case';
import { ListMemberBadgesUseCase } from '../../application/use-cases/list-member-badges.use-case';
import { ListCustomBadgesUseCase } from '../../application/use-cases/list-custom-badges.use-case';
import { ListMilestoneBadgesUseCase } from '../../application/use-cases/list-milestone-badges.use-case';
import { EquipBadgeUseCase } from '../../application/use-cases/equip-badge.use-case';
import { ListEquippedBadgesUseCase } from '../../application/use-cases/list-equipped-badges.use-case';
import { GetBadgeCollectionUseCase } from '../../application/use-cases/get-badge-collection.use-case';
import { MarkBadgesSeenUseCase } from '../../application/use-cases/mark-badges-seen.use-case';
import { ListLaddersUseCase } from '../../application/use-cases/list-ladders.use-case';
import { SaveLadderUseCase } from '../../application/use-cases/save-ladder.use-case';
import { MarkBadgesSeenDto } from '../dto/mark-badges-seen.dto';
import { SaveLadderDto } from '../dto/save-ladder.dto';
import { CreateCustomBadgeDto } from '../dto/create-custom-badge.dto';
import { CreateMilestoneBadgeDto } from '../dto/create-milestone-badge.dto';
import { AwardCustomBadgeDto } from '../dto/award-custom-badge.dto';
import { EquipBadgeDto } from '../dto/equip-badge.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId')
@UseGuards(JwtAuthGuard)
export class BadgesController {
  constructor(
    private readonly createCustomBadgeUseCase: CreateCustomBadgeUseCase,
    private readonly createMilestoneBadgeUseCase: CreateMilestoneBadgeUseCase,
    private readonly awardCustomBadgeUseCase: AwardCustomBadgeUseCase,
    private readonly listMemberBadgesUseCase: ListMemberBadgesUseCase,
    private readonly listCustomBadgesUseCase: ListCustomBadgesUseCase,
    private readonly listMilestoneBadgesUseCase: ListMilestoneBadgesUseCase,
    private readonly equipBadgeUseCase: EquipBadgeUseCase,
    private readonly listEquippedBadgesUseCase: ListEquippedBadgesUseCase,
    private readonly getBadgeCollectionUseCase: GetBadgeCollectionUseCase,
    private readonly markBadgesSeenUseCase: MarkBadgesSeenUseCase,
    private readonly listLaddersUseCase: ListLaddersUseCase,
    private readonly saveLadderUseCase: SaveLadderUseCase,
  ) {}

  /** GET .../members/:memberId/badges/collection — every badge, earned or locked, with progress. */
  @Get('members/:memberId/badges/collection')
  getCollection(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.getBadgeCollectionUseCase.execute(gymId, memberId, caller);
  }

  /** POST .../badges/my/seen — the member has seen the celebration for these badges. */
  @Post('badges/my/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  markSeen(@Param('gymId') gymId: string, @Body() dto: MarkBadgesSeenDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.markBadgesSeenUseCase.execute(gymId, dto.badgeIds, caller);
  }

  /** GET .../badges/ladders — leaderboard lifts and their bronze/silver/gold weights. */
  @Get('badges/ladders')
  listLadders(@Param('gymId') gymId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.listLaddersUseCase.execute(gymId, caller);
  }

  /** PUT .../badges/ladders/:exerciseId — set a lift's ladder weights, or switch it off. */
  @Put('badges/ladders/:exerciseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  saveLadder(
    @Param('gymId') gymId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: SaveLadderDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    const weights =
      dto.bronzeKg !== undefined && dto.silverKg !== undefined && dto.goldKg !== undefined
        ? { BRONZE: dto.bronzeKg, SILVER: dto.silverKg, GOLD: dto.goldKg }
        : undefined;
    return this.saveLadderUseCase.execute(gymId, exerciseId, { enabled: dto.enabled, weights }, caller);
  }

  @Get('badges/custom')
  listCustomBadges(@Param('gymId') gymId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.listCustomBadgesUseCase.execute(gymId, caller);
  }

  @Get('badges/milestone')
  listMilestoneBadges(@Param('gymId') gymId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.listMilestoneBadgesUseCase.execute(gymId, caller);
  }

  @Get('badges/my')
  getMyBadges(@Param('gymId') gymId: string, @CurrentUser() caller: AuthenticatedUser) {
    return this.listMemberBadgesUseCase.executeForSelf(gymId, caller);
  }

  /**
   * GET /gyms/:gymId/badges/equipped
   * Each user's equipped badges (up to three) in this gym, for chat, leaderboard and
   * Who's Here. `badge` (the first one) is kept for app versions before Badges v2.
   */
  @Get('badges/equipped')
  listEquippedBadges(
    @Param('gymId') gymId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.listEquippedBadgesUseCase.execute(gymId, caller);
  }

  /**
   * PATCH /gyms/:gymId/badges/my/:badgeId
   * Equip or unequip one of the caller's own badges. Equipping unequips the other
   * badge in the same category (one per category).
   */
  @Patch('badges/my/:badgeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  equipBadge(
    @Param('gymId') gymId: string,
    @Param('badgeId') badgeId: string,
    @Body() dto: EquipBadgeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.equipBadgeUseCase.execute(gymId, badgeId, dto.equipped, caller);
  }

  @Get('members/:memberId/badges')
  getMemberBadges(
    @Param('gymId') gymId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.listMemberBadgesUseCase.execute(gymId, memberId, caller);
  }

  @Post('badges/custom')
  @HttpCode(HttpStatus.CREATED)
  createCustomBadge(
    @Param('gymId') gymId: string,
    @Body() dto: CreateCustomBadgeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.createCustomBadgeUseCase.execute(gymId, dto, caller);
  }

  @Post('badges/milestone')
  @HttpCode(HttpStatus.CREATED)
  createMilestoneBadge(
    @Param('gymId') gymId: string,
    @Body() dto: CreateMilestoneBadgeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.createMilestoneBadgeUseCase.execute(gymId, dto, caller);
  }

  @Post('badges/award')
  @HttpCode(HttpStatus.CREATED)
  awardCustomBadge(
    @Param('gymId') gymId: string,
    @Body() dto: AwardCustomBadgeDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.awardCustomBadgeUseCase.execute(gymId, dto, caller);
  }
}
