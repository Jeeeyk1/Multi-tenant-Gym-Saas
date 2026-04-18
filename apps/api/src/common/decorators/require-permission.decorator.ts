import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares the permissions required to access a route.
 * Enforced by PermissionsGuard (AND logic — all listed permissions required).
 *
 * Must be used alongside JwtAuthGuard.
 *
 * @example
 * @Get()
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermission('members.view')
 * listMembers() { ... }
 *
 * @example — multiple permissions required
 * @RequirePermission('members.view', 'reports.view')
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
