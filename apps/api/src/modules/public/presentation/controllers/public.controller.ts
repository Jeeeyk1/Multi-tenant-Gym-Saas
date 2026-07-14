import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LandingChatUseCase } from '../../application/use-cases/landing-chat.use-case';
import { PublicRepository } from '../../infrastructure/persistence/public.repository';
import { CreateSignupRequestUseCase } from '../../../leads/application/use-cases/create-signup-request.use-case';
import { LandingChatDto } from '../dto/landing-chat.dto';
import { CreateSignupRequestDto } from '../../../leads/presentation/dto/create-signup-request.dto';

@Controller('public')
export class PublicController {
  constructor(
    private readonly repo: PublicRepository,
    private readonly landingChat: LandingChatUseCase,
    private readonly createSignupRequest: CreateSignupRequestUseCase,
  ) {}

  @Get('plans')
  plans() {
    return this.repo.listActivePlans();
  }

  @Post('chat')
  async chat(@Body() dto: LandingChatDto) {
    const reply = await this.landingChat.execute(dto.message, dto.history ?? []);
    return { reply };
  }

  /** POST /public/signup-requests — landing "Subscribe" lead capture. Rate-limited by IP. */
  @Post('signup-requests')
  @HttpCode(HttpStatus.CREATED)
  submitSignupRequest(@Body() dto: CreateSignupRequestDto, @Req() req: Request) {
    return this.createSignupRequest.execute(dto, req.ip ?? 'unknown');
  }
}
