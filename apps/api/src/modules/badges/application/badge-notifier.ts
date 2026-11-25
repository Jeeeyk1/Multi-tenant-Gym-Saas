import { Injectable, Logger } from '@nestjs/common';
import type Expo from 'expo-server-sdk';
import type { ExpoPushMessage } from 'expo-server-sdk';
import { BadgesRepository } from '../infrastructure/persistence/badges.repository';

const NOTIFICATION_TYPE = 'BADGE_EARNED';
// Expo's error messages can quote the device token; it must never reach the logs.
const PUSH_TOKEN_PATTERN = /Expo(nent)?PushToken\[[^\]]*\]/g;

/**
 * Push notification when a member earns badges. Never throws (badges are already saved),
 * so callers fire it with `void` instead of waiting on Expo.
 */
@Injectable()
export class BadgeNotifier {
  private readonly logger = new Logger(BadgeNotifier.name);
  private expo: Expo | null = null;

  constructor(private readonly repo: BadgesRepository) {}

  // Loaded on first use: the SDK is ESM, and loading it lazily keeps every module that
  // awards badges (check-ins, workouts, leaderboard) loadable in Jest.
  private async client(): Promise<{ expo: Expo; isToken: (t: string) => boolean }> {
    const { default: ExpoClient } = await import('expo-server-sdk');
    this.expo ??= new ExpoClient();
    return { expo: this.expo, isToken: (t) => ExpoClient.isExpoPushToken(t) };
  }

  async notify(memberId: string, badgeNames: string[]): Promise<void> {
    if (badgeNames.length === 0) return;
    try {
      const target = await this.repo.findMemberPushTargets(memberId);
      const all = (target?.user.deviceTokens ?? []).map((t) => t.token);
      if (all.length === 0) return;
      const { expo, isToken } = await this.client();
      const tokens = all.filter(isToken);
      if (tokens.length === 0) return;

      const body =
        badgeNames.length === 1 ? `You earned ${badgeNames[0]}.` : `You earned ${badgeNames.length} badges: ${badgeNames.join(', ')}.`;
      const messages: ExpoPushMessage[] = tokens.map((to) => ({
        to,
        title: 'New badge!',
        body,
        data: { type: NOTIFICATION_TYPE },
      }));
      let rejected = 0;
      for (const chunk of expo.chunkPushNotifications(messages)) {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status !== 'error') continue;
          rejected++;
          const msg = ticket.message.replace(PUSH_TOKEN_PATTERN, '[token]');
          this.logger.warn(`badge push rejected member=${memberId} error=${ticket.details?.error ?? 'unknown'} msg=${msg}`);
        }
      }
      this.logger.debug(`badge push sent member=${memberId} devices=${tokens.length} rejected=${rejected}`);
    } catch (err) {
      this.logger.error(`badge push failed member=${memberId}`, err instanceof Error ? err.stack : String(err));
    }
  }
}
