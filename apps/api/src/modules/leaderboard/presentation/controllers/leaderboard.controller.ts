import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AddGymExerciseUseCase } from '../../application/use-cases/add-gym-exercise.use-case';
import { ListExercisesUseCase } from '../../application/use-cases/list-exercises.use-case';
import { GetLeaderboardConfigUseCase } from '../../application/use-cases/get-leaderboard-config.use-case';
import { UpdateLeaderboardConfigUseCase } from '../../application/use-cases/update-leaderboard-config.use-case';
import { UploadPrPhotoUseCase } from '../../application/use-cases/upload-pr-photo.use-case';
import { SubmitPrUseCase } from '../../application/use-cases/submit-pr.use-case';
import { ListPendingSubmissionsUseCase } from '../../application/use-cases/list-pending-submissions.use-case';
import { ApproveSubmissionUseCase } from '../../application/use-cases/approve-submission.use-case';
import { RejectSubmissionUseCase } from '../../application/use-cases/reject-submission.use-case';
import { GetLeaderboardUseCase } from '../../application/use-cases/get-leaderboard.use-case';
import { GetMyPrsUseCase } from '../../application/use-cases/get-my-prs.use-case';
import { AddGymExerciseDto } from '../dto/add-gym-exercise.dto';
import { UpdateLeaderboardConfigDto } from '../dto/update-leaderboard-config.dto';
import { SubmitPrDto } from '../dto/submit-pr.dto';
import { RejectSubmissionDto } from '../dto/reject-submission.dto';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Controller('gyms/:gymId')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(
    private readonly listExercisesUseCase: ListExercisesUseCase,
    private readonly addGymExerciseUseCase: AddGymExerciseUseCase,
    private readonly getLeaderboardConfigUseCase: GetLeaderboardConfigUseCase,
    private readonly updateLeaderboardConfigUseCase: UpdateLeaderboardConfigUseCase,
    private readonly uploadPrPhotoUseCase: UploadPrPhotoUseCase,
    private readonly submitPrUseCase: SubmitPrUseCase,
    private readonly listPendingSubmissionsUseCase: ListPendingSubmissionsUseCase,
    private readonly approveSubmissionUseCase: ApproveSubmissionUseCase,
    private readonly rejectSubmissionUseCase: RejectSubmissionUseCase,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
    private readonly getMyPrsUseCase: GetMyPrsUseCase,
  ) {}

  // ── Exercises ────────────────────────────────────────────────────────────

  /** GET /gyms/:gymId/exercises */
  @Get('exercises')
  listExercises(@Param('gymId') gymId: string) {
    return this.listExercisesUseCase.execute(gymId);
  }

  /** POST /gyms/:gymId/exercises */
  @Post('exercises')
  @HttpCode(HttpStatus.CREATED)
  addExercise(
    @Param('gymId') gymId: string,
    @Body() dto: AddGymExerciseDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.addGymExerciseUseCase.execute(gymId, dto.name, dto.category, caller);
  }

  // ── Leaderboard config ───────────────────────────────────────────────────

  /** GET /gyms/:gymId/leaderboard/config */
  @Get('leaderboard/config')
  getConfig(@Param('gymId') gymId: string) {
    return this.getLeaderboardConfigUseCase.execute(gymId);
  }

  /** PUT /gyms/:gymId/leaderboard/config */
  @Put('leaderboard/config')
  updateConfig(
    @Param('gymId') gymId: string,
    @Body() dto: UpdateLeaderboardConfigDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.updateLeaderboardConfigUseCase.execute(gymId, dto.exercises, caller);
  }

  // ── Photo upload ─────────────────────────────────────────────────────────

  /** POST /gyms/:gymId/leaderboard/photos */
  @Post('leaderboard/photos')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(
    @Param('gymId') gymId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Photo file is required');
    return this.uploadPrPhotoUseCase.execute(gymId, file.buffer);
  }

  // ── Submissions ──────────────────────────────────────────────────────────

  /** POST /gyms/:gymId/leaderboard/submissions — member self-submit */
  @Post('leaderboard/submissions')
  @HttpCode(HttpStatus.CREATED)
  submitPr(
    @Param('gymId') gymId: string,
    @Body() dto: SubmitPrDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.submitPrUseCase.execute(
      gymId,
      {
        exerciseId: dto.exerciseId,
        weightKg: dto.weightKg,
        reps: dto.reps,
        photoUrl: dto.photoUrl,
        notes: dto.notes,
        targetMemberId: dto.memberId,
      },
      caller,
    );
  }

  /** GET /gyms/:gymId/leaderboard/submissions/pending */
  @Get('leaderboard/submissions/pending')
  listPending(
    @Param('gymId') gymId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.listPendingSubmissionsUseCase.execute(gymId, caller);
  }

  /** PATCH /gyms/:gymId/leaderboard/submissions/:id/approve */
  @Patch('leaderboard/submissions/:submissionId/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('gymId') gymId: string,
    @Param('submissionId') submissionId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.approveSubmissionUseCase.execute(submissionId, gymId, caller);
  }

  /** PATCH /gyms/:gymId/leaderboard/submissions/:id/reject */
  @Patch('leaderboard/submissions/:submissionId/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('gymId') gymId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: RejectSubmissionDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.rejectSubmissionUseCase.execute(submissionId, gymId, caller, dto.reason);
  }

  // ── Leaderboard data ─────────────────────────────────────────────────────

  /** GET /gyms/:gymId/leaderboard */
  @Get('leaderboard')
  getLeaderboard(@Param('gymId') gymId: string) {
    return this.getLeaderboardUseCase.getFullLeaderboard(gymId);
  }

  /** GET /gyms/:gymId/leaderboard/:exerciseId */
  @Get('leaderboard/:exerciseId')
  getExerciseLeaderboard(
    @Param('gymId') gymId: string,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.getLeaderboardUseCase.getExerciseLeaderboard(gymId, exerciseId);
  }

  /** GET /gyms/:gymId/members/me/prs */
  @Get('members/me/prs')
  getMyPrs(
    @Param('gymId') gymId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.getMyPrsUseCase.execute(gymId, caller);
  }
}
