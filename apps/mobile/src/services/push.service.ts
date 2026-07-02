import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { memberService } from './member.service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Subscribe to notification taps. When the user taps a push, we route by the
 * `screen` field in the notification's `data` payload (set server-side).
 * Returns an unsubscribe function for cleanup.
 */
export function subscribeToNotificationTaps(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | { screen?: string; type?: string }
      | undefined;
    routeFromNotification(data);
  });

  // Also handle the case where the app was launched cold from a push.
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    const data = response.notification.request.content.data as
      | { screen?: string; type?: string }
      | undefined;
    routeFromNotification(data);
  });

  return () => subscription.remove();
}

function routeFromNotification(data: { screen?: string; type?: string } | undefined) {
  if (!data?.screen) return;
  switch (data.screen) {
    case 'membership':
      router.push('/(member)/membership');
      return;
    default:
      return;
  }
}

export async function registerPushToken(gymId: string): Promise<void> {
  // Push tokens only exist on physical devices
  if (!Device.isDevice) return;

  type PermResult = { granted: boolean };
  const existing = (await Notifications.getPermissionsAsync()) as unknown as PermResult;

  if (!existing.granted) {
    const requested = (await Notifications.requestPermissionsAsync()) as unknown as PermResult;
    if (!requested.granted) return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  await memberService.registerDeviceToken(gymId, token, platform);
}
