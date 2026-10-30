// Doimiy ma'lumotlar ustidagi amallar: haydovchilar va ularning hujjatlari, buyurtmalar tarixi,
// saytdan kelgan arizalar, narx sozlamalari, sayt matni va jurnal.
// Har bir o'zgarish `bus` orqali e'lon qilinadi: dispetcher ilovalarga, admin kanali panelga yetkazadi.
import { EventEmitter } from 'node:events';

import { db, save } from './db.mjs';
import { precheck, SAMPLE } from './precheck.mjs';

export const bus = new EventEmitter();
bus.setMaxListeners(50);

export const DOC_KINDS = ['license', 'techPassport', 'taxiLicense', 'osago'];
export const DOC_NAME = { license: 'haydovchilik guvohnomasi', techPassport: 'texnik pasport', taxiLicense: 'taksi litsenziyasi', osago: 'OSAGO polisi' };
export const TARIFF_IDS = ['start', 'comfort', 'business', 'minivan', 'delivery'];
/** Hujjat avtomatik tekshirilgach qaror chiqishigacha (navbat, rasm tahlili) */
const AUTO_REVIEW_MS = 2500;

const now = () => new Date().toISOString();
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const num = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const imageUri = (v, maxLen) => (v === SAMPLE || (typeof v === 'string' && v.startsWith('data:image/') && v.length <= maxLen) ? v : undefined);
const dropUndefined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/* ---------- Jurnal ---------- */

/** kind: admin — operator amali, auto — avtomatik qaror, system — tizim hodisasi */
export function log(text, extra = {}) {
  const e = { id: uid('l'), at: now(), kind: 'system', text, ...extra };
  db.log.push(e);
  save();
  bus.emit('log', e);
  return e;
}

/* ---------- Haydovchilar ---------- */

const emptyStats = () => ({ offers: 0, accepted: 0, declined: 0, missed: 0, cancelled: 0, completed: 0, noShow: 0, revenue: 0, ratings: 0, ratingSum: 0, lowRatings: 0 });

function cleanProfile(p) {
  return dropUndefined({
    name: str(p?.name, 60), phone: str(p?.phone, 24), gender: p?.gender === 'm' || p?.gender === 'f' ? p.gender : undefined,
    photo: imageUri(p?.photo, 600000), car: str(p?.car, 60), color: str(p?.color, 24), plate: str(p?.plate, 16),
    year: num(p?.year, 1980, 2100), city: str(p?.city, 40), joinedAt: str(p?.joinedAt, 30),
    rating: num(p?.rating, 0, 5), trips: num(p?.trips, 0, 1e6),
    tariffs: Array.isArray(p?.tariffs) ? p.tariffs.filter(t => TARIFF_IDS.includes(t)) : undefined,
  });
}

export const driverRec = (id) => db.drivers[id];

/** Haydovchi profili (ilova ulanganda va liniyaga chiqqanda yuboradi) */
export function upsertDriver(id, profile) {
  const p = cleanProfile(profile);
  let r = db.drivers[id];
  if (!r) {
    if (!p.name) return null;
    r = db.drivers[id] = { id, profile: p, docs: {}, stats: emptyStats(), createdAt: now() };
    log(`Yangi haydovchi: ${p.name}${p.plate ? ` (${p.plate})` : ''}`, { driverId: id });
  } else {
    r.profile = { ...r.profile, ...p };
    // ilova har doim to'liq profil yuboradi: rasm yo'q bo'lsa — o'chirilgan
    if (!p.photo) delete r.profile.photo;
  }
  r.lastSeen = now();
  save();
  bus.emit('driver', r);
  return r;
}

/** Haydovchi ko'rsatkichlarini oshirish: stat(id, 'offers') yoki stat(id, { completed: 1, revenue: 22000 }) */
export function stat(id, inc) {
  const r = db.drivers[id];
  if (!r) return;
  r.stats = { ...emptyStats(), ...r.stats };
  for (const [k, v] of Object.entries(typeof inc === 'string' ? { [inc]: 1 } : inc)) r.stats[k] += v;
  save();
  bus.emit('driver', r);
}

export const docsOk = (r) => !!r && DOC_KINDS.every(k => r.docs?.[k]?.status === 'approved');
/** Liniyada ishlashi mumkinmi: bloklanmagan va hamma hujjati tasdiqlangan */
export const canWork = (r) => !!r && !r.blocked && docsOk(r);

/** Ilova ulanganda: qaysi hujjatni so'rash va qaysi qarorni yetkazish kerak */
export function syncDocs(id, mine) {
  const r = db.drivers[id];
  const need = [], statuses = [];
  if (!r) return { need, statuses };
  for (const kind of DOC_KINDS) {
    const m = mine?.[kind];
    const s = r.docs[kind];
    if (!m || m.status === 'missing') continue;
    if (!s || (m.submittedAt && m.submittedAt !== s.submittedAt && m.submittedAt > (s.submittedAt ?? ''))) need.push(kind);
    else if (s.status !== m.status || s.note !== m.note) statuses.push({ kind, status: s.status, note: s.note, checkedAt: s.checkedAt });
  }
  return { need, statuses };
}

/** Haydovchi hujjatni tekshiruvga yubordi */
export function receiveDoc(id, doc) {
  const r = db.drivers[id];
  if (!r || !DOC_KINDS.includes(doc?.kind)) return null;
  const d = dropUndefined({
    kind: doc.kind, number: str(doc.number, 24) ?? '', issued: str(doc.issued, 10), expires: str(doc.expires, 10), categories: str(doc.categories, 30),
    front: imageUri(doc.front, 3500000), back: imageUri(doc.back, 3500000), submittedAt: str(doc.submittedAt, 30) ?? now(),
    status: 'review', receivedAt: now(),
  });
  r.docs[doc.kind] = d;
  save();
  bus.emit('driver', r);
  bus.emit('docStatus', id, doc.kind, d);
  const check = precheck(d, r, Object.values(db.drivers));
  log(`${r.profile.name}: ${DOC_NAME[doc.kind]} tekshiruvga yuborildi${check.decision === 'manual' ? ' — moderator ko\'rishi kerak' : ''}`, { driverId: id });
  if (db.config.autoApprove && check.decision !== 'manual') {
    setTimeout(() => {
      if (r.docs[doc.kind] !== d || d.status !== 'review') return;
      decideDoc(id, doc.kind, check.decision === 'approve' ? 'approved' : 'rejected', check.note, 'auto');
    }, AUTO_REVIEW_MS);
  }
  return d;
}

export function decideDoc(id, kind, status, note, by) {
  const r = db.drivers[id];
  const d = r?.docs[kind];
  if (!d || (status !== 'approved' && status !== 'rejected')) return false;
  d.status = status;
  d.note = status === 'rejected' ? str(note, 200) || 'Hujjat talablarga mos emas — tuzatib qayta yuboring' : undefined;
  d.checkedAt = now();
  d.by = by;
  save();
  bus.emit('driver', r);
  bus.emit('docStatus', id, kind, d);
  log(`${r.profile.name}: ${DOC_NAME[kind]} ${status === 'approved' ? 'tasdiqlandi' : `rad etildi (${d.note})`}`, { kind: by === 'auto' ? 'auto' : 'admin', driverId: id });
  bus.emit('canWork', id);
  return true;
}

export function docPhotos(id, kind) {
  const d = db.drivers[id]?.docs[kind];
  return d ? { front: d.front, back: d.back } : null;
}

export function blockDriver(id, reason) {
  const r = db.drivers[id];
  if (!r) return false;
  r.blocked = { reason: str(reason, 200) || 'Qoidabuzarlik', at: now() };
  save();
  bus.emit('driver', r);
  bus.emit('blocked', id, r.blocked);
  log(`${r.profile.name} bloklandi: ${r.blocked.reason}`, { kind: 'admin', driverId: id });
  return true;
}

export function unblockDriver(id) {
  const r = db.drivers[id];
  if (!r?.blocked) return false;
  delete r.blocked;
  save();
  bus.emit('driver', r);
  bus.emit('unblocked', id);
  log(`${r.profile.name} blokdan chiqarildi`, { kind: 'admin', driverId: id });
  bus.emit('canWork', id);
  return true;
}

/* ---------- Buyurtmalar tarixi ---------- */

const orderIdx = new Map(db.orders.map(o => [o.id, o]));
const place = (p) => ({ title: str(p?.title, 120) ?? '', latitude: +p?.latitude || 0, longitude: +p?.longitude || 0 });

export function orderCreated(o) {
  const rec = {
    id: o.id, createdAt: now(), status: 'searching',
    pickup: place(o.pickup), destination: place(o.destination),
    km: Math.round((o.route?.km ?? 0) * 10) / 10, min: Math.round(o.route?.min ?? 0), price: num(o.price, 0, 1e8) ?? 0,
    tariffId: TARIFF_IDS.includes(o.tariffId) ? o.tariffId : 'start', payment: str(o.payment, 10) ?? 'cash', surge: num(o.surge, 1, 5),
    options: Array.isArray(o.options) ? o.options.slice(0, 8).map(x => str(x, 20)) : [],
    passenger: { id: str(o.passenger?.id, 64), name: str(o.passenger?.name, 60) ?? "Yo'lovchi", phone: str(o.passenger?.phone, 24), rating: num(o.passenger?.rating, 0, 5) ?? 5 },
    offers: 0, timeline: [{ t: 'created', at: now() }],
  };
  db.orders.push(rec);
  orderIdx.set(rec.id, rec);
  save();
  bus.emit('order', rec);
  return rec;
}

/** Holat yoki maydonlarni yangilash; `event` — vaqt chizig'iga yoziladigan hodisa */
export function orderUpdate(id, patch, event, extra) {
  const rec = orderIdx.get(id);
  if (!rec) return null;
  Object.assign(rec, patch);
  if (event) rec.timeline.push({ t: event, at: now(), ...extra });
  if (rec.timeline.length > 60) rec.timeline.splice(1, rec.timeline.length - 60);
  save();
  bus.emit('order', rec);
  return rec;
}

export const orderRec = (id) => orderIdx.get(id);

/* ---------- Arizalar (sayt) ---------- */

const LEAD_STATUS = ['new', 'contacted', 'approved', 'rejected'];

export function addLead(input) {
  const name = str(input?.name, 60);
  const digits = String(input?.phone ?? '').replace(/\D/g, '');
  if (!name || name.length < 2) return { error: 'Ismingizni kiriting' };
  if (digits.length < 9 || digits.length > 15) return { error: "Telefon raqamini to'g'ri kiriting" };
  const lead = dropUndefined({
    id: uid('a'), at: now(), name, phone: '+' + (digits.length === 9 ? '998' + digits : digits),
    city: str(input?.city, 40), car: str(input?.car, 60), year: num(input?.year, 1980, 2100),
    tariffs: Array.isArray(input?.tariffs) ? input.tariffs.filter(t => TARIFF_IDS.includes(t)) : undefined,
    lang: input?.lang === 'ru' ? 'ru' : 'uz', status: 'new',
  });
  db.leads.push(lead);
  save();
  bus.emit('lead', lead);
  log(`Saytdan yangi ariza: ${lead.name}${lead.car ? `, ${lead.car}` : ''}`, { leadId: lead.id });
  return { lead };
}

export function updateLead(id, patch) {
  const lead = db.leads.find(l => l.id === id);
  if (!lead) return false;
  if (LEAD_STATUS.includes(patch?.status)) lead.status = patch.status;
  if (typeof patch?.note === 'string') lead.note = patch.note.slice(0, 500);
  lead.updatedAt = now();
  save();
  bus.emit('lead', lead);
  log(`Ariza «${lead.name}»: ${{ new: 'yangi', contacted: "bog'lanildi", approved: 'qabul qilindi', rejected: 'rad etildi' }[lead.status]}`, { kind: 'admin', leadId: id });
  return true;
}

/* ---------- Narx sozlamalari ---------- */

const activeZones = () => db.config.zones.filter(z => !z.until || Date.parse(z.until) > Date.now());

/** Ilovalar va saytga yuboriladigan sozlamalar (muddati o'tgan hududlarsiz) */
export const publicConfig = () => ({ tariffs: db.config.tariffs, commission: db.config.commission, zones: activeZones() });

function cleanZone(z) {
  const lat = num(z?.center?.latitude, -90, 90), lng = num(z?.center?.longitude, -180, 180);
  const surge = num(z?.surge, 1, 3), radiusKm = num(z?.radiusKm, 0.2, 10);
  if (lat === undefined || lng === undefined || !surge || !radiusKm) return null;
  return dropUndefined({
    id: str(z.id, 40) || uid('z'), center: { latitude: lat, longitude: lng }, radiusKm, surge: Math.round(surge * 10) / 10,
    label: str(z.label, 60), until: typeof z.until === 'string' && !Number.isNaN(Date.parse(z.until)) ? z.until : undefined,
  });
}

export function setConfig(patch) {
  const c = db.config;
  const changes = [];
  if (patch?.tariffs && typeof patch.tariffs === 'object') {
    for (const [id, t] of Object.entries(patch.tariffs)) {
      if (!TARIFF_IDS.includes(id)) continue;
      if (t === null) { delete c.tariffs[id]; changes.push(`${id}: standart narx`); continue; }
      const v = dropUndefined({ base: num(t?.base, 0, 1e6), perKm: num(t?.perKm, 0, 1e5), perMin: num(t?.perMin, 0, 1e5), minFare: num(t?.minFare, 0, 1e6) });
      if (Object.keys(v).length) { c.tariffs[id] = v; changes.push(id); }
    }
  }
  if (patch && 'commission' in patch) {
    const v = patch.commission === null ? null : num(patch.commission, 0, 0.3);
    if (v !== undefined) { c.commission = v; changes.push(`komissiya ${v === null ? 'standart' : Math.round(v * 100) + '%'}`); }
  }
  if (typeof patch?.autoApprove === 'boolean') {
    c.autoApprove = patch.autoApprove;
    changes.push(`avtomatik tekshiruv ${patch.autoApprove ? 'yoqildi' : "o'chirildi"}`);
  }
  if (!changes.length) return false;
  save();
  bus.emit('config');
  log(`Sozlamalar: ${changes.join(', ')}`, { kind: 'admin' });
  return true;
}

export function setZone(z) {
  const zone = cleanZone(z);
  if (!zone) return null;
  const i = db.config.zones.findIndex(x => x.id === zone.id);
  if (i >= 0) db.config.zones[i] = zone; else db.config.zones.push(zone);
  save();
  bus.emit('config');
  log(`Yuqori talab hududi${zone.label ? ` «${zone.label}»` : ''}: ×${zone.surge}${zone.until ? `, ${new Date(zone.until).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} gacha` : ''}`, { kind: 'admin' });
  return zone;
}

export function removeZone(id) {
  const i = db.config.zones.findIndex(x => x.id === id);
  if (i < 0) return false;
  const [z] = db.config.zones.splice(i, 1);
  save();
  bus.emit('config');
  log(`Hudud o'chirildi${z.label ? `: «${z.label}»` : ''}`, { kind: 'admin' });
  return true;
}

// Muddati tugagan hududlar avtomatik olib tashlanadi
setInterval(() => {
  const before = db.config.zones.length;
  db.config.zones = activeZones();
  if (db.config.zones.length !== before) { save(); bus.emit('config'); }
}, 30000).unref();

/* ---------- Sayt matni ---------- */

const CONTENT_TEXT = ['heroTitle', 'heroSub', 'promoText', 'promoCode', 'driverTitle', 'driverSub'];

function cleanLangBlock(b) {
  if (!b || typeof b !== 'object') return undefined;
  const out = dropUndefined(Object.fromEntries(CONTENT_TEXT.map(k => [k, str(b[k], k.endsWith('Sub') ? 300 : 120)])));
  if (Array.isArray(b.faq)) out.faq = b.faq.slice(0, 20).map(f => ({ q: str(f?.q, 200) ?? '', a: str(f?.a, 1000) ?? '' })).filter(f => f.q && f.a);
  return out;
}

export function setContent(c) {
  db.content = dropUndefined({
    uz: cleanLangBlock(c?.uz), ru: cleanLangBlock(c?.ru),
    phone: str(c?.phone, 24), telegram: str(c?.telegram, 64), email: str(c?.email, 80),
    showStats: typeof c?.showStats === 'boolean' ? c.showStats : undefined,
    showPromo: typeof c?.showPromo === 'boolean' ? c.showPromo : undefined,
  });
  save();
  bus.emit('content');
  log('Sayt matni yangilandi', { kind: 'admin' });
  return db.content;
}
