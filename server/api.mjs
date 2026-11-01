// HTTP API: sayt uchun ochiq ma'lumotlar, haydovchilik arizasi va admin panelga kirish.
//   GET  /api/public       — tariflar narxi, yuqori talab hududlari, sayt matni, jonli ko'rsatkichlar
//   POST /api/leads        — saytdan haydovchilik arizasi
//   POST /api/admin/login  — parol → token (12 soat)
import { login } from './admin.mjs';
import { db } from './db.mjs';
import { addLead, publicConfig } from './registry.mjs';

const MAX_BODY = 20000;
const leadHits = new Map(); // ip → so'nggi arizalar vaqti

const json = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(status === 204 ? undefined : JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  let size = 0;
  const chunks = [];
  req.on('data', c => {
    size += c.length;
    if (size > MAX_BODY) { resolve(null); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve(null); } });
  req.on('error', () => resolve(null));
});

const ipOf = (req) => String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket.remoteAddress || '?';

/** Bugungi ko'rsatkichlar — faqat umumiy sonlar (shaxsiy ma'lumotsiz) */
function stats(pool) {
  const day = new Date().toDateString();
  const today = db.orders.filter(o => new Date(o.createdAt).toDateString() === day);
  const done = today.filter(o => o.status === 'finished');
  const pickups = done.map(o => {
    const a = o.timeline.find(e => e.t === 'accepted'), b = o.timeline.find(e => e.t === 'arrived');
    return a && b ? (Date.parse(b.at) - Date.parse(a.at)) / 60000 : null;
  }).filter(x => x != null && x > 0 && x < 60);
  const rated = db.orders.filter(o => o.stars).slice(-500);
  const live = [...pool.values()];
  return {
    driversOnline: live.length,
    driversFree: live.filter(d => !d.busy).length,
    tripsToday: done.length,
    avgPickupMin: pickups.length ? Math.round((pickups.reduce((s, x) => s + x, 0) / pickups.length) * 10) / 10 : null,
    rating: rated.length ? Math.round((rated.reduce((s, o) => s + o.stars, 0) / rated.length) * 100) / 100 : null,
  };
}

/**
 * @returns {boolean} so'rov shu yerda javob oldimi
 * @param pool dispetcherdagi liniyadagi haydovchilar
 */
export function handleApi(req, res, pool) {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) return false;
  if (req.method === 'OPTIONS') { json(res, 204, {}); return true; }

  if (url.pathname === '/api/public' && req.method === 'GET') {
    json(res, 200, { ok: true, config: publicConfig(), content: db.content, stats: stats(pool) });
    return true;
  }

  if (url.pathname === '/api/leads' && req.method === 'POST') {
    readBody(req).then(body => {
      if (!body) return json(res, 400, { error: "So'rov noto'g'ri" });
      // botlar uchun yashirin maydon: to'ldirilgan bo'lsa jim qabul qilinadi, saqlanmaydi
      if (body.website) return json(res, 200, { ok: true });
      const ip = ipOf(req), t = Date.now();
      const hits = (leadHits.get(ip) ?? []).filter(x => t - x < 10 * 60000);
      if (hits.length >= 5) return json(res, 429, { error: "Ko'p ariza yuborildi — birozdan so'ng urinib ko'ring" });
      const r = addLead(body);
      if (r.error) return json(res, 400, { error: r.error });
      leadHits.set(ip, [...hits, t]);
      json(res, 200, { ok: true, id: r.lead.id });
    });
    return true;
  }

  if (url.pathname === '/api/admin/login' && req.method === 'POST') {
    readBody(req).then(body => {
      const r = login(body?.password ?? '', ipOf(req));
      if ('error' in r) json(res, r.status, { error: r.error });
      else json(res, 200, r);
    });
    return true;
  }

  json(res, 404, { error: 'Topilmadi' });
  return true;
}
