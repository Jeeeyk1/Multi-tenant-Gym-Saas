import { Injectable } from '@nestjs/common';
import { ForbiddenError, TooManyRequestsError } from '../../../common/errors';
import { InsightsRepository, type Entitlement } from '../infrastructure/persistence/insights.repository';

@Injectable()
export class EntitlementsService {
  constructor(private readonly repo: InsightsRepository) {}

  async check(gymId: string): Promise<Entitlement> {
    const entitlement = await this.repo.getEntitlement(gymId);

    if (!entitlement || !entitlement.aiIncluded) {
      throw new ForbiddenError('The AI assistant is not included in this gym\'s plan', 'FEATURE_NOT_AVAILABLE');
    }
    if (entitlement.quota > 0 && entitlement.used >= entitlement.quota) {
      throw new TooManyRequestsError('Monthly AI usage limit reached', 'AI_QUOTA_EXCEEDED');
    }

    return entitlement;
  }
}
