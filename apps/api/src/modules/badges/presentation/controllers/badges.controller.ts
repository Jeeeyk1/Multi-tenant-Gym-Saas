import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CreateCustomBadgeUseCase } from '../../application/use-cases/create-custom-badge.use-case';
import { CreateMilestoneBadgeUseCase } from '../../application/use-cases/create-milestone-badge.use-case';
import { AwardCustomBadgeUseCase } from '../../application/use-cases/award-custom-badge.use-case';
import { ListMemberBadgesUseCase } from '../../application/use-cases/list-member-badges.use-case';
import { ListCustomBadgesUseCase } from '../../application/use-cases/list-custom-badges.use-case';
import { ListMilestoneBadgesUseCase } from '../../application/use-cases/list-milestone-badges.use-case';
import { CreateCustomBadgeDto } from '../dto/create-custom-badge.dto';
import { CreateMilestoneBadgeDto } from '../dto/create-milestone-badge.dto';
import { AwardCustomBadgeDto } from '../dto/award-custom-badge.dto';
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
  ) {}

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
