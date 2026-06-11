import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
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
