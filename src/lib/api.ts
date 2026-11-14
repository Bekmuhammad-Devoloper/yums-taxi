// YUMS backend (Nest) bilan aloqa: javob konverti, tokenlar va ularni yangilash.
// Qoidalar: docs/MOBILE-INTEGRATION.md (backend repo). Xatolar `code` bo'yicha ajratiladi, matn odam uchun.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Server manzili. Ishlab chiqishda EXPO_PUBLIC_API_URL xosti `auto` bo'lsa (masalan `http://auto:3000/api/v1`),
 * ilova o'zi yuklangan kompyuterni oladi: vebda — sahifa xosti, telefonda (Expo Go) — Metro serveri xosti.
 * Shunda Wi-Fi almashib kompyuter IP si o'zgarsa ham ilova serverni topadi. Prod build'da manzil aniq yoziladi.
 */
function resolveApiUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.yums.uz/api/v1').replace(/\/$/, '');
  const m = /^(https?:\/\/)auto(:\d+)?(\/.*)?$/.exec(raw);
  if (!m) return raw;
  const host = Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.location.hostname : '')
    : (Constants.expoConfig?.hostUri ?? '').split(':')[0];
  return `${m[1]}${host || 'localhost'}${m[2] ?? ''}${m[3] ?? ''}`;
}

export const API_URL = resolveApiUrl();

const TOKENS_KEY = 'yums.tokens';
const REQUEST_TIMEOUT_MS = 20_000;

export type Tokens = { accessToken: string; refreshToken: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type Failure = { error?: { code?: string; message?: string; details?: Record<string, unknown> } };

// SecureStore vebda ishlamaydi; veb — faqat sinov uchun
const vault = {
  get: () => (Platform.OS === 'web' ? AsyncStorage.getItem(TOKENS_KEY) : SecureStore.getItemAsync(TOKENS_KEY)),
  set: (value: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(TOKENS_KEY, value) : SecureStore.setItemAsync(TOKENS_KEY, value)),
  clear: () => (Platform.OS === 'web' ? AsyncStorage.removeItem(TOKENS_KEY) : SecureStore.deleteItemAsync(TOKENS_KEY)),
};

let tokens: Tokens | null = null;
let restored = false;
let refreshing: Promise<boolean> | null = null;
let onSessionLost: () => void = () => {};

/** Sessiya tugaganda (refresh rad etilsa) chaqiriladi: ilova foydalanuvchini kirishga qaytaradi */
export const setSessionLostHandler = (handler: () => void) => { onSessionLost = handler; };

async function currentTokens(): Promise<Tokens | null> {
  if (restored) return tokens;
  const raw = await vault.get().catch(() => null);
  tokens = raw ? (JSON.parse(raw) as Tokens) : null;
  restored = true;
  return tokens;
}

export const hasSession = async (): Promise<boolean> => (await currentTokens()) !== null;

/** Realtime ulanish uchun joriy kirish tokeni */
export const accessToken = async (): Promise<string | null> => (await currentTokens())?.accessToken ?? null;

export async function saveTokens(next: Tokens): Promise<void> {
  tokens = next;
  restored = true;
  await vault.set(JSON.stringify({ accessToken: next.accessToken, refreshToken: next.refreshToken }));
}

export async function clearTokens(): Promise<void> {
  tokens = null;
  restored = true;
  await vault.clear().catch(() => {});
}

async function send(method: string, path: string, body: unknown, token?: string, extra?: Record<string, string>): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', "Internet aloqasini tekshiring");
  }
}

async function read<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (response.ok) return (payload as { data: T }).data;
  const error = (payload as Failure | null)?.error;
  throw new ApiError(response.status, error?.code ?? 'UNKNOWN', error?.message ?? 'Xatolik yuz berdi', error?.details);
}

/**
 * Refresh token bir martalik: juftlik ishlatilishidan oldin saqlanadi va javobi yo'qolgan so'rov
 * qayta yuborilmaydi — takrorlangan token o'g'irlik deb hisoblanib, butun sessiya yopiladi.
 */
function refreshOnce(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = (await currentTokens())?.refreshToken;
      if (!refreshToken) return false;
      const next = await read<Tokens>(await send('POST', '/auth/refresh', { refreshToken }));
      await saveTokens(next);
      return true;
    } catch {
      await clearTokens();
      onSessionLost();
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Rol o'zgargach yangi token olish uchun */
export const refreshSession = refreshOnce;

export async function api<T>(method: string, path: string, body?: unknown, retried?: boolean, headers?: Record<string, string>): Promise<T> {
  const token = (await currentTokens())?.accessToken;
  const response = await send(method, path, body, token, headers);
  if (response.status !== 401 || retried) return read<T>(response);

  const failure = await read<T>(response).catch((error: unknown) => error);
  if (failure instanceof ApiError && failure.code === 'TOKEN_EXPIRED' && (await refreshOnce())) {
    return api<T>(method, path, body, true, headers);
  }
  throw failure;
}

/** Foydalanuvchiga ko'rsatiladigan matn: server xabari yoki umumiy xato */
export const errorText = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Xatolik yuz berdi';
