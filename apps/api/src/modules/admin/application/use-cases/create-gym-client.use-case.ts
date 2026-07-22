import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../../common/email/email.service';
import { ConflictError, NotFoundError } from '../../../../common/errors';
import { BillingCycle } from '../../../../common/enums';
import { AdminRepository } from '../../infrastructure/persistence/admin.repository';

export interface CreateGymClientInput {
  gymName: string;
  gymCode: string;
  ownerEmail: string;
  ownerFullName: string;
  planId: string;
  billingCycle?: BillingCycle;
  /** When set, provision as a free trial for this many days instead of pay-first. */
  trialDays?: number;
}

@Injectable()
export class CreateGymClientUseCase {
  constructor(
    private readonly repo: AdminRepository,
    private readonly email: EmailService,
  ) {}

  async execute(input: CreateGymClientInput) {
    const codeTaken = await this.repo.findGymByCode(input.gymCode);
    if (codeTaken) throw new ConflictError(`Gym code '${input.gymCode}' is already taken`, 'GYM_CODE_TAKEN');

    const emailTaken = await this.repo.findUserByEmail(input.ownerEmail);
    if (emailTaken) throw new ConflictError('An account with this email already exists', 'EMAIL_TAKEN');

    const plan = await this.repo.findPlanById(input.planId);
    if (!plan) throw new NotFoundError('Plan not found', 'PLAN_NOT_FOUND');

    const orgSlug = input.gymName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = orgSlug;
    let attempt = 0;
    while (await this.repo.findOrgBySlug(slug)) {
      attempt++;
      slug = `${orgSlug}-${attempt}`;
    }

    const result = await this.repo.createGymClient({
      orgName: input.gymName,
      orgSlug: slug,
      gymName: input.gymName,
      gymCode: input.gymCode,
      ownerEmail: input.ownerEmail,
      ownerFullName: input.ownerFullName,
      planId: input.planId,
      billingCycle: input.billingCycle ?? BillingCycle.MONTHLY,
      trialDays: input.trialDays,
    });

    await this.email.sendOwnerInvite({
      to: input.ownerEmail,
      fullName: input.ownerFullName,
      gymName: input.gymName,
      gymCode: input.gymCode,
      token: result.inviteToken,
    });

    return result;
  }
}
