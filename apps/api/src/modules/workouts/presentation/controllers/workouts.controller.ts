import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { LogWorkoutSessionUseCase } from '../../application/use-cases/log-workout-session.use-case';
import { ListWorkoutSessionsUseCase } from '../../application/use-cases/list-workout-sessions.use-case';
import { LogWorkoutSessionDto } from '../dto/log-workout-session.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId/workout-sessions')
@UseGuards(JwtAuthGuard)
export class WorkoutsController {
  constructor(
    private readonly logSession: LogWorkoutSessionUseCase,
    private readonly listSessions: ListWorkoutSessionsUseCase,
  ) {}

  /** POST /gyms/:gymId/workout-sessions — member saves a completed session */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async log(
    @Param('gymId') gymId: string,
    @Body() dto: LogWorkoutSessionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.logSession.execute(gymId, dto, caller);
  }

  /** GET /gyms/:gymId/workout-sessions?page=1&limit=20 — member's own session history */
  @Get()
  async list(
    @Param('gymId') gymId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.listSessions.execute(gymId, Number(page), Number(limit), caller);
  }
}
