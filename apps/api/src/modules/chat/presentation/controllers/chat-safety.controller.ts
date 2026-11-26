import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ReportAction } from '../../../../common/enums';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { ReportMessageUseCase } from '../../application/use-cases/report-message.use-case';
import { BlockUserUseCase } from '../../application/use-cases/block-user.use-case';
import { UnblockUserUseCase } from '../../application/use-cases/unblock-user.use-case';
import { ListBlocksUseCase } from '../../application/use-cases/list-blocks.use-case';
import { AcceptCommunityRulesUseCase, GetCommunityRulesUseCase } from '../../application/use-cases/community-rules.use-case';
import { ListReportsUseCase } from '../../application/use-cases/list-reports.use-case';
import { ResolveReportUseCase } from '../../application/use-cases/resolve-report.use-case';
import { ReportMessageDto } from '../dto/report-message.dto';
import { BlockUserDto } from '../dto/block-user.dto';
import { AcceptCommunityRulesDto } from '../dto/accept-community-rules.dto';
import { ListReportsQueryDto } from '../dto/list-reports-query.dto';

/** Community chat safety: report, block, community rules, and the staff moderation queue. */
@Controller('gyms/:gymId/chat')
@UseGuards(JwtAuthGuard)
export class ChatSafetyController {
  constructor(
    private readonly reportMessage: ReportMessageUseCase,
    private readonly blockUser: BlockUserUseCase,
    private readonly unblockUser: UnblockUserUseCase,
    private readonly listBlocks: ListBlocksUseCase,
    private readonly getRules: GetCommunityRulesUseCase,
    private readonly acceptRules: AcceptCommunityRulesUseCase,
    private readonly listReports: ListReportsUseCase,
    private readonly resolveReport: ResolveReportUseCase,
  ) {}

  /** POST /gyms/:gymId/chat/messages/:messageId/report */
  @Post('messages/:messageId/report')
  @HttpCode(HttpStatus.OK)
  report(
    @Param('gymId') gymId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: ReportMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportMessage.execute(gymId, messageId, dto, user);
  }

  /** GET /gyms/:gymId/chat/blocks — the people the caller blocked. */
  @Get('blocks')
  blocks(@Param('gymId') gymId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listBlocks.execute(gymId, user);
  }

  /** POST /gyms/:gymId/chat/blocks */
  @Post('blocks')
  @HttpCode(HttpStatus.OK)
  block(@Param('gymId') gymId: string, @Body() dto: BlockUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.blockUser.execute(gymId, dto.userId, user);
  }

  /** DELETE /gyms/:gymId/chat/blocks/:userId */
  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(@Param('gymId') gymId: string, @Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.unblockUser.execute(gymId, userId, user);
  }

  /** GET /gyms/:gymId/chat/rules — the community rules and whether the caller accepted them. */
  @Get('rules')
  rules(@Param('gymId') gymId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getRules.execute(gymId, user);
  }

  /** POST /gyms/:gymId/chat/rules/accept */
  @Post('rules/accept')
  @HttpCode(HttpStatus.OK)
  accept(@Param('gymId') gymId: string, @Body() dto: AcceptCommunityRulesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.acceptRules.execute(gymId, dto.version, user);
  }

  /** GET /gyms/:gymId/chat/reports?page=&limit= — messages with open reports, a page at a time (chat.manage). */
  @Get('reports')
  reports(@Param('gymId') gymId: string, @Query() query: ListReportsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.listReports.execute(gymId, query, user);
  }

  /** POST /gyms/:gymId/chat/reports/:messageId/dismiss — keep the message, close its reports. */
  @Post('reports/:messageId/dismiss')
  @HttpCode(HttpStatus.OK)
  dismiss(@Param('gymId') gymId: string, @Param('messageId', ParseUUIDPipe) messageId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.resolveReport.execute(gymId, messageId, ReportAction.DISMISS, user);
  }

  /** POST /gyms/:gymId/chat/reports/:messageId/remove — remove the message, close its reports. */
  @Post('reports/:messageId/remove')
  @HttpCode(HttpStatus.OK)
  remove(@Param('gymId') gymId: string, @Param('messageId', ParseUUIDPipe) messageId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.resolveReport.execute(gymId, messageId, ReportAction.REMOVE, user);
  }
}
