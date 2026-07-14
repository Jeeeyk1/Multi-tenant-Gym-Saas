import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForbiddenError, NotFoundError } from '../../../../common/errors';
import { BillingRepository } from '../../infrastructure/persistence/billing.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';

@Injectable()
export class GetMySubscriptionUseCase {
  constructor(
    private readonly repo: BillingRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, 'billing.manage');

    const org = await this.repo.getOrgIdByGym(gymId);
    if (!org) throw new NotFoundError('Gym not found', 'GYM_NOT_FOUND');

    const subscription = await this.repo.getSubscriptionByOrg(org.organizationId);
    if (!subscription) throw new NotFoundError('No subscription for this gym', 'SUBSCRIPTION_NOT_FOUND');

    const invoice = await this.repo.getCurrentInvoiceByOrg(org.organizationId);

    return {
      subscription,
      invoice,
      paymentInstructions: {
        gcash: this.config.get<string>('BILLING_GCASH') ?? null,
        bank: this.config.get<string>('BILLING_BANK') ?? null,
        note: 'After paying, submit your payment reference number. An admin will verify it.',
      },
    };
  }
}

function assertGymAccess(caller: AuthenticatedUser, gymId: string) {
  if (caller.type === 'gym' && caller.gymId !== gymId) {
    throw new ForbiddenError('Access denied to this gym', 'GYM_ACCESS_DENIED');
  }
}

function assertPermission(caller: AuthenticatedUser, permission: string) {
  if (caller.type === 'gym' && !caller.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, 'PERMISSION_DENIED');
  }
}
