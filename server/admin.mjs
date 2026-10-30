// Admin panel kanali: kirish (parol → vaqtinchalik token), boshlang'ich holat, o'zgarishlar oqimi va operator buyruqlari.
// Parol: ADMIN_PASSWORD muhit o'zgaruvchisi. Berilmasa, har ishga tushishda tasodifiy parol yaratilib konsolga chiqariladi.
import crypto from 'node:crypto';

import { db } from './db.mjs';
import {
  blockDriver, bus, decideDoc, docPhotos, DOC_KINDS, removeZone, setConfig, setContent, setZone, unblockDriver, updateLead,
} from './registry.mjs';

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
export const PASSWORD_GENERATED = !process.env.ADMIN_PASSWORD;
const SECRET = crypto.randomBytes(32);
const TOKEN_TTL = 12 * 3600000;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const sign = (exp) => crypto.createHmac('sha256', SECRET).update(String(exp)).digest('base64url');

/* ---------- Kirish ---------- */

const attempts = new Map(); // ip → urinishlar vaqti

/** @returns {{ token: string, exp: number } | { error: string, status: number }} */
export function login(password, ip) {
  const t = Date.now();
  const list = (attempts.get(ip) ?? []).filter(x => t - x < 10 * 60000);
  if (list.length >= 8) return { error: "Juda ko'p urinish — 10 daqiqadan so'ng qayta urinib ko'ring", status: 429 };
  if (!crypto.timingSafeEqual(sha(password), sha(ADMIN_PASSWORD))) {
    attempts.set(ip, [...list, t]);
    return { error: "Parol noto'g'ri", status: 401 };
  }
  attempts.delete(ip);
  const exp = t + TOKEN_TTL;
  return { token: `${exp}.${sign(exp)}`, exp };
}

export function verify(token) {
  const [exp, sig] = String(token ?? '').split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const want = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

/* ---------- Ko'rinishlar (panelga yuboriladigan shakl) ---------- */

/** Hujjat rasmlarisiz (ular so'rov bilan alohida olinadi) */
const docMeta = (d) => {
  const { front, back, ...rest } = d;
  return { ...rest, hasFront: !!front, hasBack: !!back, sample: front === 'sample' };
};

/** Profil rasmi alohida xabarda — har o'zgarishda qayta yuborilmasin */
export function driverView(r) {
  const { photo, ...profile } = r.profile;
  return {
    id: r.id, ...profile, hasPhoto: !!photo, createdAt: r.createdAt, lastSeen: r.lastSeen, blocked: r.blocked, stats: r.stats,
    docs: Object.fromEntries(DOC_KINDS.filter(k => r.docs[k]).map(k => [k, docMeta(r.docs[k])])),
  };
}

/* ---------- Ulangan panellar ---------- */

const admins = new Set();
const photoKey = new Map();
const keyOf = (photo) => (photo ? photo.length + photo.slice(-24) : '');
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const toAdmins = (m) => { if (admins.size) { const s = JSON.stringify(m); for (const ws of admins) if (ws.readyState === 1) ws.send(s); } };

/**
 * @param ws panel ulanishi
 * @param live dispetcherdan liniyadagi haydovchilar holati
 */
export function attach(ws, live) {
  admins.add(ws);
  const drivers = Object.values(db.drivers);
  for (const r of drivers) photoKey.set(r.id, keyOf(r.profile.photo));
  send(ws, {
    t: 'admin:init', at: new Date().toISOString(),
    drivers: drivers.map(driverView),
    photos: Object.fromEntries(drivers.filter(r => r.profile.photo).map(r => [r.id, r.profile.photo])),
    live: live(),
    orders: db.orders.slice(-3000),
    leads: db.leads,
    config: db.config,
    content: db.content,
    log: db.log.slice(-300),
  });
  ws.on('close', () => admins.delete(ws));
}

/** Liniyadagi haydovchilar (joylashuv, bandlik) — dispetcher har soniyada chaqiradi */
export const pushLive = (live) => toAdmins({ t: 'admin:live', at: new Date().toISOString(), live });

bus.on('driver', r => {
  const k = keyOf(r.profile.photo);
  if (photoKey.get(r.id) !== k) { photoKey.set(r.id, k); toAdmins({ t: 'admin:photo', id: r.id, photo: r.profile.photo ?? null }); }
  toAdmins({ t: 'admin:driver', driver: driverView(r) });
});
bus.on('order', o => toAdmins({ t: 'admin:order', order: o }));
bus.on('lead', l => toAdmins({ t: 'admin:lead', lead: l }));
bus.on('log', e => toAdmins({ t: 'admin:log', entry: e }));
bus.on('config', () => toAdmins({ t: 'admin:config', config: db.config }));
bus.on('content', () => toAdmins({ t: 'admin:content', content: db.content }));

/* ---------- Buyruqlar ---------- */

/**
 * Panel buyrug'i. Natija `admin:ack` bilan qaytadi (ref — panel so'rov raqami).
 * Dispetcherga tegishli amallar (bekor qilish, xabar yuborish) `bus` orqali uzatiladi.
 */
export function command(ws, m) {
  const ack = (ok, error, data) => send(ws, { t: 'admin:ack', ref: m.ref, ok, error, ...data });
  switch (m.cmd) {
    case 'docDecision':
      return ack(decideDoc(m.driverId, m.kind, m.status, m.note, 'admin'), 'Hujjat topilmadi');
    case 'docPhotos': {
      const p = docPhotos(m.driverId, m.kind);
      return p ? ack(true, undefined, { photos: p }) : ack(false, 'Hujjat topilmadi');
    }
    case 'block':
      return ack(blockDriver(m.driverId, m.reason), 'Haydovchi topilmadi');
    case 'unblock':
      return ack(unblockDriver(m.driverId), 'Haydovchi bloklanmagan');
    case 'notice': {
      const title = String(m.title ?? '').trim().slice(0, 80), text = String(m.text ?? '').trim().slice(0, 500);
      if (!title && !text) return ack(false, 'Xabar matnini yozing');
      let sent = 0;
      bus.emit('notice', m.target ?? 'all', { title, text }, (n) => { sent = n; });
      return ack(true, undefined, { sent });
    }
    case 'cancelOrder': {
      let ok = false;
      bus.emit('adminCancel', m.orderId, (r) => { ok = r; });
      return ack(ok, 'Buyurtma faol emas');
    }
    case 'config':
      return ack(setConfig(m.patch), "O'zgarish yo'q");
    case 'zone': {
      const z = setZone(m.zone);
      return z ? ack(true, undefined, { zone: z }) : ack(false, "Hudud ma'lumotlari noto'g'ri");
    }
    case 'zoneRemove':
      return ack(removeZone(m.id), 'Hudud topilmadi');
    case 'lead':
      return ack(updateLead(m.id, m.patch), 'Ariza topilmadi');
    case 'content':
      setContent(m.content);
      return ack(true);
    default:
      return ack(false, "Noma'lum buyruq");
  }
}
