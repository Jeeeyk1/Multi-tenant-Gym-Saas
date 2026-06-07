import { Module } from '@nestjs/common';
import { AnnouncementsRepository } from './infrastructure/persistence/announcements.repository';
import { CreateAnnouncementUseCase } from './application/use-cases/create-announcement.use-case';
import { UpdateAnnouncementUseCase } from './application/use-cases/update-announcement.use-case';
import { ArchiveAnnouncementUseCase } from './application/use-cases/archive-announcement.use-case';
import { ListAnnouncementsUseCase } from './application/use-cases/list-announcements.use-case';
import { MarkAnnouncementReadUseCase } from './application/use-cases/mark-announcement-read.use-case';
import { AnnouncementsController } from './presentation/controllers/announcements.controller';

@Module({
  controllers: [AnnouncementsController],
  providers: [
    AnnouncementsRepository,
    CreateAnnouncementUseCase,
    UpdateAnnouncementUseCase,
    ArchiveAnnouncementUseCase,
    ListAnnouncementsUseCase,
    MarkAnnouncementReadUseCase,
  ],
})
export class AnnouncementsModule {}
