import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { MemberStatus } from '../../../../common/enums';

const INVITE_TOKEN_EXPIRY_DAYS = 7;
const MEMBERSHIP_NUMBER_PREFIX = 'MBR';
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateMembershipNumber(): string {
  const suffix = Array.from({ length: 8 }, () =>
    SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)],
  ).join('');
  return `${MEMBERSHIP_NUMBER_PREFIX}-${suffix}`;
}

function generateQrToken(): string {
  return randomBytes(32).toString('hex');
}

// Anonymised accounts keep a unique, undeliverable email (.invalid is reserved and never resolves).
const DELETED_NAME = 'Deleted member';
const deletedEmail = (kind: 'member' | 'user', id: string) => `deleted-${kind}-${id}@deleted.invalid`;

export interface MemberForDeletion {
  memberId: string;
  status: string;
  passwordHash: string | null;
  /** Other reasons the login must stay: staff or org roles, or membership at another gym. */
  keepsLogin: boolean;
  /** Staff at this gym chat under the same login, so their chat here stays. */
  isStaffHere: boolean;
}

export interface AnonymiseOptions {
  gymId: string;
  anonymiseLogin: boolean;
  isStaffHere: boolean;
}

export interface ProfileUpdateData {
  age?: number;
  weightKg?: number;
  targetWeightKg?: number | null;
  heightCm?: number;
  sex?: string;
  unitSystem?: string;
  fitnessGoal?: string;
  activityLevel?: string;
  daysPerWeek?: number;
  experienceLevel?: string;
  preferredStyle?: string;
  dietType?: string;
  injuries?: string | null;
  healthCaution?: boolean;
  /** null withdraws consent; undefined leaves it unchanged. */
  healthDataConsentAt?: Date | null;
  onboardingDone?: boolean;
}

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  findMemberByUserId(gymId: string, userId: string) {
    return this.prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: { id: true },
    });
  }

  findFullMemberByUserId(gymId: string, userId: string) {
    return this.prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: {
        id: true,
        gymId: true,
        membershipNumber: true,
        status: true,
        qrCodeToken: true,
        expiryDate: true,
        joinedAt: true,
        updatedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        membershipPlan: {
          select: { id: true, name: true, type: true, price: true, durationDays: true },
        },
        privacy: {
          select: { hideCheckinVisibility: true, hideFromMemberList: true },
        },
      },
    });
  }

  /**
   * Upsert privacy flags for a member. Returns the updated row.
   * Privacy rows are created on member registration but this upsert handles
   * the safety case where one is missing.
   */
  upsertMemberPrivacy(
    memberId: string,
    patch: { hideCheckinVisibility?: boolean; hideFromMemberList?: boolean },
  ) {
    return this.prisma.memberPrivacy.upsert({
      where: { memberId },
      create: { memberId, ...patch },
      update: { ...patch, updatedAt: new Date() },
      select: { hideCheckinVisibility: true, hideFromMemberList: true },
    });
  }

  findMemberById(memberId: string, gymId: string) {
    return this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: {
        id: true,
        gymId: true,
        membershipNumber: true,
        status: true,
        qrCodeToken: true,
        expiryDate: true,
        joinedAt: true,
        updatedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        membershipPlan: {
          select: { id: true, name: true, type: true, price: true, durationDays: true },
        },
      },
    });
  }

  findGymById(gymId: string) {
    return this.prisma.gym.findUnique({
      where: { id: gymId },
      select: { id: true, name: true, code: true, profile: { select: { logoUrl: true, primaryColor: true } } },
    });
  }

  findPlanById(planId: string, gymId: string) {
    return this.prisma.membershipPlan.findFirst({
      where: { id: planId, gymId, isActive: true },
      select: { id: true, durationDays: true },
    });
  }

  findDefaultConversation(gymId: string) {
    return this.prisma.conversation.findFirst({
      where: { gymId, isDefault: true },
      select: { id: true },
    });
  }

  listMembers(gymId: string, skip: number, take: number) {
    return this.prisma.gymMember.findMany({
      where: { gymId, status: { not: MemberStatus.DELETED } },
      skip,
      take,
      select: {
        id: true,
        membershipNumber: true,
        status: true,
        expiryDate: true,
        joinedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        membershipPlan: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  countMembers(gymId: string) {
    return this.prisma.gymMember.count({ where: { gymId, status: { not: MemberStatus.DELETED } } });
  }

  async findMemberForDeletion(gymId: string, userId: string): Promise<MemberForDeletion | null> {
    const member = await this.prisma.gymMember.findUnique({
      where: { gymId_userId: { gymId, userId } },
      select: { id: true, status: true, user: { select: { passwordHash: true } } },
    });
    if (!member) return null;
    const [otherMemberships, staffRoles, staffHere, orgRoles] = await Promise.all([
      this.prisma.gymMember.count({ where: { userId, id: { not: member.id }, status: { not: MemberStatus.DELETED } } }),
      this.prisma.gymStaff.count({ where: { userId } }),
      this.prisma.gymStaff.count({ where: { userId, gymId } }),
      this.prisma.organizationMember.count({ where: { userId } }),
    ]);
    return {
      memberId: member.id,
      status: member.status,
      passwordHash: member.user.passwordHash,
      keepsLogin: otherMemberships + staffRoles + orgRoles > 0,
      isStaffHere: staffHere > 0,
    };
  }

  /**
   * Deletes a member's personal, health and progress data and detaches the membership from the
   * person, in one transaction. Renewals and check-ins stay, on a placeholder "Deleted member", so
   * the gym's records still add up. Their chat in this gym is removed unless they are staff here.
   * With `anonymiseLogin`, the login itself is anonymised too: sessions, devices and all chat.
   *
   * Returns the photo URLs to remove from storage once the transaction has committed (PR photos
   * that no other submission uses), or null when the member was already deleted (e.g. a double tap).
   */
  async anonymiseMember(memberId: string, userId: string, opts: AnonymiseOptions): Promise<{ photoUrls: string[] } | null> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      // Claims the row first: a second, concurrent deletion waits on this row lock and then finds nothing.
      const claimed = await tx.gymMember.updateMany({
        where: { id: memberId, status: { not: MemberStatus.DELETED } },
        data: { status: MemberStatus.DELETED, deletedAt: now, updatedAt: now },
      });
      if (claimed.count === 0) return null;

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
      const [prPhotos, foodPhotos] = await Promise.all([
        tx.memberPrSubmission.findMany({ where: { memberId }, select: { photoUrl: true } }),
        tx.memberFoodLog.findMany({ where: { memberId, photoUrl: { not: null } }, select: { photoUrl: true } }),
      ]);
      // Photo URLs come from clients, so one may be shared with (or copied from) another member's submission.
      const prUrls = prPhotos.map((row) => row.photoUrl);
      const sharedPr = await tx.memberPrSubmission.findMany({
        where: { photoUrl: { in: prUrls }, memberId: { not: memberId } },
        select: { photoUrl: true },
      });
      const shared = new Set(sharedPr.map((row) => row.photoUrl));

      const byMember = { where: { memberId } };
      await tx.memberProfile.deleteMany(byMember);
      await tx.memberPrivacy.deleteMany(byMember);
      await tx.memberWeightLog.deleteMany(byMember);
      await tx.memberFoodLog.deleteMany(byMember);
      await tx.memberFitnessPlan.deleteMany(byMember);
      await tx.memberWorkoutPlan.deleteMany(byMember);
      await tx.memberMealPlan.deleteMany(byMember);
      await tx.workoutSession.deleteMany(byMember);
      await tx.memberPrSubmission.deleteMany(byMember);
      await tx.memberBadge.deleteMany(byMember);
      await tx.checkIn.updateMany({ where: { memberId, checkedOutAt: null }, data: { checkedOutAt: now } });

      const placeholder = await tx.user.create({
        data: { email: deletedEmail('member', memberId), fullName: DELETED_NAME, isActive: false, deletedAt: now },
        select: { id: true },
      });
      await tx.gymMember.update({
        where: { id: memberId },
        data: {
          userId: placeholder.id,
          qrCodeToken: generateQrToken(),
          promoId: null,
          updatedAt: now,
        },
      });

      // Bulk-invite rows hold the email and name the gym typed in.
      await tx.memberInviteOutbox.deleteMany({ where: { gymId: opts.gymId, email: user.email } });

      if (!opts.anonymiseLogin && !opts.isStaffHere) {
        // The login stays for another gym or role, but their chat here was part of the member side.
        const inThisGym = { conversation: { gymId: opts.gymId } };
        await tx.message.updateMany({ where: { senderId: userId, ...inThisGym }, data: { content: null, metadata: {}, isDeleted: true } });
        await tx.messageReaction.deleteMany({ where: { userId, message: inThisGym } });
        await tx.messageRead.deleteMany({ where: { userId, message: inThisGym } });
        await tx.conversationMember.deleteMany({ where: { userId, ...inThisGym } });
      }

      if (opts.anonymiseLogin) {
        const byUser = { where: { userId } };
        await tx.refreshToken.deleteMany(byUser);
        await tx.userToken.deleteMany(byUser);
        await tx.deviceToken.deleteMany(byUser);
        await tx.notificationLog.deleteMany(byUser);
        await tx.conversationMember.deleteMany(byUser);
        await tx.messageReaction.deleteMany(byUser);
        await tx.messageRead.deleteMany(byUser);
        await tx.announcementRead.deleteMany(byUser);
        await tx.message.updateMany({ where: { senderId: userId }, data: { content: null, metadata: {}, isDeleted: true } });
        await tx.user.update({
          where: { id: userId },
          data: {
            email: deletedEmail('user', userId),
            fullName: DELETED_NAME,
            phone: null,
            passwordHash: null,
            isActive: false,
            emailVerifiedAt: null,
            deletedAt: now,
            updatedAt: now,
          },
        });
      }

      const photoUrls = [
        ...prUrls.filter((url) => !shared.has(url)),
        ...foodPhotos.map((row) => row.photoUrl).filter((url): url is string => Boolean(url)),
      ];
      return { photoUrls };
    });
  }

  updateStatus(memberId: string, status: string) {
    return this.prisma.gymMember.update({
      where: { id: memberId },
      data: { status, updatedAt: new Date() },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  /**
   * Hard-delete a gym member and their associated data.
   * Deletes check-ins and renewals first (both have onDelete: Restrict on GymMember).
   * Then deletes the GymMember row (cascades to profile, weight logs, food logs, etc.).
   * Finally deletes the User if they have no remaining gym memberships or staff records,
   * which frees the email address for reuse.
   */
  async removeMember(memberId: string, gymId: string): Promise<{ userDeleted: boolean }> {
    const member = await this.prisma.gymMember.findFirst({
      where: { id: memberId, gymId },
      select: { id: true, userId: true },
    });
    if (!member) return { userDeleted: false };

    await this.prisma.$transaction(async (tx) => {
      // Must delete Restrict-constrained children before the parent GymMember row.
      await tx.checkIn.deleteMany({ where: { memberId: member.id } });
      await tx.membershipRenewal.deleteMany({ where: { memberId: member.id } });
      await tx.gymMember.delete({ where: { id: member.id } });
    });

    // Check remaining associations for the user outside the transaction so we
    // can make a clean decision without holding locks longer than necessary.
    const [remainingMemberships, remainingStaff] = await Promise.all([
      this.prisma.gymMember.count({ where: { userId: member.userId } }),
      this.prisma.gymStaff.count({ where: { userId: member.userId } }),
    ]);

    if (remainingMemberships === 0 && remainingStaff === 0) {
      await this.prisma.user.delete({ where: { id: member.userId } });
      return { userDeleted: true };
    }

    return { userDeleted: false };
  }

  /**
   * Full registration transaction:
   * 1. Create user
   * 2. Generate unique membership_number + qr_code_token
   * 3. Create gym_member
   * 4. Create member_privacy
   * 5. Enroll in default community conversation (if exists)
   * 6. Create invite token
   */
  findMyProfile(memberId: string) {
    return this.prisma.memberProfile.findUnique({
      where: { memberId },
    });
  }

  upsertMyProfile(memberId: string, data: ProfileUpdateData) {
    return this.prisma.memberProfile.upsert({
      where: { memberId },
      create: { memberId, ...data, updatedAt: new Date() },
      update: { ...data, updatedAt: new Date() },
    });
  }

  /**
   * Saves the profile with consent cleared and deletes the plans calculated from the
   * member's health data, in one transaction.
   */
  async withdrawHealthDataConsent(memberId: string, data: ProfileUpdateData) {
    const values = { ...data, healthDataConsentAt: null, updatedAt: new Date() };
    const [profile] = await this.prisma.$transaction([
      this.prisma.memberProfile.upsert({
        where: { memberId },
        create: { memberId, ...values },
        update: values,
      }),
      this.prisma.memberFitnessPlan.deleteMany({ where: { memberId } }),
    ]);
    return profile;
  }

  findProfileByMemberId(memberId: string) {
    return this.prisma.memberProfile.findUnique({ where: { memberId } });
  }

  logWeight(memberId: string, weightKg: number, notes?: string) {
    return this.prisma.memberWeightLog.create({
      data: { memberId, weightKg, notes },
      select: { id: true, weightKg: true, notes: true, loggedAt: true },
    });
  }

  listWeightLogs(memberId: string, limit: number) {
    return this.prisma.memberWeightLog.findMany({
      where: { memberId },
      select: { id: true, weightKg: true, notes: true, loggedAt: true },
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });
  }

  async registerMember(input: {
    gymId: string;
    email: string;
    fullName: string;
    phone?: string;
    planId?: string;
    expiryDate: Date;
  }): Promise<{ memberId: string; userId: string; membershipNumber: string; inviteToken: string }> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);

    const membershipNumber = generateMembershipNumber();
    const qrCodeToken = generateQrToken();
    const rawToken = randomBytes(32).toString('hex');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, fullName: input.fullName, phone: input.phone },
        select: { id: true },
      });

      const member = await tx.gymMember.create({
        data: {
          gymId: input.gymId,
          userId: user.id,
          membershipPlanId: input.planId ?? null,
          membershipNumber,
          qrCodeToken,
          expiryDate: input.expiryDate,
        },
        select: { id: true },
      });

      await tx.memberPrivacy.create({
        data: { memberId: member.id },
      });

      const defaultConversation = await tx.conversation.findFirst({
        where: { gymId: input.gymId, isDefault: true },
        select: { id: true },
      });

      if (defaultConversation) {
        await tx.conversationMember.create({
          data: { conversationId: defaultConversation.id, userId: user.id },
        });
      }

      await tx.userToken.create({
        data: { userId: user.id, token: rawToken, type: 'MEMBER_INVITE', expiresAt },
      });

      return {
        memberId: member.id,
        userId: user.id,
        membershipNumber,
        inviteToken: rawToken,
      };
    });
  }

  // ── Bulk invite ──────────────────────────────────────────────────────────────

  /** Which of the given emails already belong to a user. */
  async findExistingEmails(emails: string[]): Promise<Set<string>> {
    const found = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    return new Set(found.map((u) => u.email));
  }

  /**
   * Creates one member (no email sent) and enqueues its invite for the async sender,
   * in a single transaction so a created member always has a queued invite. Throws on
   * a per-row failure (e.g. an email taken since validation) so the caller can skip it.
   */
  async bulkCreateMemberWithOutbox(input: {
    gymId: string;
    email: string;
    fullName: string;
    expiryDate: Date;
  }): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TOKEN_EXPIRY_DAYS);
    const membershipNumber = generateMembershipNumber();
    const qrCodeToken = generateQrToken();
    const rawToken = randomBytes(32).toString('hex');

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, fullName: input.fullName },
        select: { id: true },
      });

      const member = await tx.gymMember.create({
        data: {
          gymId: input.gymId,
          userId: user.id,
          membershipNumber,
          qrCodeToken,
          expiryDate: input.expiryDate,
        },
        select: { id: true },
      });

      await tx.memberPrivacy.create({ data: { memberId: member.id } });

      const defaultConversation = await tx.conversation.findFirst({
        where: { gymId: input.gymId, isDefault: true },
        select: { id: true },
      });
      if (defaultConversation) {
        await tx.conversationMember.create({
          data: { conversationId: defaultConversation.id, userId: user.id },
        });
      }

      await tx.userToken.create({
        data: { userId: user.id, token: rawToken, type: 'MEMBER_INVITE', expiresAt },
      });

      await tx.memberInviteOutbox.create({
        data: { gymId: input.gymId, email: input.email, fullName: input.fullName, token: rawToken },
      });
    });
  }

  /** Unsent invites that haven't exhausted their retries, oldest first. */
  listPendingInvites(limit: number, maxAttempts: number) {
    return this.prisma.memberInviteOutbox.findMany({
      where: { sentAt: null, attempts: { lt: maxAttempts } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        token: true,
        gym: { select: { name: true, code: true, profile: { select: { logoUrl: true, primaryColor: true } } } },
      },
    });
  }

  markInviteSent(id: string) {
    return this.prisma.memberInviteOutbox.update({ where: { id }, data: { sentAt: new Date() } });
  }

  markInviteFailed(id: string) {
    return this.prisma.memberInviteOutbox.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async upsertDeviceToken(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, updatedAt: new Date() },
    });
  }
}
