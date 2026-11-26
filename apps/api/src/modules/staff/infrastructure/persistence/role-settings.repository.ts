import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class RoleSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Does the role grant the permission by default (before any gym override)? */
  async roleHasPermission(roleName: string, permissionKey: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: { role: { name: roleName }, permission: { key: permissionKey } },
    });
    return count > 0;
  }

  findOverride(gymId: string, roleName: string, permissionKey: string) {
    return this.prisma.gymRolePermissionOverride.findFirst({
      where: { gymId, role: { name: roleName }, permission: { key: permissionKey } },
      select: { isGranted: true, updatedAt: true, updatedBy: true },
    });
  }

  /** Stores the gym's choice, or removes it when it equals the role's default. */
  async setOverride(
    gymId: string,
    roleName: string,
    permissionKey: string,
    input: { isGranted: boolean; isDefault: boolean; updatedBy: string },
  ): Promise<void> {
    const [role, permission] = await Promise.all([
      this.prisma.role.findUniqueOrThrow({ where: { name: roleName }, select: { id: true } }),
      this.prisma.permission.findUniqueOrThrow({ where: { key: permissionKey }, select: { id: true } }),
    ]);
    const id = { gymId, roleId: role.id, permissionId: permission.id };
    if (input.isDefault) {
      await this.prisma.gymRolePermissionOverride.deleteMany({ where: id });
      return;
    }
    await this.prisma.gymRolePermissionOverride.upsert({
      where: { gymId_roleId_permissionId: id },
      create: { ...id, isGranted: input.isGranted, updatedBy: input.updatedBy },
      update: { isGranted: input.isGranted, updatedBy: input.updatedBy, updatedAt: new Date() },
    });
  }
}
