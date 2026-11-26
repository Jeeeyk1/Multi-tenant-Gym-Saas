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

  /** POST /public/chat — landing assistant. Unauthenticated, so rate-limited by IP. */
  @Post('chat')
  async chat(@Body() dto: LandingChatDto, @Req() req: Request) {
    const reply = await this.landingChat.execute(dto.message, dto.history ?? [], req.ip ?? 'unknown');
    return { reply };
  }

  /** POST /public/signup-requests — free-trial lead capture. Same reply for honeypot hits; never echoes the lead. */
  @Post('signup-requests')
  @HttpCode(HttpStatus.CREATED)
  async submitSignupRequest(@Body() dto: CreateSignupRequestDto, @Req() req: Request) {
    await this.createSignupRequest.execute(dto, req.ip ?? 'unknown');
    return { received: true };
  }
}
