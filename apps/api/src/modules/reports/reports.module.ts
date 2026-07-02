import { Module } from '@nestjs/common';
import { ReportsRepository } from './infrastructure/persistence/reports.repository';
import { GetCheckinsTrendUseCase } from './application/use-cases/get-checkins-trend.use-case';
import { ReportsController } from './presentation/controllers/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsRepository, GetCheckinsTrendUseCase],
})
export class ReportsModule {}
