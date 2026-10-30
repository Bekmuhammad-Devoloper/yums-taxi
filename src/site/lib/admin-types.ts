// Admin panel ma'lumotlari: server (server/admin.mjs) yuboradigan shakl va panel buyruqlari.
import type { DocKind, DocStatus } from '@/driver/lib/docs';
import type { Gender, LatLng, PaymentId } from '@/lib/data';

import type { AdminConfig, Lead } from './api';
import type { ContentOverrides } from './content';

export type DriverStats = {
  offers: number; accepted: number; declined: number; missed: number; cancelled: number; completed: number; noShow: number;
  revenue: number; ratings: number; ratingSum: number; lowRatings: number;
};

/** Hujjat (rasmlarsiz — ular so'rov bilan olinadi) */
export type DocMeta = {
  kind: DocKind; number: string; issued?: string; expires?: string; categories?: string;
  status: Exclude<DocStatus, 'missing'>; note?: string; submittedAt?: string; receivedAt?: string; checkedAt?: string; by?: 'auto' | 'admin';
  hasFront: boolean; hasBack: boolean; sample: boolean;
};

export type AdminDriver = {
  id: string; name: string; phone?: string; gender?: Gender; car?: string; color?: string; plate?: string; year?: number; city?: string;
  joinedAt?: string; rating?: number; trips?: number; tariffs?: string[];
  hasPhoto: boolean; createdAt: string; lastSeen?: string;
  blocked?: { reason: string; at: string };
  stats: DriverStats;
  docs: Partial<Record<DocKind, DocMeta>>;
};

/** Liniyadagi haydovchi (pending — liniyaga chiqmoqchi, hujjatlari tekshirilmoqda) */
export type LiveDriver = { id: string; busy: boolean; pending?: boolean; pos?: LatLng; heading?: number; orderId?: string; nextOrderId?: string; offering?: string; tariffs?: string[] };

export type OrderStatus = 'searching' | 'accepted' | 'arrived' | 'started' | 'finished' | 'cancelled' | 'failed' | 'noShow';
export type OrderEvent = { t: string; at: string; driverId?: string };
export type OrderRec = {
  id: string; createdAt: string; status: OrderStatus;
  pickup: LatLng & { title: string }; destination: LatLng & { title: string };
  km: number; min: number; price: number; finalPrice?: number; tariffId: string; payment: PaymentId | string; surge?: number; options?: string[];
  passenger: { id?: string; name: string; phone?: string; rating: number };
  driverId?: string; driverName?: string; offers: number; timeline: OrderEvent[];
  cancelReason?: 'passenger' | 'noDriver' | 'noShow' | 'admin'; stars?: number; tip?: number; chain?: boolean;
};

export type LogEntry = { id: string; at: string; kind: 'admin' | 'auto' | 'system'; text: string; driverId?: string; leadId?: string };

/** Serverdan panelga keladigan xabarlar */
export type AdminServerMsg =
  | { t: 'admin:init'; at: string; drivers: AdminDriver[]; photos: Record<string, string>; live: LiveDriver[]; orders: OrderRec[]; leads: Lead[]; config: AdminConfig; content: ContentOverrides; log: LogEntry[] }
  | { t: 'admin:live'; at: string; live: LiveDriver[] }
  | { t: 'admin:driver'; driver: AdminDriver }
  | { t: 'admin:photo'; id: string; photo: string | null }
  | { t: 'admin:order'; order: OrderRec }
  | { t: 'admin:lead'; lead: Lead }
  | { t: 'admin:log'; entry: LogEntry }
  | { t: 'admin:config'; config: AdminConfig }
  | { t: 'admin:content'; content: ContentOverrides }
  | { t: 'admin:ack'; ref: number; ok: boolean; error?: string; sent?: number; photos?: { front?: string; back?: string } }
  | { t: 'admin:denied' };

/** Xabar kimga: hammaga, liniyadagilarga, bo'shlarga, nuqta atrofidagilarga yoki bitta haydovchiga (id) */
export type NoticeTarget = 'all' | 'online' | 'free' | { near: LatLng; km: number } | string;

/** Panel buyruqlari (server/admin.mjs → command) */
export type AdminCmd =
  | { cmd: 'docDecision'; driverId: string; kind: DocKind; status: 'approved' | 'rejected'; note?: string }
  | { cmd: 'docPhotos'; driverId: string; kind: DocKind }
  | { cmd: 'block'; driverId: string; reason: string }
  | { cmd: 'unblock'; driverId: string }
  | { cmd: 'notice'; target: NoticeTarget; title: string; text: string }
  | { cmd: 'cancelOrder'; orderId: string }
  | { cmd: 'config'; patch: Partial<{ tariffs: Record<string, Partial<{ base: number; perKm: number; perMin: number; minFare: number }> | null>; commission: number | null; autoApprove: boolean }> }
  | { cmd: 'zone'; zone: { id?: string; label?: string; center: LatLng; radiusKm: number; surge: number; until?: string } }
  | { cmd: 'zoneRemove'; id: string }
  | { cmd: 'lead'; id: string; patch: { status?: Lead['status']; note?: string } }
  | { cmd: 'content'; content: ContentOverrides };

export type AdminClientMsg = { t: 'admin'; ref: number } & AdminCmd;

export type Ack = Extract<AdminServerMsg, { t: 'admin:ack' }>;

/** Panel holati */
export type AdminState = {
  ready: boolean;
  at: string;
  drivers: Record<string, AdminDriver>;
  photos: Record<string, string>;
  live: Record<string, LiveDriver>;
  orders: Record<string, OrderRec>;
  leads: Lead[];
  config: AdminConfig;
  content: ContentOverrides;
  log: LogEntry[];
  /** har o'zgarishda oshadi — hisob-kitoblarni qayta bajarish uchun */
  rev: number;
};

export const ACTIVE: OrderStatus[] = ['searching', 'accepted', 'arrived', 'started'];
export const isActive = (o: OrderRec) => ACTIVE.includes(o.status);
