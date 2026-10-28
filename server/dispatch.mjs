// YUMS Taxi dispetcher serveri.
// Yo'lovchi ilovasi buyurtma yuboradi → eng yaqin bo'sh haydovchiga taklif qilinadi →
// haydovchi qabul qilsa, uning joylashuvi va holati (yetib keldi, safar, yakun) yo'lovchiga jonli uzatiladi.
// Zanjir buyurtma: safar oxiriga yaqinlashgan haydovchiga keyingi buyurtma oldindan taklif qilinadi.
// Ishga tushirish: `node server/dispatch.mjs` (PORT, standart 8787). Holat xotirada saqlanadi.
import http from 'node:http';
import ws from 'ws';

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

/** Bo'sh haydovchi yoki zanjir buyurtma olishga tayyor haydovchi */
const available = (d) => d.pos && !d.offering && (!d.busy || (d.chainFrom && !d.nextOrderId));
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
      o.status = 'failed'; toPassenger(o.passengerId, { t: 'noDriver', orderId }); orders.delete(orderId); return;
    }
    o.timer = setTimeout(() => dispatch(orderId), 4000);
    return;
  }
  o.tried.add(candidate.info.id);
  o.offeredTo = candidate.info.id;
  candidate.offering = orderId;
  toDriver(candidate.info.id, { t: 'offer', order: o.order, expiresIn: OFFER_MS, distanceKm: Math.round(km(startOf(candidate), pick) * 10) / 10, chain: candidate.busy || undefined });
  o.timer = setTimeout(() => {
    toDriver(candidate.info.id, { t: 'offerGone', orderId });
    endOffer(o, candidate.info.id);
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

function onDriver(id, m) {
  const d = drivers.get(id);
  switch (m.t) {
    case 'online':
      drivers.set(id, { ...d, info: m.driver, pos: m.pos, heading: m.heading, tariffs: m.tariffs ?? [], busy: d?.busy ?? false });
      broadcastFleet();
      dispatchWaiting();
      break;
    case 'offline':
      if (d && !d.busy) drivers.delete(id);
      broadcastFleet();
      break;
    case 'pos':
      if (!d) return;
      d.pos = m.pos; d.heading = m.heading;
      for (const oid of [d.orderId, d.nextOrderId]) {
        const o = oid && orders.get(oid);
        if (o) toPassenger(o.passengerId, { t: 'driverPos', orderId: oid, pos: m.pos, heading: m.heading });
      }
      broadcastFleet();
      break;
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
      broadcastFleet();
      break;
    }
    case 'decline': {
      const o = orders.get(m.orderId);
      if (o && o.offeredTo === id) { clearTimeout(o.timer); endOffer(o, id); dispatch(m.orderId); }
      break;
    }
    case 'arrived': case 'started': case 'finished': {
      const o = orders.get(m.orderId);
      if (!o || o.driverId !== id) return;
      o.status = m.t;
      toPassenger(o.passengerId, { t: m.t, orderId: m.orderId, price: m.price });
      if (m.t === 'finished' && d) {
        releaseCurrent(d);
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
      } else {
        // haydovchi bekor qildi — buyurtma boshqa haydovchiga
        o.status = 'searching'; o.driverId = undefined; o.tried.add(id);
        toPassenger(o.passengerId, { t: 'driverCancelled', orderId: m.orderId });
        dispatch(m.orderId);
      }
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
      dispatch(order.id);
      break;
    }
    case 'cancel': {
      const o = orders.get(m.orderId);
      if (!o || o.passengerId !== id) return;
      clearTimeout(o.timer);
      if (o.offeredTo) { toDriver(o.offeredTo, { t: 'offerGone', orderId: m.orderId }); endOffer(o, o.offeredTo); }
      if (o.driverId) {
        const d = drivers.get(o.driverId);
        if (d) {
          if (d.nextOrderId === m.orderId) d.nextOrderId = undefined;
          else if (d.orderId === m.orderId) releaseCurrent(d);
        }
        toDriver(o.driverId, { t: 'cancelled', orderId: m.orderId });
        if (d && !d.busy) dispatchWaiting();
      }
      orders.delete(m.orderId);
      broadcastFleet();
      break;
    }
    case 'rate': {
      const o = orders.get(m.orderId);
      if (o?.driverId) toDriver(o.driverId, { t: 'rated', orderId: m.orderId, stars: m.stars, tip: m.tip });
      orders.delete(m.orderId);
      break;
    }
  }
}

const server = http.createServer((req, res) => {
  // salomatlik tekshiruvi
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ ok: true, drivers: drivers.size, orders: orders.size }));
});
const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  let key = null;
  socket.on('message', (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch { return; }
    if (m.t === 'hello') {
      if (m.role !== 'driver' && m.role !== 'passenger') return;
      key = m.role + ':' + String(m.id).slice(0, 64);
      clients.set(key, { ws: socket, role: m.role, id: String(m.id) });
      socket.send(JSON.stringify({ t: 'welcome', role: m.role }));
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
    if (c.role === 'driver') onDriver(c.id, m); else onPassenger(c.id, m);
  });
  socket.on('close', () => {
    if (!key) return;
    const c = clients.get(key);
    if (c?.ws === socket) clients.delete(key);
    // aloqa uzilgan bo'sh haydovchi 30 soniyadan keyin liniyadan olinadi
    if (c?.role === 'driver') setTimeout(() => {
      const d = drivers.get(c.id);
      if (d && !d.busy && !clients.has(key)) { drivers.delete(c.id); broadcastFleet(); }
    }, 30000);
  });
});

server.listen(PORT, () => console.log(`YUMS dispetcher: ws://localhost:${PORT}`));
