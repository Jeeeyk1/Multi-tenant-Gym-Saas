import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/auth.types';

/**
 * Validates the Bearer JWT on every protected route.
 *
 * On success: attaches the decoded payload to request.user as AuthenticatedUser.
 * On failure: throws UnauthorizedException (401).
 *
 * Handles both org-level and gym-level tokens — the token type is determined
 * by the 'type' field in the payload ('org' | 'gym').
 *
 * @example
 * @Get()
 * @UseGuards(JwtAuthGuard)
 * getResource(@CurrentUser() user: AuthenticatedUser) { ... }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = this.configService.getOrThrow<string>('jwt.accessSecret');
      const payload = this.jwtService.verify<AuthenticatedUser>(token, {
        secret,
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? (token ?? null) : null;
  }
}
