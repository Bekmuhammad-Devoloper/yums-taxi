// YUMS Taxi dispetcher serveri.
// Yo'lovchi ilovasi buyurtma yuboradi → eng yaqin bo'sh haydovchiga taklif qilinadi →
// haydovchi qabul qilsa, uning joylashuvi va holati (yetib keldi, safar, yakun) yo'lovchiga jonli uzatiladi.
// Ishga tushirish: `node server/dispatch.mjs` (PORT, standart 8787). Holat xotirada saqlanadi.
import http from 'node:http';
import ws from 'ws';

// ws@7 (Expo bilan keladi) va ws@8 ikkalasi ham ishlaydi
const WebSocketServer = ws.WebSocketServer ?? ws.Server;

const PORT = Number(process.env.PORT ?? 8787);
const OFFER_MS = 15000; // haydovchi taklifga javob berish vaqti

/** @type {Map<string, {ws: import('ws').WebSocket, role: 'driver'|'passenger', id: string}>} */
const clients = new Map();
/** Liniyadagi haydovchilar: id → { info, pos, heading, busy, tariffs } */
const drivers = new Map();
/** Buyurtmalar: id → { order, passengerId, driverId?, status, tried:Set, timer? } */
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
const toPassenger = (id, msg) => send('passenger:' + id, msg);
const toDriver = (id, msg) => send('driver:' + id, msg);

/** Barcha yo'lovchilarga liniyadagi haydovchilar (soni va joylashuvi) */
const broadcastFleet = () => {
  const fleet = [...drivers.values()].filter(d => d.pos).map(d => ({ id: d.info.id, pos: d.pos, heading: d.heading ?? 0, busy: d.busy, tariffs: d.tariffs }));
  for (const c of clients.values()) if (c.role === 'passenger' && c.ws.readyState === 1) c.ws.send(JSON.stringify({ t: 'fleet', drivers: fleet }));
};

/** Buyurtmani keyingi eng yaqin bo'sh haydovchiga taklif qilish */
function dispatch(orderId) {
  const o = orders.get(orderId);
  if (!o || o.status !== 'searching') return;
  clearTimeout(o.timer);
  const pick = o.order.pickup;
  const candidate = [...drivers.values()]
    .filter(d => !d.busy && d.pos && !o.tried.has(d.info.id) && (!d.tariffs?.length || d.tariffs.includes(o.order.tariffId)))
    .sort((a, b) => km(a.pos, pick) - km(b.pos, pick))[0];
  if (!candidate) {
    // hech kim yo'q — biroz kutib, rad etganlarni ham qayta sinab ko'ramiz
    o.tried.clear();
    o.waits = (o.waits ?? 0) + 1;
    if (o.waits > 8) { o.status = 'failed'; toPassenger(o.passengerId, { t: 'noDriver', orderId }); orders.delete(orderId); return; }
    o.timer = setTimeout(() => dispatch(orderId), 4000);
    return;
  }
  o.tried.add(candidate.info.id);
  o.offeredTo = candidate.info.id;
  toDriver(candidate.info.id, { t: 'offer', order: o.order, expiresIn: OFFER_MS, distanceKm: Math.round(km(candidate.pos, pick) * 10) / 10 });
  o.timer = setTimeout(() => {
    toDriver(candidate.info.id, { t: 'offerGone', orderId });
    o.offeredTo = undefined;
    dispatch(orderId);
  }, OFFER_MS);
}

function onDriver(id, m) {
  const d = drivers.get(id);
  switch (m.t) {
    case 'online':
      drivers.set(id, { info: m.driver, pos: m.pos, heading: m.heading, tariffs: m.tariffs ?? [], busy: d?.busy ?? false });
      broadcastFleet();
      // kutilayotgan buyurtmalar bo'lsa — darhol taklif
      for (const [oid, o] of orders) if (o.status === 'searching' && !o.offeredTo) dispatch(oid);
      break;
    case 'offline':
      if (d && !d.busy) drivers.delete(id);
      broadcastFleet();
      break;
    case 'pos':
      if (!d) return;
      d.pos = m.pos; d.heading = m.heading;
      if (d.orderId) toPassenger(orders.get(d.orderId)?.passengerId, { t: 'driverPos', orderId: d.orderId, pos: m.pos, heading: m.heading });
      broadcastFleet();
      break;
    case 'accept': {
      const o = orders.get(m.orderId);
      if (!o || o.status !== 'searching' || o.offeredTo !== id || !d) { toDriver(id, { t: 'offerGone', orderId: m.orderId }); return; }
      clearTimeout(o.timer);
      o.status = 'accepted'; o.driverId = id; d.busy = true; d.orderId = m.orderId;
      toPassenger(o.passengerId, { t: 'accepted', orderId: m.orderId, driver: d.info, pos: d.pos });
      toDriver(id, { t: 'assigned', order: o.order });
      broadcastFleet();
      break;
    }
    case 'decline': {
      const o = orders.get(m.orderId);
      if (o && o.offeredTo === id) { o.offeredTo = undefined; dispatch(m.orderId); }
      break;
    }
    case 'arrived': case 'started': case 'finished': {
      const o = orders.get(m.orderId);
      if (!o || o.driverId !== id) return;
      o.status = m.t;
      toPassenger(o.passengerId, { t: m.t, orderId: m.orderId, price: m.price });
      if (m.t === 'finished') { if (d) { d.busy = false; d.orderId = undefined; } broadcastFleet(); }
      break;
    }
    case 'cancel': {
      // haydovchi safarni bekor qildi — buyurtma boshqa haydovchiga
      const o = orders.get(m.orderId);
      if (!o || o.driverId !== id) return;
      if (d) { d.busy = false; d.orderId = undefined; }
      o.status = 'searching'; o.driverId = undefined; o.tried.add(id);
      toPassenger(o.passengerId, { t: 'driverCancelled', orderId: m.orderId });
      dispatch(m.orderId);
      broadcastFleet();
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
      if (o.offeredTo) toDriver(o.offeredTo, { t: 'offerGone', orderId: m.orderId });
      if (o.driverId) {
        const d = drivers.get(o.driverId);
        if (d) { d.busy = false; d.orderId = undefined; }
        toDriver(o.driverId, { t: 'cancelled', orderId: m.orderId });
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

wss.on('connection', (ws) => {
  let key = null;
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch { return; }
    if (m.t === 'hello') {
      if (m.role !== 'driver' && m.role !== 'passenger') return;
      key = m.role + ':' + String(m.id).slice(0, 64);
      clients.set(key, { ws, role: m.role, id: String(m.id) });
      ws.send(JSON.stringify({ t: 'welcome', role: m.role }));
      if (m.role === 'passenger') broadcastFleet();
      // qayta ulangan haydovchiga faol buyurtmasini eslatamiz
      if (m.role === 'driver') {
        const d = drivers.get(String(m.id));
        const o = d?.orderId && orders.get(d.orderId);
        if (o) ws.send(JSON.stringify({ t: 'assigned', order: o.order, status: o.status }));
      }
      return;
    }
    if (!key) return;
    const c = clients.get(key);
    if (c.role === 'driver') onDriver(c.id, m); else onPassenger(c.id, m);
  });
  ws.on('close', () => {
    if (!key) return;
    const c = clients.get(key);
    if (c?.ws === ws) clients.delete(key);
    // aloqa uzilgan bo'sh haydovchi 30 soniyadan keyin liniyadan olinadi
    if (c?.role === 'driver') setTimeout(() => {
      const d = drivers.get(c.id);
      if (d && !d.busy && !clients.has(key)) { drivers.delete(c.id); broadcastFleet(); }
    }, 30000);
  });
});

server.listen(PORT, () => console.log(`YUMS dispetcher: ws://localhost:${PORT}`));
