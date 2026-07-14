import { SetMetadata } from '@nestjs/common';

export const ALLOW_INACTIVE_SUBSCRIPTION = 'allowInactiveSubscription';

/**
 * Marks a route as reachable even when the gym's subscription is not ACTIVE.
 * Use on the owner's billing/payment routes and anything that must work before
 * the first payment clears. Everything else gym-scoped is locked by SubscriptionGuard.
 */
export const AllowInactiveSubscription = () => SetMetadata(ALLOW_INACTIVE_SUBSCRIPTION, true);
