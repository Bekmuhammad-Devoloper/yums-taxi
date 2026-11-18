// Yangilanish tekshiruvi: har APK'da yig'ilish raqami bor (GitHub Actions run raqami, app.config.js → extra.build),
// eng so'nggisi esa Releases'dagi version.json'da. Telefondagi raqam kichik bo'lsa — «Ilovani yangilang» oynasi.
// Faqat GitHub'da yig'ilgan Android APK'da ishlaydi: Expo Go, veb va lokal yig'ilishda raqam yo'q — tekshirilmaydi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { PLAY_BUILD } from './distribution';

export type Release = { build: number; commit?: string; builtAt?: string; minBuild?: number };

const extra = (Constants.expoConfig?.extra ?? {}) as { build?: number; appVariant?: string };
/** Shu ilovaning yig'ilish raqami (0 — noma'lum: tekshiruv o'chiq) */
export const LOCAL_BUILD = Number(extra.build) || 0;
const RELEASE_URL = process.env.EXPO_PUBLIC_APK_RELEASE_URL?.replace(/\/+$/, '');
const APK_FILE = extra.appVariant === 'driver' ? 'YUMS-Driver.apk' : 'YUMS.apk';

/** Yangi APK'ni yuklab olish havolasi */
export const APK_URL = RELEASE_URL ? `${RELEASE_URL}/${APK_FILE}` : null;

// Play'dan o'rnatilgan ilova faqat Play orqali yangilanadi (Play qoidasi: o'zini o'zi yangilamaydi)
export const updateCheckEnabled = Platform.OS === 'android' && !PLAY_BUILD && LOCAL_BUILD > 0 && !!RELEASE_URL;

/** Releases'dagi eng so'nggi yig'ilish; tarmoq yoki fayl bo'lmasa — null (hech narsa ko'rsatilmaydi) */
export async function latestRelease(): Promise<Release | null> {
  if (!updateCheckEnabled) return null;
  try {
    // ?t= — oraliq keshlar eski faylni bermasin
    const response = await fetch(`${RELEASE_URL}/version.json?t=${Date.now()}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<Release>;
    return typeof body.build === 'number' && body.build > 0 ? (body as Release) : null;
  } catch {
    return null;
  }
}

// «Keyinroq» bosilgan versiya shu muddat qayta so'ralmaydi
const SNOOZE_KEY = 'yums.update.snooze';
const SNOOZE_MS = 12 * 60 * 60 * 1000;

export async function isSnoozed(build: number): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SNOOZE_KEY);
    const saved = raw ? (JSON.parse(raw) as { build: number; until: number }) : null;
    return !!saved && saved.build === build && saved.until > Date.now();
  } catch {
    return false;
  }
}

export async function snooze(build: number): Promise<void> {
  await AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify({ build, until: Date.now() + SNOOZE_MS })).catch(() => {});
}
