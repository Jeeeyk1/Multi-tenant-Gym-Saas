import { Module } from '@nestjs/common';
import { AuthController } from './presentation/controllers/auth.controller';
import { ResolveCodeUseCase } from './application/use-cases/resolve-code.use-case';
import { OrgLoginUseCase } from './application/use-cases/org-login.use-case';
import { GymLoginUseCase } from './application/use-cases/gym-login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { ActivateAccountUseCase } from './application/use-cases/activate-account.use-case';
import { AdminLoginUseCase } from './application/use-cases/admin-login.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { IdentityRepository } from './infrastructure/persistence/identity.repository';

@Module({
  controllers: [AuthController],
  providers: [
    IdentityRepository,
    ResolveCodeUseCase,
    OrgLoginUseCase,
    GymLoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ActivateAccountUseCase,
    AdminLoginUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
  ],
})
export class IdentityModule {}
