import { Module } from '@nestjs/common';
import { LeadsRepository } from './infrastructure/persistence/leads.repository';
import { RateLimiterService } from '../../common/rate-limiter/rate-limiter.service';
import { CreateSignupRequestUseCase } from './application/use-cases/create-signup-request.use-case';
import { ListSignupRequestsUseCase } from './application/use-cases/list-signup-requests.use-case';
import { GetSignupRequestUseCase } from './application/use-cases/get-signup-request.use-case';
import { UpdateSignupRequestStatusUseCase } from './application/use-cases/update-signup-request-status.use-case';
import { ConvertSignupRequestUseCase } from './application/use-cases/convert-signup-request.use-case';

@Module({
  providers: [
    LeadsRepository,
    RateLimiterService,
    CreateSignupRequestUseCase,
    ListSignupRequestsUseCase,
    GetSignupRequestUseCase,
    UpdateSignupRequestStatusUseCase,
    ConvertSignupRequestUseCase,
  ],
  exports: [
    CreateSignupRequestUseCase,
    ListSignupRequestsUseCase,
    GetSignupRequestUseCase,
    UpdateSignupRequestStatusUseCase,
    ConvertSignupRequestUseCase,
  ],
})
export class LeadsModule {}
