import { Body, Controller, Get, Post } from '@nestjs/common';
import { LandingChatUseCase } from '../../application/use-cases/landing-chat.use-case';
import { PublicRepository } from '../../infrastructure/persistence/public.repository';
import { LandingChatDto } from '../dto/landing-chat.dto';

@Controller('public')
export class PublicController {
  constructor(
    private readonly repo: PublicRepository,
    private readonly landingChat: LandingChatUseCase,
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
}
