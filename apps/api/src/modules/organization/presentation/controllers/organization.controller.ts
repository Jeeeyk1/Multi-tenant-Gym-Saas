import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CreateOrganizationUseCase } from '../../application/use-cases/create-organization.use-case';
import { GetOrganizationUseCase } from '../../application/use-cases/get-organization.use-case';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly createOrganization: CreateOrganizationUseCase,
    private readonly getOrganization: GetOrganizationUseCase,
  ) {}

  /**
   * POST /organizations
   * Public. Registers a new organization and owner account.
   * Returns the invite token so the owner can set their password.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrganizationDto) {
    return this.createOrganization.execute(dto);
  }

  /**
   * GET /organizations/:slug
   * Authenticated. Returns org details for org-level users.
   */
  @Get(':slug')
  @UseGuards(JwtAuthGuard)
  getBySlug(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getOrganization.execute(slug, user);
  }
}
