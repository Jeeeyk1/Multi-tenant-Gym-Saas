import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotFoundError } from '../../../../common/errors';
import { BillingRepository } from '../../infrastructure/persistence/billing.repository';
import type { AuthenticatedUser } from '../../../../common/types/auth.types';
import { assertGymAccess, assertPermission } from '../../../../common/auth/authorization';
import { Permission } from '../../../../common/enums';

@Injectable()
export class GetMySubscriptionUseCase {
  constructor(
    private readonly repo: BillingRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(gymId: string, caller: AuthenticatedUser) {
    assertGymAccess(caller, gymId);
    assertPermission(caller, Permission.BILLING_MANAGE);

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
