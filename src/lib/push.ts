// Qurilmani backendda ro'yxatdan o'tkazish (PUT /devices) va Expo push tokeni.
//
// Token faqat haqiqiy qurilmada, EAS projectId bor build'da (Expo Go emas) olinadi: app.json →
// extra.eas.projectId. Token bo'lmasa ham qurilma ro'yxatga olinadi — bildirishnomalar ilova ichidagi
// «Bildirishnomalar» bo'limiga baribir tushadi, push esa token paydo bo'lgach ishlaydi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { registerDevice } from './account-api';

const ID_KEY = 'yt:deviceId';

async function installId(): Promise<string> {
  const saved = await AsyncStorage.getItem(ID_KEY).catch(() => null);
  if (saved) return saved;
  const id = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(ID_KEY, id).catch(() => {});
  return id;
}

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ?? Constants.easConfig?.projectId;

async function pushToken(): Promise<string | undefined> {
  const pid = projectId();
  if (Platform.OS === 'web' || !Device.isDevice || !pid) return undefined;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return undefined; // Expo Go
  const N = await import('expo-notifications');
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', { name: 'YUMS', importance: N.AndroidImportance.HIGH });
  }
  let { status } = await N.getPermissionsAsync();
  if (status !== 'granted') status = (await N.requestPermissionsAsync()).status;
  if (status !== 'granted') return undefined;
  return (await N.getExpoPushTokenAsync({ projectId: pid })).data;
}

/** Kirgandan keyin chaqiriladi; xatolar jim o'tadi (ilova ishlashiga ta'sir qilmaydi) */
export async function registerThisDevice(): Promise<void> {
  const token = await pushToken().catch(() => undefined);
  await registerDevice({
    deviceId: await installId(),
    platform: Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB',
    pushToken: token,
    appVersion: Constants.expoConfig?.version,
  });
}
