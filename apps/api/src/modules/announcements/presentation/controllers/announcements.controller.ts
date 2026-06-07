import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CreateAnnouncementUseCase } from '../../application/use-cases/create-announcement.use-case';
import { UpdateAnnouncementUseCase } from '../../application/use-cases/update-announcement.use-case';
import { ArchiveAnnouncementUseCase } from '../../application/use-cases/archive-announcement.use-case';
import { ListAnnouncementsUseCase } from '../../application/use-cases/list-announcements.use-case';
import { MarkAnnouncementReadUseCase } from '../../application/use-cases/mark-announcement-read.use-case';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';
import { ListAnnouncementsQueryDto } from '../dto/list-announcements-query.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(
    private readonly createAnnouncementUseCase: CreateAnnouncementUseCase,
    private readonly updateAnnouncementUseCase: UpdateAnnouncementUseCase,
    private readonly archiveAnnouncementUseCase: ArchiveAnnouncementUseCase,
    private readonly listAnnouncementsUseCase: ListAnnouncementsUseCase,
    private readonly markAnnouncementReadUseCase: MarkAnnouncementReadUseCase,
  ) {}

  /**
   * POST /gyms/:gymId/announcements
   * Create an announcement. Requires announcements.manage permission.
   * publish_at null/past → PUBLISHED; future → SCHEDULED.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('gymId') gymId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createAnnouncementUseCase.execute(
      gymId,
      {
        title: dto.title!,
        content: dto.content!,
        isPinned: dto.isPinned,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      user,
    );
  }

  /**
   * PATCH /gyms/:gymId/announcements/:id
   * Update an announcement. Requires announcements.manage permission.
   * Cannot update EXPIRED or ARCHIVED announcements.
   */
  @Patch(':id')
  update(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateAnnouncementUseCase.execute(
      gymId,
      id,
      {
        title: dto.title,
        content: dto.content,
        isPinned: dto.isPinned,
        ...(dto.publishAt !== undefined
          ? { publishAt: dto.publishAt ? new Date(dto.publishAt) : null }
          : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
      },
      user,
    );
  }

  /**
   * DELETE /gyms/:gymId/announcements/:id
   * Archive an announcement. Requires announcements.manage permission.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  archive(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.archiveAnnouncementUseCase.execute(gymId, id, user);
  }

  /**
   * GET /gyms/:gymId/announcements
   * List announcements. Staff with announcements.manage see all statuses.
   * Members without that permission see only PUBLISHED.
   */
  @Get()
  list(
    @Param('gymId') gymId: string,
    @Query() query: ListAnnouncementsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listAnnouncementsUseCase.execute(gymId, user, query.status);
  }

  /**
   * POST /gyms/:gymId/announcements/:id/read
   * Mark a PUBLISHED announcement as read by the caller.
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.markAnnouncementReadUseCase.execute(gymId, id, user);
  }
}
