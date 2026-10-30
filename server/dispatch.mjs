// YUMS Taxi dispetcher serveri.
// Yo'lovchi ilovasi buyurtma yuboradi → eng yaqin bo'sh haydovchiga taklif qilinadi →
// haydovchi qabul qilsa, uning joylashuvi va holati (yetib keldi, safar, yakun) yo'lovchiga jonli uzatiladi.
// Zanjir buyurtma: safar oxiriga yaqinlashgan haydovchiga keyingi buyurtma oldindan taklif qilinadi.
// Admin panel: hujjatlarni tekshirish, bloklash, narx va yuqori talab hududlari, xabarlar (server/admin.mjs).
// Ma'lumotlar server/data/db.json da saqlanadi (server/db.mjs), sayt uchun HTTP API — server/api.mjs.
// Ishga tushirish: `node server/dispatch.mjs` (PORT, standart 8787; ADMIN_PASSWORD — admin paroli).
import http from 'node:http';
import ws from 'ws';

import { attach, command, PASSWORD_GENERATED, ADMIN_PASSWORD, pushLive, verify } from './admin.mjs';
import { handleApi } from './api.mjs';
import { DB_FILE } from './db.mjs';
import {
  bus, canWork, driverRec, orderCreated, orderRec, orderUpdate, publicConfig, receiveDoc, stat, syncDocs, upsertDriver,
} from './registry.mjs';

// ws@7 (Expo bilan keladi) va ws@8 ikkalasi ham ishlaydi
const WebSocketServer = ws.WebSocketServer ?? ws.Server;

const PORT = Number(process.env.PORT ?? 8787);
const OFFER_MS = 15000; // haydovchi taklifga javob berish vaqti

/** @type {Map<string, {ws: import('ws').WebSocket, role: 'driver'|'passenger', id: string}>} */
const clients = new Map();
/**
 * Liniyadagi haydovchilar: id → { info, pos, heading, tariffs, busy, orderId?, nextOrderId?, chainFrom?, offering? }
 * chainFrom — joriy safar manzili (haydovchi safar oxiriga yaqinlashganda yuboradi), offering — javob kutilayotgan taklif
 */
const drivers = new Map();
/** Liniyaga chiqmoqchi, lekin hujjatlari hali tekshirilmoqda — tasdiqlangach avtomatik qo'shiladi */
const waiting = new Map();
/** Buyurtmalar: id → { order, passengerId, driverId?, status, tried:Set, timer?, offeredTo? } */
const orders = new Map();

const km = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const dLat = r(b.latitude - a.latitude), dLng = r(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

const send = (key, msg) => {
  const c = clients.get(key);
  if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(msg));
};
const toPassenger = (id, msg) => id && send('passenger:' + id, msg);
const toDriver = (id, msg) => id && send('driver:' + id, msg);

/** Barcha yo'lovchilarga liniyadagi haydovchilar (soni va joylashuvi) */
const broadcastFleet = () => {
  const fleet = [...drivers.values()].filter(d => d.pos).map(d => ({ id: d.info.id, pos: d.pos, heading: d.heading ?? 0, busy: d.busy, tariffs: d.tariffs }));
  for (const c of clients.values()) if (c.role === 'passenger' && c.ws.readyState === 1) c.ws.send(JSON.stringify({ t: 'fleet', drivers: fleet }));
};

/** Bo'sh haydovchi yoki zanjir buyurtma olishga tayyor haydovchi (bloklanmagan, hujjatlari tasdiqlangan) */
const available = (d) => d.pos && !d.offering && (!d.busy || (d.chainFrom && !d.nextOrderId)) && canWork(driverRec(d.info.id));
/** Haydovchi qayerdan yo'lga chiqadi: bo'sh bo'lsa — hozirgi joyidan, band bo'lsa — joriy safar manzilidan */
const startOf = (d) => (d.busy ? d.chainFrom : d.pos);

/** Buyurtmani keyingi eng yaqin mos haydovchiga taklif qilish */
function dispatch(orderId) {
  const o = orders.get(orderId);
  if (!o || o.status !== 'searching' || o.offeredTo) return;
  clearTimeout(o.timer);
  const pick = o.order.pickup;
  const candidate = [...drivers.values()]
    .filter(d => available(d) && !o.tried.has(d.info.id) && (!d.tariffs?.length || d.tariffs.includes(o.order.tariffId)))
    // zanjir haydovchisi uchun masofaga 1 km qo'shamiz — bo'sh haydovchi ustun
    .sort((a, b) => km(startOf(a), pick) + (a.busy ? 1 : 0) - (km(startOf(b), pick) + (b.busy ? 1 : 0)))[0];
  if (!candidate) {
    // hech kim yo'q — biroz kutib, rad etganlarni ham qayta sinab ko'ramiz
    o.tried.clear();
    o.waits = (o.waits ?? 0) + 1;
    if (o.waits > 15) { // ~1 daqiqa qidiruv
      o.status = 'failed'; toPassenger(o.passengerId, { t: 'noDriver', orderId }); orders.delete(orderId);
      orderUpdate(orderId, { status: 'failed', cancelReason: 'noDriver' }, 'noDriver');
      return;
    }
    o.timer = setTimeout(() => dispatch(orderId), 4000);
    return;
  }
  const did = candidate.info.id;
  o.tried.add(did);
  o.offeredTo = did;
  candidate.offering = orderId;
  toDriver(did, { t: 'offer', order: o.order, expiresIn: OFFER_MS, distanceKm: Math.round(km(startOf(candidate), pick) * 10) / 10, chain: candidate.busy || undefined });
  stat(did, 'offers');
  orderUpdate(orderId, { offers: (orderRec(orderId)?.offers ?? 0) + 1 }, 'offer', { driverId: did });
  o.timer = setTimeout(() => {
    toDriver(did, { t: 'offerGone', orderId });
    endOffer(o, did);
    stat(did, 'missed');
    orderUpdate(orderId, {}, 'missed', { driverId: did });
    dispatch(orderId);
  }, OFFER_MS);
}

/** Taklifni yopish (qabul, rad yoki vaqt tugashi) */
function endOffer(o, driverId) {
  if (o.offeredTo === driverId) o.offeredTo = undefined;
  const d = drivers.get(driverId);
  if (d && d.offering === o.order.id) d.offering = undefined;
}

/** Kutilayotgan buyurtmalarni yangi bo'shagan haydovchilarga taklif qilish */
const dispatchWaiting = () => { for (const [oid, o] of orders) if (o.status === 'searching' && !o.offeredTo) dispatch(oid); };

/** Haydovchining joriy buyurtmasi yopildi: zanjirdagi keyingisi joriyga aylanadi yoki haydovchi bo'shaydi */
function releaseCurrent(d) {
  d.chainFrom = undefined;
  if (d.nextOrderId) { d.orderId = d.nextOrderId; d.nextOrderId = undefined; d.busy = true; }
  else { d.orderId = undefined; d.busy = false; }
}

/** Haydovchini liniyadan olish (bloklandi yoki hujjati bekor bo'ldi); javob kutilayotgan taklif boshqasiga o'tadi */
function dropFromLine(id) {
  const d = drivers.get(id);
  if (!d || d.busy) return;
  const o = d.offering && orders.get(d.offering);
  drivers.delete(id);
  if (o) { clearTimeout(o.timer); toDriver(id, { t: 'offerGone', orderId: o.order.id }); endOffer(o, id); dispatch(o.order.id); }
  broadcastFleet();
}

/** Buyurtmani yopish (yo'lovchi yoki operator bekor qildi): taklif va haydovchi bo'shatiladi */
function closeOrder(o) {
  const orderId = o.order.id;
  clearTimeout(o.timer);
  if (o.offeredTo) { toDriver(o.offeredTo, { t: 'offerGone', orderId }); endOffer(o, o.offeredTo); }
  if (o.driverId) {
    const d = drivers.get(o.driverId);
    if (d) {
      if (d.nextOrderId === orderId) d.nextOrderId = undefined;
      else if (d.orderId === orderId) releaseCurrent(d);
    }
    toDriver(o.driverId, { t: 'cancelled', orderId });
    if (d && !d.busy) dispatchWaiting();
  }
  orders.delete(orderId);
  broadcastFleet();
}

function onDriver(id, m) {
  const d = drivers.get(id);
  switch (m.t) {
    case 'sync': {
      // ilova ulandi: profil, hujjatlar holati va blok holati solishtiriladi
      const rec = upsertDriver(id, m.profile);
      if (!rec) return;
      const { need, statuses } = syncDocs(id, m.docs);
      for (const kind of need) toDriver(id, { t: 'needDoc', kind });
      for (const s of statuses) toDriver(id, { t: 'docStatus', ...s });
      toDriver(id, rec.blocked ? { t: 'blocked', reason: rec.blocked.reason } : { t: 'unblocked' });
      break;
    }
    case 'doc':
      receiveDoc(id, m.doc);
      break;
    case 'online': {
      const rec = upsertDriver(id, m.driver);
      const entry = { info: m.driver, pos: m.pos, heading: m.heading, tariffs: m.tariffs ?? [] };
      if (!d?.busy && !canWork(rec)) {
        // bloklangan yoki hujjatlari hali tasdiqlanmagan — qaror chiqqach liniyaga qo'shiladi
        if (rec?.blocked) toDriver(id, { t: 'blocked', reason: rec.blocked.reason });
        else waiting.set(id, entry);
        break;
      }
      waiting.delete(id);
      drivers.set(id, { ...d, ...entry, busy: d?.busy ?? false });
      broadcastFleet();
      dispatchWaiting();
      break;
    }
    case 'offline':
      waiting.delete(id);
      if (d && !d.busy) drivers.delete(id);
      broadcastFleet();
      break;
    case 'pos': {
      const w = waiting.get(id);
      if (w) { w.pos = m.pos; w.heading = m.heading; }
      if (!d) return;
      d.pos = m.pos; d.heading = m.heading;
      for (const oid of [d.orderId, d.nextOrderId]) {
        const o = oid && orders.get(oid);
        if (o) toPassenger(o.passengerId, { t: 'driverPos', orderId: oid, pos: m.pos, heading: m.heading });
      }
      broadcastFleet();
      break;
    }
    case 'chain':
      // safar oxiriga yaqinlashdi — keyingi buyurtmani shu manzil yaqinidan taklif qilish mumkin
      if (!d || !d.busy) return;
      d.chainFrom = m.on ? m.from : undefined;
      if (m.on) dispatchWaiting();
      break;
    case 'accept': {
      const o = orders.get(m.orderId);
      if (!o || o.status !== 'searching' || o.offeredTo !== id || !d) { toDriver(id, { t: 'offerGone', orderId: m.orderId }); return; }
      clearTimeout(o.timer);
      endOffer(o, id);
      const chain = d.busy;
      if (chain && (!d.chainFrom || d.nextOrderId)) { toDriver(id, { t: 'offerGone', orderId: m.orderId }); dispatch(m.orderId); return; }
      o.status = 'accepted'; o.driverId = id;
      if (chain) d.nextOrderId = m.orderId;
      else { d.busy = true; d.orderId = m.orderId; }
      toPassenger(o.passengerId, { t: 'accepted', orderId: m.orderId, driver: d.info, pos: d.pos, chain: chain || undefined });
      toDriver(id, { t: 'assigned', order: o.order, chain: chain || undefined });
      stat(id, 'accepted');
      orderUpdate(m.orderId, { status: 'accepted', driverId: id, driverName: d.info?.name, chain: chain || undefined }, 'accepted', { driverId: id });
      broadcastFleet();
      break;
    }
    case 'decline': {
      const o = orders.get(m.orderId);
      if (o && o.offeredTo === id) {
        clearTimeout(o.timer); endOffer(o, id);
        stat(id, 'declined');
        orderUpdate(m.orderId, {}, 'declined', { driverId: id });
        dispatch(m.orderId);
      }
      break;
    }
    case 'arrived': case 'started': case 'finished': {
      const o = orders.get(m.orderId);
      if (!o || o.driverId !== id) return;
      o.status = m.t;
      toPassenger(o.passengerId, { t: m.t, orderId: m.orderId, price: m.price });
      if (m.t === 'finished') {
        const price = typeof m.price === 'number' && m.price >= 0 && m.price < 1e8 ? m.price : o.order.price;
        orderUpdate(m.orderId, { status: 'finished', finalPrice: price }, 'finished');
        stat(id, { completed: 1, revenue: price });
      } else {
        orderUpdate(m.orderId, { status: m.t }, m.t);
      }
      if (m.t === 'finished' && d) {
        releaseCurrent(d);
        if (!d.busy && !canWork(driverRec(id))) dropFromLine(id);
        broadcastFleet();
        if (!d.busy) dispatchWaiting();
      }
      break;
    }
    case 'cancel': {
      const o = orders.get(m.orderId);
      if (!o || o.driverId !== id) return;
      clearTimeout(o.timer);
      if (d) {
        if (d.nextOrderId === m.orderId) d.nextOrderId = undefined;
        else if (d.orderId === m.orderId) releaseCurrent(d);
      }
      if (m.reason === 'noShow' && o.status === 'arrived') {
        // mijoz chiqmadi — buyurtma yopiladi, boshqa haydovchiga berilmaydi
        toPassenger(o.passengerId, { t: 'noShow', orderId: m.orderId });
        orders.delete(m.orderId);
        stat(id, 'noShow');
        orderUpdate(m.orderId, { status: 'noShow', cancelReason: 'noShow' }, 'noShow');
      } else {
        // haydovchi bekor qildi — buyurtma boshqa haydovchiga
        o.status = 'searching'; o.driverId = undefined; o.tried.add(id);
        toPassenger(o.passengerId, { t: 'driverCancelled', orderId: m.orderId });
        stat(id, 'cancelled');
        orderUpdate(m.orderId, { status: 'searching', driverId: undefined, driverName: undefined }, 'driverCancelled', { driverId: id });
        dispatch(m.orderId);
      }
      if (d && !d.busy && !canWork(driverRec(id))) dropFromLine(id);
      broadcastFleet();
      if (d && !d.busy) dispatchWaiting();
      break;
    }
  }
}

function onPassenger(id, m) {
  switch (m.t) {
    case 'order': {
      const order = { ...m.order, passenger: { ...m.order.passenger, id } };
      orders.set(order.id, { order, passengerId: id, status: 'searching', tried: new Set() });
      orderCreated(order);
      dispatch(order.id);
      break;
    }
    case 'cancel': {
      const o = orders.get(m.orderId);
      if (!o || o.passengerId !== id) return;
      closeOrder(o);
      orderUpdate(m.orderId, { status: 'cancelled', cancelReason: 'passenger' }, 'cancelled');
      break;
    }
    case 'rate': {
      const o = orders.get(m.orderId);
      if (o?.driverId) toDriver(o.driverId, { t: 'rated', orderId: m.orderId, stars: m.stars, tip: m.tip });
      const stars = Number.isInteger(m.stars) && m.stars >= 1 && m.stars <= 5 ? m.stars : undefined;
      const tip = typeof m.tip === 'number' && m.tip >= 0 && m.tip < 1e7 ? m.tip : 0;
      const rec = orderUpdate(m.orderId, { stars, tip }, 'rated');
      if (rec?.driverId && stars) stat(rec.driverId, { ratings: 1, ratingSum: stars, lowRatings: stars <= 3 ? 1 : 0 });
      orders.delete(m.orderId);
      break;
    }
  }
}

/* ---------- Admin panel bilan bog'liqlik ---------- */

// Hujjat qarori haydovchiga yetkaziladi; tasdiqlanmagan hujjatli bo'sh haydovchi liniyadan olinadi
bus.on('docStatus', (id, kind, doc) => {
  toDriver(id, { t: 'docStatus', kind, status: doc.status, note: doc.note, checkedAt: doc.checkedAt });
  if (!canWork(driverRec(id))) dropFromLine(id);
});
// Hujjatlari tasdiqlandi / blokdan chiqdi — liniyaga chiqmoqchi bo'lsa qo'shiladi
bus.on('canWork', id => {
  const w = waiting.get(id);
  if (!w || drivers.has(id) || !canWork(driverRec(id))) return;
  waiting.delete(id);
  drivers.set(id, { ...w, busy: false });
  broadcastFleet();
  dispatchWaiting();
});
bus.on('blocked', (id, b) => {
  toDriver(id, { t: 'blocked', reason: b.reason });
  waiting.delete(id);
  dropFromLine(id);
});
bus.on('unblocked', id => toDriver(id, { t: 'unblocked' }));
bus.on('config', () => {
  const s = JSON.stringify({ t: 'config', config: publicConfig() });
  for (const c of clients.values()) if (c.ws.readyState === 1) c.ws.send(s);
});
/** target: all — ilovasi ochiq barcha haydovchilar, online — liniyadagilar, free — bo'shlar, {near, km} — nuqta atrofidagilar, yoki haydovchi id */
bus.on('notice', (target, n, done) => {
  let count = 0;
  for (const c of clients.values()) {
    if (c.role !== 'driver') continue;
    const d = drivers.get(c.id) ?? waiting.get(c.id);
    const hit = target === 'all' || (target === 'online' && d) || (target === 'free' && d && !d.busy) || target === c.id
      || (typeof target === 'object' && target?.near && d?.pos && km(d.pos, target.near) <= (target.km ?? 3));
    if (hit && c.ws.readyState === 1) { c.ws.send(JSON.stringify({ t: 'notice', title: n.title, text: n.text })); count++; }
  }
  done?.(count);
});
bus.on('adminCancel', (orderId, done) => {
  const o = orders.get(orderId);
  if (!o) return done?.(false);
  closeOrder(o);
  toPassenger(o.passengerId, { t: 'adminCancelled', orderId });
  orderUpdate(orderId, { status: 'cancelled', cancelReason: 'admin' }, 'adminCancelled');
  done?.(true);
});

/** Panel xaritasi uchun: liniyadagi va tekshiruv kutayotgan haydovchilar */
const liveView = () => [
  ...[...drivers.values()].map(d => ({ id: d.info.id, busy: d.busy, pos: d.pos, heading: d.heading, orderId: d.orderId, nextOrderId: d.nextOrderId, offering: d.offering, tariffs: d.tariffs })),
  ...[...waiting].map(([id, w]) => ({ id, busy: false, pending: true, pos: w.pos, heading: w.heading, tariffs: w.tariffs })),
];
setInterval(() => pushLive(liveView()), 1000).unref();

/* ---------- HTTP va WebSocket ---------- */

const server = http.createServer((req, res) => {
  if (handleApi(req, res, drivers)) return;
  // salomatlik tekshiruvi
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ ok: true, drivers: drivers.size, orders: orders.size }));
});
const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  let key = null;
  let admin = false;
  socket.on('message', (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch { return; }
    if (admin) { if (m.t === 'admin') command(socket, m); return; }
    if (m.t === 'hello') {
      if (m.role === 'admin') {
        if (!verify(m.token)) { socket.send(JSON.stringify({ t: 'admin:denied' })); socket.close(); return; }
        admin = true;
        attach(socket, liveView);
        return;
      }
      if (m.role !== 'driver' && m.role !== 'passenger') return;
      key = m.role + ':' + String(m.id).slice(0, 64);
      clients.set(key, { ws: socket, role: m.role, id: String(m.id).slice(0, 64) });
      socket.send(JSON.stringify({ t: 'welcome', role: m.role }));
      socket.send(JSON.stringify({ t: 'config', config: publicConfig() }));
      if (m.role === 'passenger') broadcastFleet();
      // qayta ulangan haydovchiga faol (va zanjirdagi) buyurtmasini eslatamiz
      if (m.role === 'driver') {
        const d = drivers.get(String(m.id));
        const cur = d?.orderId && orders.get(d.orderId);
        if (cur) socket.send(JSON.stringify({ t: 'assigned', order: cur.order, status: cur.status }));
        const next = d?.nextOrderId && orders.get(d.nextOrderId);
        if (next) socket.send(JSON.stringify({ t: 'assigned', order: next.order, status: next.status, chain: true }));
      }
      return;
    }
    if (!key) return;
    const c = clients.get(key);
    if (!c) return;
    if (c.role === 'driver') onDriver(c.id, m); else onPassenger(c.id, m);
  });
  socket.on('close', () => {
    if (!key) return;
    const c = clients.get(key);
    if (c?.ws === socket) clients.delete(key);
    // aloqa uzilgan bo'sh haydovchi 30 soniyadan keyin liniyadan olinadi
    if (c?.role === 'driver') setTimeout(() => {
      if (clients.has(key)) return;
      waiting.delete(c.id);
      const d = drivers.get(c.id);
      if (d && !d.busy) { drivers.delete(c.id); broadcastFleet(); }
    }, 30000);
  });
});

server.listen(PORT, () => {
  console.log(`YUMS dispetcher: ws://localhost:${PORT}  ·  API: http://localhost:${PORT}/api/public`);
  console.log(`Ma'lumotlar: ${DB_FILE}`);
  if (PASSWORD_GENERATED) console.log(`Admin paroli (har ishga tushishda yangi; doimiy parol uchun ADMIN_PASSWORD bering): ${ADMIN_PASSWORD}`);
});
