import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { BillingCycle, InvoiceStatus, SubscriptionStatus } from '../../../../common/enums';
import { addBillingPeriod, generateInvoiceNumber, RENEWAL_REMINDER_DAYS, GRACE_PERIOD_DAYS } from '../../domain/billing.constants';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrgIdByGym(gymId: string) {
    return this.prisma.gym.findUnique({ where: { id: gymId }, select: { organizationId: true } });
  }

  getSubscriptionByOrg(organizationId: string) {
    return this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        billingCycle: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        plan: { select: { id: true, name: true, tier: true, priceMonthly: true, priceYearly: true } },
      },
    });
  }

  /** The invoice the owner still needs to act on (unpaid), newest first. */
  getCurrentInvoiceByOrg(organizationId: string) {
    return this.prisma.invoice.findFirst({
      where: { organizationId, status: { in: [InvoiceStatus.OPEN, InvoiceStatus.AWAITING_VERIFICATION] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        amount: true,
        currency: true,
        dueAt: true,
        paymentReference: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
  }

  findInvoiceById(invoiceId: string) {
    return this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, organizationId: true, subscriptionId: true, status: true },
    });
  }

  submitPayment(invoiceId: string, reference: string, method?: string) {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.AWAITING_VERIFICATION,
        paymentReference: reference,
        paymentMethod: method,
        paymentSubmittedAt: new Date(),
        rejectionReason: null,
      },
      select: { id: true, status: true },
    });
  }

  rejectPayment(invoiceId: string, reason: string) {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.OPEN, rejectionReason: reason, paymentSubmittedAt: null },
      select: { id: true, status: true },
    });
  }

  /**
   * Confirm payment: mark the invoice PAID and activate its subscription. Extends the period
   * for a renewal (period already elapsed); leaves a still-valid first period untouched.
   * Runs in a transaction and busts the cached subscription status.
   */
  async markInvoicePaid(invoiceId: string, subscriptionId: string | null, verifiedBy?: string) {
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID, paidAt: now, verifiedBy: verifiedBy ?? null, rejectionReason: null },
        select: { id: true, status: true, organizationId: true },
      });

      let gymIds: string[] = [];
      if (subscriptionId) {
        const sub = await tx.subscription.findUnique({
          where: { id: subscriptionId },
          select: { billingCycle: true, currentPeriodEnd: true },
        });
        const extend = sub && sub.currentPeriodEnd < now;
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: SubscriptionStatus.ACTIVE,
            ...(extend
              ? {
                  currentPeriodStart: now,
                  currentPeriodEnd: addBillingPeriod(now, sub!.billingCycle as BillingCycle),
                }
              : {}),
          },
        });
      }

      const gyms = await tx.gym.findMany({ where: { organizationId: invoice.organizationId }, select: { id: true } });
      gymIds = gyms.map((g) => g.id);
      return { invoice, gymIds };
    });

    return result;
  }

  gymsForOrg(organizationId: string) {
    return this.prisma.gym.findMany({ where: { organizationId }, select: { id: true } });
  }

  listPendingPayments() {
    return this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.AWAITING_VERIFICATION },
      orderBy: { paymentSubmittedAt: 'asc' },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        currency: true,
        paymentReference: true,
        paymentMethod: true,
        paymentSubmittedAt: true,
        organization: { select: { id: true, name: true } },
      },
    });
  }

  // ── Renewals / lifecycle (cron) ─────────────────────────────────────────────

  /**
   * ACTIVE/PAST_DUE subscriptions whose period ends within `RENEWAL_REMINDER_DAYS` and don't
   * already have an unpaid invoice (idempotency — safe to run this job daily).
   */
  listSubscriptionsDueForRenewalInvoice() {
    const cutoff = new Date(Date.now() + RENEWAL_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
        currentPeriodEnd: { lte: cutoff },
      },
      select: {
        id: true,
        organizationId: true,
        billingCycle: true,
        currentPeriodEnd: true,
        plan: { select: { priceMonthly: true, priceYearly: true } },
        organization: {
          select: {
            name: true,
            members: { where: { role: 'OWNER' }, select: { user: { select: { email: true, fullName: true } } } },
          },
        },
      },
    });
  }

  hasUnpaidInvoice(subscriptionId: string) {
    return this.prisma.invoice
      .findFirst({
        where: { subscriptionId, status: { in: [InvoiceStatus.OPEN, InvoiceStatus.AWAITING_VERIFICATION] } },
        select: { id: true },
      })
      .then((invoice) => invoice !== null);
  }

  createRenewalInvoice(subscriptionId: string, organizationId: string, amount: unknown, dueAt: Date) {
    return this.prisma.invoice.create({
      data: {
        organizationId,
        subscriptionId,
        invoiceNumber: generateInvoiceNumber(),
        status: InvoiceStatus.OPEN,
        amount: amount as never,
        dueAt,
      },
    });
  }

  /** ACTIVE subscriptions whose period has already ended — their renewal went unpaid. */
  listActiveSubscriptionsPastPeriodEnd() {
    return this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: { lt: new Date() } },
      select: { id: true, organizationId: true },
    });
  }

  markPastDue(subscriptionId: string) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
  }

  /** PAST_DUE subscriptions whose grace window has elapsed — time to lock the gym. */
  listPastDueSubscriptionsPastGrace() {
    const graceCutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.PAST_DUE, currentPeriodEnd: { lt: graceCutoff } },
      select: {
        id: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
            members: { where: { role: 'OWNER' }, select: { user: { select: { email: true, fullName: true } } } },
          },
        },
      },
    });
  }

  async markSuspended(subscriptionId: string, organizationId: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.SUSPENDED },
    });
    const gyms = await this.prisma.gym.findMany({ where: { organizationId }, select: { id: true } });
    return gyms.map((g) => g.id);
  }

  // ── Admin ledger ─────────────────────────────────────────────────────────────

  listAllInvoices(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.prisma.$transaction([
      this.prisma.invoice.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          amount: true,
          currency: true,
          dueAt: true,
          paidAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.invoice.count(),
    ]);
  }

  async getRevenueStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [revenueThisMonth, activeSubs] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { status: InvoiceStatus.PAID, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.subscription.findMany({
        where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] } },
        select: { billingCycle: true, plan: { select: { priceMonthly: true, priceYearly: true } } },
      }),
    ]);

    const mrr = activeSubs.reduce((sum, sub) => {
      const monthly =
        sub.billingCycle === BillingCycle.YEARLY
          ? Number(sub.plan.priceYearly ?? sub.plan.priceMonthly) / 12
          : Number(sub.plan.priceMonthly);
      return sum + monthly;
    }, 0);

    return {
      mrr: Math.round(mrr * 100) / 100,
      revenueThisMonth: Number(revenueThisMonth._sum.amount ?? 0),
    };
  }
}
