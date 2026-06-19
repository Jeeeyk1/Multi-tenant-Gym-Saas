import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ResolveCodeUseCase } from '../../application/use-cases/resolve-code.use-case';
import { OrgLoginUseCase } from '../../application/use-cases/org-login.use-case';
import { GymLoginUseCase } from '../../application/use-cases/gym-login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { ActivateAccountUseCase } from '../../application/use-cases/activate-account.use-case';
import { AdminLoginUseCase } from '../../application/use-cases/admin-login.use-case';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { ResolveCodeDto } from '../dto/resolve-code.dto';
import { OrgLoginDto } from '../dto/org-login.dto';
import { GymLoginDto } from '../dto/gym-login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ActivateAccountDto } from '../dto/activate-account.dto';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly resolveCodeUseCase: ResolveCodeUseCase,
    private readonly orgLoginUseCase: OrgLoginUseCase,
    private readonly gymLoginUseCase: GymLoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly activateAccount: ActivateAccountUseCase,
    private readonly adminLogin: AdminLoginUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  /**
   * POST /auth/resolve-code
   * Public. Resolves an org slug or gym code and returns the context for the login screen.
   */
  @Post('resolve-code')
  @HttpCode(HttpStatus.OK)
  async resolveCode(@Body() dto: ResolveCodeDto) {
    return this.resolveCodeUseCase.execute(dto.code);
  }

  /**
   * POST /auth/org/login
   * Issues an org-level JWT for org owners and admins.
   */
  @Post('org/login')
  @HttpCode(HttpStatus.OK)
  async orgLogin(@Body() dto: OrgLoginDto) {
    return this.orgLoginUseCase.execute(dto.orgSlug, dto.email, dto.password);
  }

  /**
   * POST /auth/gym/login
   * Issues a gym-level JWT for gym staff and members.
   */
  @Post('gym/login')
  @HttpCode(HttpStatus.OK)
  async gymLogin(@Body() dto: GymLoginDto) {
    return this.gymLoginUseCase.execute(dto.gymCode, dto.email, dto.password);
  }

  /**
   * POST /auth/refresh
   * Rotates the refresh token and issues a new access token.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshToken.execute(dto.refreshToken);
  }

  /**
   * POST /auth/logout
   * Revokes the refresh token. Idempotent.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutUser(@Body() dto: RefreshTokenDto) {
    await this.logout.execute(dto.refreshToken);
  }

  /**
   * POST /auth/activate
   * Sets the user's password and marks the account as verified.
   * Consumes the one-time invitation token.
   */
  @Post('activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async activate(@Body() dto: ActivateAccountDto) {
    await this.activateAccount.execute(dto.token, dto.password);
  }

  /**
   * POST /auth/admin/login
   * Issues a system-admin JWT. Only valid for system_admins table entries.
   */
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLoginEndpoint(@Body() dto: AdminLoginDto) {
    return this.adminLogin.execute(dto.email, dto.password);
  }

  /**
   * POST /auth/forgot-password
   * Public. Always returns 200 to prevent email enumeration.
   * In production the token would be emailed — for MVP it is returned in the response.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: RequestPasswordResetDto) {
    await this.requestPasswordReset.execute(dto.email);
  }

  /**
   * POST /auth/reset-password
   * Public. Validates the reset token, updates the password, and revokes all active sessions.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetUserPassword(@Body() dto: ResetPasswordDto) {
    await this.resetPassword.execute(dto.token, dto.password);
  }
}
