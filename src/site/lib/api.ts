// Sayt va admin panelning server bilan aloqasi.
// Server manzili EXPO_PUBLIC_DISPATCH_URL (ws://…) dan olinadi (yoki EXPO_PUBLIC_API_URL). Berilmasa — demo rejim:
// sozlamalar, sayt matni va arizalar brauzer xotirasida saqlanadi, admin panel (demo) ham shularni o'qiydi va yozadi.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DISPATCH_URL } from '@/lib/dispatch';
import { tr, tx } from '@/lib/i18n';
import type { RemoteConfig } from '@/lib/remote-config';

import type { ContentOverrides, Lang } from './content';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? DISPATCH_URL?.replace(/^ws/, 'http').replace(/\/+$/, '');
export const LIVE = !!API_BASE;

export type PublicStats = { driversOnline: number; driversFree: number; tripsToday: number; avgPickupMin: number | null; rating: number | null };
export type PublicData = { config: RemoteConfig; content: ContentOverrides; stats: PublicStats | null };

/** Admin sozlamalari: ilovalarga yuboriladiganlardan tashqari — hujjatlarni avtomatik tekshirish */
export type AdminConfig = RemoteConfig & { autoApprove: boolean };

export type LeadInput = { name: string; phone: string; city?: string; car?: string; year?: number; tariffs?: string[]; lang: Lang; website?: string };
export type LeadStatus = 'new' | 'contacted' | 'approved' | 'rejected';
export type Lead = { id: string; at: string; name: string; phone: string; city?: string; car?: string; year?: number; tariffs?: string[]; lang?: Lang; status: LeadStatus; note?: string; updatedAt?: string };

/* ---------- Demo xotira (server yo'q) ---------- */

export const DEMO_KEYS = { config: 'yums:demo:config', content: 'yums:demo:content', leads: 'yums:demo:leads', seeded: 'yums:demo:seeded' };
export const EMPTY_CONFIG: AdminConfig = { tariffs: {}, commission: null, zones: [], autoApprove: true };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export const demoRead = {
  config: () => readJson<AdminConfig>(DEMO_KEYS.config, EMPTY_CONFIG),
  content: () => readJson<ContentOverrides>(DEMO_KEYS.content, {}),
  leads: () => readJson<Lead[]>(DEMO_KEYS.leads, []),
  /** namunaviy arizalar bir marta qo'shilgan */
  seeded: () => readJson<boolean>(DEMO_KEYS.seeded, false),
};
export const demoWrite = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});

/* ---------- So'rovlar ---------- */

async function call<T>(path: string, init?: RequestInit, ms = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(API_BASE + path, { ...init, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...init?.headers } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error ?? `Server xatosi (${res.status})`);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Sayt uchun: narxlar, hududlar, matn va jonli ko'rsatkichlar */
export async function fetchPublic(): Promise<PublicData> {
  if (LIVE) {
    try {
      const r = await call<PublicData & { ok: boolean }>('/api/public');
      return { config: r.config, content: r.content ?? {}, stats: r.stats ?? null };
    } catch {
      // server javob bermadi — standart narx va matn bilan ko'rsatamiz
      return { config: EMPTY_CONFIG, content: {}, stats: null };
    }
  }
  const [config, content] = await Promise.all([demoRead.config(), demoRead.content()]);
  return { config, content, stats: null };
}

/** Ariza yuborishdagi xatolar: server matni o'zbekcha keladi — saytda foydalanuvchi tilida ko'rsatiladi */
const NO_SERVER = tx("Server bilan aloqa yo'q — birozdan so'ng urinib ko'ring");
const LEAD_ERRORS: string[] = [NO_SERVER, tx("Ko'p ariza yuborildi — birozdan so'ng urinib ko'ring"), tx('Ismingizni kiriting'), tx("Telefon raqamini to'g'ri kiriting"), tx("So'rov noto'g'ri")];
const leadError = (msg: string) => (LEAD_ERRORS.includes(msg) ? tr(msg) : msg);

export async function submitLead(input: LeadInput): Promise<{ ok: true } | { error: string }> {
  if (LIVE) {
    try {
      await call('/api/leads', { method: 'POST', body: JSON.stringify(input) });
      return { ok: true };
    } catch (e) {
      return { error: leadError(e instanceof Error && e.name !== 'AbortError' ? e.message : NO_SERVER) };
    }
  }
  // demo: ariza shu brauzerdagi admin panelda (demo) ko'rinadi
  const digits = input.phone.replace(/\D/g, '');
  const lead: Lead = {
    id: 'a' + Date.now().toString(36), at: new Date().toISOString(), name: input.name.trim(), phone: '+' + (digits.length === 9 ? '998' + digits : digits),
    city: input.city, car: input.car, year: input.year, tariffs: input.tariffs, lang: input.lang, status: 'new',
  };
  const list = await demoRead.leads();
  await demoWrite(DEMO_KEYS.leads, [...list, lead]);
  return { ok: true };
}

export async function adminLogin(password: string): Promise<{ token: string; exp: number } | { error: string }> {
  if (!LIVE) return { token: 'demo', exp: Date.now() + 12 * 3600000 };
  try {
    return await call<{ token: string; exp: number }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
  } catch (e) {
    return { error: e instanceof Error && e.name !== 'AbortError' ? e.message : "Server bilan aloqa yo'q" };
  }
}
