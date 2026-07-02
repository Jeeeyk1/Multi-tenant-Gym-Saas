import { Module } from '@nestjs/common';
import { CheckInsRepository } from './infrastructure/persistence/check-ins.repository';
import { CheckInUseCase } from './application/use-cases/check-in.use-case';
import { CheckoutUseCase } from './application/use-cases/checkout.use-case';
import { ListActiveCheckinsUseCase } from './application/use-cases/list-active-checkins.use-case';
import { ListActivePublicCheckinsUseCase } from './application/use-cases/list-active-public-checkins.use-case';
import { ListCheckinHistoryUseCase } from './application/use-cases/list-checkin-history.use-case';
import { ListMyCheckInsUseCase } from './application/use-cases/list-my-checkins.use-case';
import { CheckInsController } from './presentation/controllers/check-ins.controller';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [CheckInsController],
  providers: [
    CheckInsRepository,
    CheckInUseCase,
    CheckoutUseCase,
    ListActiveCheckinsUseCase,
    ListActivePublicCheckinsUseCase,
    ListCheckinHistoryUseCase,
    ListMyCheckInsUseCase,
  ],
})
export class CheckInsModule {}
