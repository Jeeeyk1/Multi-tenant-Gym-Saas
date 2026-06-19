import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    try {
      const payload = this.jwt.verify<{ type?: string }>(auth.slice(7));
      if (payload.type !== 'system_admin') throw new UnauthorizedException();
      (req as any).admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
