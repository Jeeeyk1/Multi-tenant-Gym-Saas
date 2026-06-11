import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ForbiddenError } from '../../../../common/errors';
import { STORAGE_PORT } from '../../../../common/adapters/storage/storage.port';
import type { StoragePort } from '../../../../common/adapters/storage/storage.port';
import { CreateGymUseCase } from '../../application/use-cases/create-gym.use-case';
import { GetGymByCodeUseCase } from '../../application/use-cases/get-gym-by-code.use-case';
import { GetGymUseCase } from '../../application/use-cases/get-gym.use-case';
import { UpdateGymProfileUseCase } from '../../application/use-cases/update-gym-profile.use-case';
import { UpdateGymSchedulesUseCase } from '../../application/use-cases/update-gym-schedules.use-case';
import { CreateGymDto } from '../dto/create-gym.dto';
import { UpdateGymProfileDto } from '../dto/update-gym-profile.dto';
import { UpdateGymSchedulesDto } from '../dto/update-gym-schedules.dto';
import type { AuthenticatedUser, OrgAuthUser } from '../../../../common/types/auth.types';

@Controller('gyms')
export class GymController {
  constructor(
    private readonly createGymUseCase: CreateGymUseCase,
    private readonly getGymByCodeUseCase: GetGymByCodeUseCase,
    private readonly getGymUseCase: GetGymUseCase,
    private readonly updateGymProfileUseCase: UpdateGymProfileUseCase,
    private readonly updateGymSchedulesUseCase: UpdateGymSchedulesUseCase,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  /**
   * POST /gyms
   * Org-level only. Creates a gym under the caller's organization.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateGymDto, @CurrentUser() user: AuthenticatedUser) {
    return this.createGymUseCase.execute(dto, user as OrgAuthUser);
  }

  /**
   * GET /gyms/:code
   * Public. Returns basic gym info for a given gym code.
   */
  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.getGymByCodeUseCase.execute(code);
  }

  /**
   * GET /gyms/:id/detail
   * Authenticated. Returns full gym details including profile and schedules.
   */
  @Get(':id/detail')
  @UseGuards(JwtAuthGuard)
  getDetail(@Param('id') gymId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getGymUseCase.execute(gymId, user);
  }

  /**
   * PATCH /gyms/:id/profile
   * Requires JwtAuthGuard. Org-level or gym-level with gym.settings permission.
   */
  @Patch(':id/profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Param('id') gymId: string,
    @Body() dto: UpdateGymProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateGymProfileUseCase.execute(gymId, dto, user);
  }

  /**
   * POST /gyms/:id/profile/logo
   * Accepts a multipart/form-data file field named "file".
   * Uploads to cloud storage and returns { url }.
   */
  @Post(':id/profile/logo')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadLogo(
    @Param('id') gymId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.type === 'gym') {
      if (user.gymId !== gymId) {
        throw new ForbiddenError('Access denied', 'GYM_ACCESS_DENIED');
      }
      if (!user.permissions.includes('gym.settings')) {
        throw new ForbiddenError('gym.settings permission required', 'PERMISSION_DENIED');
      }
    }
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.storage.uploadImage(file.buffer, {
      folder: 'gym-saas/logos',
      publicId: `gym-${gymId}-logo`,
    });
    return { url: result.url };
  }

  /**
   * PATCH /gyms/:id/schedules
   * Requires JwtAuthGuard. Org-level or gym-level with gym.settings permission.
   */
  @Patch(':id/schedules')
  @UseGuards(JwtAuthGuard)
  updateSchedules(
    @Param('id') gymId: string,
    @Body() dto: UpdateGymSchedulesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateGymSchedulesUseCase.execute(gymId, dto.schedules, user);
  }
}
