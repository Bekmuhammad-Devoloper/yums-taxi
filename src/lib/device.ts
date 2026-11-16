// Telefon nomi: «Joriy qurilma» va kirishlar tarixida «okhttp/4.12.0» o'rniga haqiqiy qurilma ko'rinadi.
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { tr } from '@/lib/i18n';

/** Ishlab chiqaruvchi va model: «Xiaomi Redmi Note 12» (model nomida ishlab chiqaruvchi bo'lsa, takrorlanmaydi) */
export function modelLabel(): string | null {
  if (Platform.OS === 'web') return null;
  const maker = (Device.manufacturer ?? Device.brand ?? '').trim();
  const model = (Device.modelName ?? '').trim();
  if (!model) return maker || null;
  const name = maker && !model.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker[0].toUpperCase()}${maker.slice(1)} ${model}` : model;
  return name;
}

/** Foydalanuvchi telefonga bergan nom (sozlamalardagi), bo'lmasa — model */
export function deviceName(): string | null {
  if (Platform.OS === 'web') return null;
  return Device.deviceName?.trim() || modelLabel();
}

export function osLabel(): string {
  return Device.osName && Device.osVersion ? `${Device.osName} ${Device.osVersion}` : Platform.OS;
}

/** So'rovlar shu nom bilan boradi — server kirishlar tarixiga yozadi (veb: brauzer o'zi qo'yadi) */
export const USER_AGENT: string | undefined = Platform.OS === 'web'
  ? undefined
  : `YUMS/1.0 (${(modelLabel() ?? 'device').replace(/[()]/g, '')}; ${osLabel()})`;

/** Server yozuvidagi qurilmani odam o'qiydigan qilib: «Xiaomi Redmi Note 12 · Android 14», «Android ilova», «Chrome» */
export function prettyDevice(ua?: string | null): string {
  if (!ua || ua === '—') return tr("Noma'lum qurilma");
  const own = ua.match(/^YUMS\/[\d.]+ \(([^;]+); ([^)]+)\)/);
  if (own) return `${own[1]} · ${own[2]}`;
  if (/^okhttp\//i.test(ua)) return tr('Android ilova');
  if (/CFNetwork|Darwin/i.test(ua)) return tr('iPhone ilova');
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return ua.length > 40 ? `${ua.slice(0, 40)}…` : ua;
}
