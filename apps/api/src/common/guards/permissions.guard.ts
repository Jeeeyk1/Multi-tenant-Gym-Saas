import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import type { AuthenticatedUser, GymAuthUser } from '../types/auth.types';

/**
 * Enforces permission requirements declared with @RequirePermission().
 *
 * Must be used AFTER JwtAuthGuard (depends on request.user being populated).
 *
 * Logic:
 * - If no permissions are declared on the route, access is allowed.
 * - Only gym-level tokens (type = 'gym') carry permissions.
 *   Org-level tokens are rejected — org routes use their own access checks.
 * - ALL declared permissions must be present (AND logic).
 *
 * Important: always check permissions, never role names directly.
 *
 * @example
 * @Get()
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermission('members.view')
 * listMembers() { ... }
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions declared — route is accessible to any authenticated user
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    // Org-level tokens do not carry gym permissions
    if (!user || user.type !== 'gym') return false;

    const gymUser = user as GymAuthUser;

    // All required permissions must be present (AND logic)
    return required.every((permission) =>
      gymUser.permissions.includes(permission),
    );
  }
}
