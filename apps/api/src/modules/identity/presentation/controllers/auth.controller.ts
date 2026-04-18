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
import { ResolveCodeDto } from '../dto/resolve-code.dto';
import { OrgLoginDto } from '../dto/org-login.dto';
import { GymLoginDto } from '../dto/gym-login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ActivateAccountDto } from '../dto/activate-account.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly resolveCodeUseCase: ResolveCodeUseCase,
    private readonly orgLoginUseCase: OrgLoginUseCase,
    private readonly gymLoginUseCase: GymLoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly activateAccount: ActivateAccountUseCase,
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
}
