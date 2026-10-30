// «Aqlli» tahlil: talab va taklif muvozanati, yuqori talab hududlari va narx tavsiyasi, keyingi soatlar prognozi,
// xavfli haydovchilar, shubhali safarlar, hujjatlar navbati, xizmat sog'lig'i bahosi va kunlik xulosa.
// Hammasi panelning o'zida, serverdagi xom ma'lumotdan hisoblanadi (jonli va demo rejimda bir xil ishlaydi).
import type Ionicons from '@expo/vector-icons/Ionicons';

import { DOC_KINDS, DOC_META } from '@/driver/lib/docs';
import { PLACES, type LatLng, type Place } from '@/lib/data';
import { distanceKm } from '@/lib/geo';
import { zoneActive } from '@/lib/remote-config';

import type { AdminCmd, AdminDriver, AdminState, OrderRec } from './admin-types';
import { daysLeft, precheck } from './precheck';

export type Level = 'critical' | 'warn' | 'info' | 'good';
export type InsightAction = { label: string; to?: string; cmds?: AdminCmd[]; confirm?: string; done?: string };
export type Insight = {
  id: string; level: Level; icon: keyof typeof Ionicons.glyphMap; title: string; text: string;
  metric?: string; actions?: InsightAction[];
};

const H = 3600000;
const MIN = 60000;
/** Bir haydovchi bir soatda o'rtacha nechta buyurtma bajaradi (zanjir bilan) */
export const TRIPS_PER_DRIVER_HOUR = 1.6;

const t = (iso: string) => Date.parse(iso);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

/** Nuqtaga eng yaqin mashhur joy (tuman/hudud nomi o'rnida) */
export function districtOf(p: LatLng): Place {
  return PLACES.reduce((b, x) => (distanceKm(p, x) < distanceKm(p, b) ? x : b), PLACES[0]);
}

export const ordersList = (s: AdminState) => Object.values(s.orders).sort((a, b) => t(a.createdAt) - t(b.createdAt));

/* ---------- Soatlik statistika va prognoz ---------- */

export type Hourly = {
  hour: number;
  /** bugun har soatda tushgan buyurtmalar */
  today: number[];
  /** o'tgan 7 kunning shu soatdagi o'rtachasi */
  avg: number[];
  /** kelgusi soatlar uchun kutilayotgan buyurtmalar (o'tgan soatlar — null) */
  forecast: (number | null)[];
  /** bugungi kun o'rtachadan qanchalik ko'p/kam (1 — teng) */
  trend: number;
};

export function hourly(orders: OrderRec[], now = Date.now()): Hourly {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const start = d0.getTime();
  const hour = new Date(now).getHours();
  const today = Array(24).fill(0);
  const sums = Array(24).fill(0);
  const weights = Array(24).fill(0);
  const dow = new Date(now).getDay();
  for (const o of orders) {
    const ts = t(o.createdAt);
    if (ts >= start) { today[new Date(ts).getHours()]++; continue; }
    const daysAgo = Math.ceil((start - ts) / (24 * H));
    if (daysAgo > 7) continue;
    // haftaning shu kuni ikki barobar og'irlik bilan
    const w = new Date(ts).getDay() === dow ? 2 : 1;
    sums[new Date(ts).getHours()] += w;
  }
  for (let d = 1; d <= 7; d++) {
    const day = new Date(start - d * 24 * H).getDay();
    const w = day === dow ? 2 : 1;
    for (let h = 0; h < 24; h++) weights[h] += w;
  }
  const hasHistory = orders.some(o => t(o.createdAt) < start);
  const avg = sums.map((s, h) => (hasHistory && weights[h] ? s / weights[h] : 0));
  // bugungi o'tgan soatlar o'rtachaga nisbatan (joriy soat — o'tgan qismiga qarab)
  const frac = (now - (start + hour * H)) / H;
  const expectedSoFar = avg.slice(0, hour).reduce((a, b) => a + b, 0) + avg[hour] * frac;
  const actualSoFar = today.slice(0, hour + 1).reduce((a, b) => a + b, 0);
  const trend = expectedSoFar > 5 ? clamp(actualSoFar / expectedSoFar, 0.5, 1.8) : 1;
  const forecast = avg.map((a, h) => (h > hour ? Math.round(a * trend) : h === hour ? Math.round(Math.max(today[h], a * trend)) : null));
  return { hour, today, avg, forecast, trend };
}

/* ---------- Talab va taklif: yuqori talab hududlari ---------- */

export type Hotspot = { place: Place; waiting: number; recent: number; free: number; demand: number; surge: number; covered: boolean };

export function hotspots(s: AdminState, now = Date.now()): Hotspot[] {
  const by = new Map<string, Hotspot>();
  const get = (p: Place) => {
    let h = by.get(p.id!);
    if (!h) { h = { place: p, waiting: 0, recent: 0, free: 0, demand: 0, surge: 1, covered: false }; by.set(p.id!, h); }
    return h;
  };
  for (const o of Object.values(s.orders)) {
    const age = now - t(o.createdAt);
    if (age > 20 * MIN) continue;
    const h = get(districtOf(o.pickup));
    if (o.status === 'searching') h.waiting++;
    if (age <= 15 * MIN) h.recent++;
  }
  const freeDrivers = Object.values(s.live).filter(l => !l.busy && !l.pending && l.pos && !s.drivers[l.id]?.blocked);
  const out: Hotspot[] = [];
  for (const h of by.values()) {
    h.free = freeDrivers.filter(l => distanceKm(l.pos!, h.place) <= 2).length;
    h.demand = h.waiting + h.recent * 0.5;
    const ratio = h.demand / Math.max(1, h.free);
    h.surge = h.demand >= 3 && ratio >= 1.5 ? Math.round(clamp(1 + 0.15 * (ratio - 1), 1.2, 1.8) * 10) / 10 : 1;
    h.covered = s.config.zones.some(z => zoneActive(z, now) && distanceKm(z.center, h.place) <= z.radiusKm && z.surge >= h.surge);
    out.push(h);
  }
  return out.sort((a, b) => b.demand - a.demand);
}

/* ---------- Haydovchi xavfi ---------- */

export type Risk = { level: 0 | 1 | 2; reasons: string[] };

export function driverRisk(d: AdminDriver, ordersToday: OrderRec[]): Risk {
  const reasons: string[] = [];
  let level: 0 | 1 | 2 = 0;
  const st = d.stats;
  const cancelRate = st.accepted >= 5 ? st.cancelled / st.accepted : 0;
  if (cancelRate >= 0.2) { reasons.push(`qabul qilganlarining ${pct(cancelRate)} ini bekor qilgan`); level = 2; }
  const noShowsToday = ordersToday.filter(o => o.driverId === d.id && o.status === 'noShow').length;
  if (noShowsToday >= 3) { reasons.push(`bugun ${noShowsToday} marta «mijoz chiqmadi» — tekshirish kerak`); level = 2; }
  const rating = st.ratings >= 10 ? st.ratingSum / st.ratings : d.rating;
  if (rating != null && rating < 4.6 && (st.ratings >= 10 || (d.trips ?? 0) >= 50)) { reasons.push(`reyting past (${rating.toFixed(2)})`); level = Math.max(level, 1) as 0 | 1 | 2; }
  const acceptRate = st.offers >= 10 ? st.accepted / st.offers : 1;
  if (acceptRate < 0.5) { reasons.push(`takliflarning faqat ${pct(acceptRate)} ini qabul qiladi`); level = Math.max(level, 1) as 0 | 1 | 2; }
  if (st.lowRatings >= 3) { reasons.push(`${st.lowRatings} ta past baho (3 va undan kam)`); level = Math.max(level, 1) as 0 | 1 | 2; }
  return { level, reasons };
}

/* ---------- Asosiy ko'rsatkichlar ---------- */

export type Kpis = {
  online: number; free: number; busy: number; pending: number;
  searching: number; active: number;
  today: number; todayDone: number; lastWeekSamePeriod: number;
  gross: number; fees: number;
  fulfillment: number | null; acceptRate: number | null; avgPickupMin: number | null; avgRating: number | null;
  sparkline: number[];
};

export function kpis(s: AdminState, list: OrderRec[], now = Date.now()): Kpis {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const start = d0.getTime();
  const live = Object.values(s.live);
  const today = list.filter(o => t(o.createdAt) >= start);
  const done = today.filter(o => o.status === 'finished');
  const closed = today.filter(o => ['finished', 'failed', 'cancelled', 'noShow'].includes(o.status));
  const lost = closed.filter(o => o.status === 'failed').length;
  const weekAgo = start - 7 * 24 * H;
  const lastWeek = list.filter(o => t(o.createdAt) >= weekAgo && t(o.createdAt) < weekAgo + (now - start)).length;
  const offers = today.reduce((n, o) => n + o.timeline.filter(e => e.t === 'offer').length, 0);
  const accepts = today.reduce((n, o) => n + o.timeline.filter(e => e.t === 'accepted').length, 0);
  const pickups = done.map(o => {
    const a = o.timeline.find(e => e.t === 'accepted'), b = o.timeline.find(e => e.t === 'arrived');
    return a && b ? (t(b.at) - t(a.at)) / MIN : null;
  }).filter((x): x is number => x != null && x > 0 && x < 60);
  const rated = done.filter(o => o.stars);
  const gross = done.reduce((n, o) => n + (o.finalPrice ?? o.price), 0);
  const commission = s.config.commission ?? 0.1;
  const spark: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const a = now - (i + 1) * H, b = now - i * H;
    spark.push(list.filter(o => t(o.createdAt) >= a && t(o.createdAt) < b).length);
  }
  return {
    online: live.filter(l => !l.pending).length, free: live.filter(l => !l.busy && !l.pending).length, busy: live.filter(l => l.busy).length, pending: live.filter(l => l.pending).length,
    searching: list.filter(o => o.status === 'searching').length,
    active: list.filter(o => ['accepted', 'arrived', 'started'].includes(o.status)).length,
    today: today.length, todayDone: done.length, lastWeekSamePeriod: lastWeek,
    gross, fees: Math.round(gross * commission),
    fulfillment: closed.length ? 1 - lost / closed.length : null,
    acceptRate: offers ? accepts / offers : null,
    avgPickupMin: pickups.length ? pickups.reduce((a, b) => a + b, 0) / pickups.length : null,
    avgRating: rated.length ? rated.reduce((n, o) => n + (o.stars ?? 0), 0) / rated.length : null,
    sparkline: spark,
  };
}

/* ---------- Xizmat sog'lig'i (0–100) ---------- */

export type Health = { score: number; label: string; level: Level; parts: { label: string; value: string; score: number }[] };

export function health(s: AdminState, k: Kpis, pendingDocs: number): Health {
  const fulfil = k.fulfillment ?? 1;
  const pickup = k.avgPickupMin;
  const accept = k.acceptRate ?? 1;
  const cover = k.searching ? Math.min(1, k.free / k.searching) : 1;
  const docs = clamp(1 - pendingDocs / 10, 0, 1);
  const parts = [
    { label: 'Buyurtmalar bajarilishi', value: k.fulfillment == null ? '—' : pct(fulfil), score: clamp((fulfil - 0.7) / 0.28, 0, 1) * 35 },
    { label: "O'rtacha kelish vaqti", value: pickup == null ? '—' : `${pickup.toFixed(1)} daq`, score: (pickup == null ? 1 : clamp((12 - pickup) / 7, 0, 1)) * 20 },
    { label: 'Takliflarni qabul qilish', value: k.acceptRate == null ? '—' : pct(accept), score: clamp((accept - 0.4) / 0.45, 0, 1) * 20 },
    { label: "Kutayotganlarga bo'sh haydovchi", value: k.searching ? `${k.free} / ${k.searching}` : 'yetarli', score: cover * 15 },
    { label: 'Hujjatlar navbati', value: pendingDocs ? `${pendingDocs} ta` : "bo'sh", score: docs * 10 },
  ];
  const score = Math.round(parts.reduce((n, p) => n + p.score, 0));
  const [label, level]: [string, Level] = score >= 85 ? ["A'lo", 'good'] : score >= 70 ? ['Yaxshi', 'good'] : score >= 50 ? ["O'rtacha", 'warn'] : ['Muammoli', 'critical'];
  return { score, label, level, parts };
}

/* ---------- Hujjatlar ---------- */

export function docQueue(s: AdminState, now = new Date()) {
  const all = Object.values(s.drivers);
  const pending: { driver: AdminDriver; kind: (typeof DOC_KINDS)[number]; check: ReturnType<typeof precheck> }[] = [];
  const expiring: { driver: AdminDriver; kind: (typeof DOC_KINDS)[number]; days: number }[] = [];
  for (const d of all) {
    for (const kind of DOC_KINDS) {
      const doc = d.docs[kind];
      if (!doc) continue;
      if (doc.status === 'review') pending.push({ driver: d, kind, check: precheck(doc, d, all, now) });
      else if (doc.status === 'approved' && DOC_META[kind].expires) {
        const left = daysLeft(doc, now);
        if (left != null && left <= 30) expiring.push({ driver: d, kind, days: left });
      }
    }
  }
  pending.sort((a, b) => t(a.driver.docs[a.kind]!.receivedAt ?? a.driver.docs[a.kind]!.submittedAt ?? '') - t(b.driver.docs[b.kind]!.receivedAt ?? b.driver.docs[b.kind]!.submittedAt ?? ''));
  expiring.sort((a, b) => a.days - b.days);
  return { pending, expiring };
}

/* ---------- Tavsiyalar ---------- */

export function insights(s: AdminState, list: OrderRec[], now = Date.now()): Insight[] {
  const out: Insight[] = [];
  const k = kpis(s, list, now);
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const todayOrders = list.filter(o => t(o.createdAt) >= d0.getTime());
  const lastHour = list.filter(o => now - t(o.createdAt) <= H);

  // 1. Yuqori talab hududlari — narx koeffitsienti va haydovchilarni chaqirish
  for (const h of hotspots(s, now).filter(x => x.surge > 1 && !x.covered).slice(0, 2)) {
    out.push({
      id: `hot:${h.place.id}`, level: h.waiting >= 4 ? 'critical' : 'warn', icon: 'flame',
      title: `${h.place.title}: talab yuqori`,
      text: `${h.waiting} ta buyurtma haydovchi kutmoqda, so'nggi 15 daqiqada ${h.recent} ta tushgan, 2 km ichida bo'sh haydovchi — ${h.free} ta. ×${h.surge.toFixed(1)} narx koeffitsienti haydovchilarni hududga tortadi.`,
      metric: `×${h.surge.toFixed(1)}`,
      actions: [
        { label: `×${h.surge.toFixed(1)} ni 30 daqiqaga yoqish`, cmds: [{ cmd: 'zone', zone: { label: h.place.title, center: { latitude: h.place.latitude, longitude: h.place.longitude }, radiusKm: 1.5, surge: h.surge, until: new Date(now + 30 * MIN).toISOString() } }], done: 'Hudud yoqildi' },
        { label: 'Yaqin haydovchilarga xabar', cmds: [{ cmd: 'notice', target: { near: { latitude: h.place.latitude, longitude: h.place.longitude }, km: 6 }, title: `${h.place.title} atrofida talab yuqori`, text: `Hozir ${h.place.title} hududida buyurtmalar ko'p${h.surge > 1 ? `, narx ×${h.surge.toFixed(1)}` : ''}. Liniyada bo'lsangiz, shu tomonga yo'l oling.` }], done: 'Xabar yuborildi' },
      ],
    });
  }

  // 2. Uzoq kutayotgan buyurtmalar
  const stale = list.filter(o => o.status === 'searching' && now - t(o.createdAt) > MIN);
  if (stale.length) {
    out.push({
      id: 'stale', level: stale.length >= 3 ? 'critical' : 'warn', icon: 'hourglass',
      title: `${stale.length} ta buyurtma 1 daqiqadan ko'p kutmoqda`,
      text: `Eng uzog'i — ${Math.round((now - Math.min(...stale.map(o => t(o.createdAt)))) / 1000)} soniya. Bo'sh haydovchilar: ${k.free} ta.`,
      metric: String(stale.length),
      actions: [{ label: "Buyurtmalarni ko'rish", to: '/admin/orders?status=searching' }],
    });
  }

  // 3. Haydovchisiz qolgan buyurtmalar (so'nggi soat)
  const closedHour = lastHour.filter(o => ['finished', 'failed', 'cancelled', 'noShow'].includes(o.status));
  const failed = closedHour.filter(o => o.status === 'failed').length;
  if (closedHour.length >= 8 && failed / closedHour.length >= 0.1) {
    out.push({
      id: 'failed', level: 'critical', icon: 'alert-circle',
      title: `So'nggi soatda buyurtmalarning ${pct(failed / closedHour.length)} i haydovchisiz qoldi`,
      text: `${failed} ta yo'lovchi haydovchi topa olmadi. Liniyada bo'lmagan haydovchilarni chaqirish tavsiya etiladi.`,
      metric: pct(failed / closedHour.length),
      actions: [{ label: 'Barcha haydovchilarga xabar', cmds: [{ cmd: 'notice', target: 'all', title: "Buyurtmalar ko'p", text: "Hozir buyurtmalar ko'p, haydovchilar yetishmayapti. Imkoningiz bo'lsa, liniyaga chiqing." }], confirm: 'Ilovasi ochiq barcha haydovchilarga xabar yuborilsinmi?', done: 'Xabar yuborildi' }],
    });
  }

  // 4. Takliflarni rad etish ko'paygan
  const offersHour = lastHour.reduce((n, o) => n + o.timeline.filter(e => e.t === 'offer' && now - t(e.at) <= H).length, 0);
  const acceptsHour = lastHour.reduce((n, o) => n + o.timeline.filter(e => e.t === 'accepted' && now - t(e.at) <= H).length, 0);
  if (offersHour >= 10 && acceptsHour / offersHour < 0.6) {
    out.push({
      id: 'accept', level: 'warn', icon: 'hand-left',
      title: `Haydovchilar takliflarning ${pct(1 - acceptsHour / offersHour)} ini qabul qilmayapti`,
      text: "Odatda sabab — narx past yoki olish nuqtasi uzoq. Boshlang'ich narx yoki komissiyani ko'rib chiqing, talab yuqori hududlarga koeffitsient qo'ying.",
      metric: pct(acceptsHour / offersHour),
      actions: [{ label: 'Narxlarni ochish', to: '/admin/pricing' }],
    });
  }

  // 5. Prognoz: keyingi soatda haydovchi yetadimi
  const hr = hourly(list, now);
  const next = hr.forecast[(hr.hour + 1) % 24];
  if (hr.hour < 23 && next != null && next > 0) {
    const need = Math.ceil(next / TRIPS_PER_DRIVER_HOUR);
    if (need > k.online * 1.2 && need - k.online >= 3) {
      out.push({
        id: 'forecast', level: 'warn', icon: 'trending-up',
        title: `${hh(hr.hour + 1)} da ~${next} ta buyurtma kutilmoqda`,
        text: `Buning uchun ~${need} ta haydovchi kerak, hozir liniyada ${k.online} ta. Prognoz o'tgan 7 kun va bugungi talab (${pct(hr.trend)}) asosida.`,
        metric: `+${need - k.online}`,
        actions: [{ label: 'Haydovchilarni chaqirish', cmds: [{ cmd: 'notice', target: 'all', title: `${hh(hr.hour + 1)} dan tig'iz soat`, text: `Prognoz bo'yicha ${hh(hr.hour + 1)} da buyurtmalar ko'payadi. Liniyaga chiqing — talab yuqori hududlar xaritada ko'rinadi.` }], confirm: 'Ilovasi ochiq barcha haydovchilarga xabar yuborilsinmi?', done: 'Xabar yuborildi' }],
      });
    }
  }

  // 6. Hujjatlar
  const q = docQueue(s, new Date(now));
  if (q.pending.length) {
    const manual = q.pending.filter(p => p.check.decision !== 'approve').length;
    const oldest = Math.max(...q.pending.map(p => now - t(p.driver.docs[p.kind]!.receivedAt ?? p.driver.docs[p.kind]!.submittedAt ?? new Date(now).toISOString())));
    out.push({
      id: 'docs', level: oldest > 30 * MIN || manual ? 'warn' : 'info', icon: 'document-text',
      title: `${q.pending.length} ta hujjat tekshiruvni kutmoqda`,
      text: `${manual ? `${manual} tasini moderator ko'rishi kerak (avtomatik tekshiruv shubhali deb belgiladi). ` : 'Hammasi avtomatik tekshiruvdan o\'tdi. '}Eng uzoq kutayotgani — ${Math.max(1, Math.round(oldest / MIN))} daqiqa.`,
      metric: String(q.pending.length),
      actions: [{ label: "Navbatni ochish", to: '/admin/documents' }],
    });
  }
  const soon = q.expiring.filter(e => e.days <= 14);
  if (soon.length) {
    out.push({
      id: 'expiring', level: soon.some(e => e.days <= 3) ? 'warn' : 'info', icon: 'calendar',
      title: `${soon.length} ta hujjat muddati 14 kun ichida tugaydi`,
      text: soon.slice(0, 3).map(e => `${e.driver.name} — ${DOC_META[e.kind].short}, ${e.days} kun`).join('; ') + (soon.length > 3 ? '…' : ''),
      actions: [{
        label: 'Ogohlantirish yuborish',
        cmds: soon.map(e => ({ cmd: 'notice' as const, target: e.driver.id, title: 'Hujjat muddati tugayapti', text: `${DOC_META[e.kind].title} muddati ${e.days} kundan so'ng tugaydi. Liniyada qolish uchun yangisini «Hujjatlar» bo'limiga yuklang.` })),
        done: 'Ogohlantirishlar yuborildi',
      }],
    });
  }

  // 7. Xavfli haydovchilar
  const risky = Object.values(s.drivers).filter(d => !d.blocked).map(d => ({ d, r: driverRisk(d, todayOrders) })).filter(x => x.r.level > 0)
    .sort((a, b) => b.r.level - a.r.level).slice(0, 3);
  for (const { d, r } of risky) {
    out.push({
      id: `risk:${d.id}`, level: r.level === 2 ? 'warn' : 'info', icon: 'person-circle',
      title: `${d.name}: e'tibor talab qilinadi`,
      text: r.reasons.join('; ') + '.',
      actions: [
        { label: 'Profilni ochish', to: `/admin/drivers/${d.id}` },
        { label: 'Ogohlantirish', cmds: [{ cmd: 'notice', target: d.id, title: 'YUMS sifat nazorati', text: `Hurmatli ${d.name.split(' ')[0]}, ko'rsatkichlaringizda muammo bor: ${r.reasons.join('; ')}. Iltimos, xizmat sifatiga e'tibor bering — takrorlansa, hisob vaqtincha cheklanadi.` }], done: 'Ogohlantirish yuborildi' },
      ],
    });
  }

  // 8. Shubhali safarlar (bugun)
  const odd = todayOrders.filter(o => o.status === 'finished' && o.finalPrice && o.finalPrice > o.price * 1.8);
  if (odd.length) {
    out.push({
      id: 'odd', level: 'info', icon: 'search',
      title: `${odd.length} ta safar narxi kutilganidan ancha yuqori`,
      text: `Yakuniy narx dastlabki narxdan 1,8 barobardan ko'p (uzoq pullik kutish yoki noto'g'ri yakunlash). Masalan: ${odd[0].pickup.title} → ${odd[0].destination.title}.`,
      actions: [{ label: "Safarni ko'rish", to: `/admin/orders?id=${odd[0].id}` }],
    });
  }

  // 9. Arizalar
  const fresh = s.leads.filter(l => l.status === 'new');
  if (fresh.length) {
    const late = fresh.filter(l => now - t(l.at) > 24 * H).length;
    out.push({
      id: 'leads', level: late ? 'warn' : 'info', icon: 'person-add',
      title: `${fresh.length} ta yangi haydovchilik arizasi`,
      text: late ? `${late} tasi 24 soatdan beri javobsiz — nomzodlar boshqa xizmatga ketib qolishi mumkin.` : 'Saytdan kelgan arizalar — nomzodlarga qo\'ng\'iroq qiling.',
      metric: String(fresh.length),
      actions: [{ label: 'Arizalarni ochish', to: '/admin/leads' }],
    });
  }

  // 10. O'tgan haftaga nisbatan
  if (k.lastWeekSamePeriod >= 20) {
    const diff = k.today / k.lastWeekSamePeriod - 1;
    if (Math.abs(diff) >= 0.1) {
      out.push({
        id: 'trend', level: diff > 0 ? 'good' : 'info', icon: diff > 0 ? 'arrow-up-circle' : 'arrow-down-circle',
        title: `Buyurtmalar o'tgan haftaga nisbatan ${diff > 0 ? '+' : ''}${pct(diff)}`,
        text: `Bugun shu vaqtgacha ${k.today} ta, o'tgan hafta shu kuni shu vaqtgacha ${k.lastWeekSamePeriod} ta edi.`,
      });
    }
  }

  if (!out.some(i => i.level === 'critical' || i.level === 'warn')) {
    out.unshift({ id: 'ok', level: 'good', icon: 'checkmark-circle', title: 'Hammasi joyida', text: "Talab va taklif muvozanatda, kutayotgan buyurtma va shoshilinch hujjat yo'q." });
  }
  const order: Record<Level, number> = { critical: 0, warn: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

/** Kunlik qisqa xulosa (bosh sahifa) */
export function summary(s: AdminState, list: OrderRec[], now = Date.now()) {
  const k = kpis(s, list, now);
  const hr = hourly(list, now);
  const parts: string[] = [];
  if (!k.today) return "Bugun hali buyurtma yo'q. Haydovchilar liniyaga chiqqach, talab va prognoz shu yerda ko'rinadi.";
  const diff = k.lastWeekSamePeriod >= 20 ? k.today / k.lastWeekSamePeriod - 1 : null;
  parts.push(`Bugun ${k.today} ta buyurtma${diff != null ? ` (o'tgan haftaning shu vaqtiga nisbatan ${diff >= 0 ? '+' : ''}${pct(diff)})` : ''}`);
  if (k.fulfillment != null) parts.push(`${pct(k.fulfillment)} i bajarildi`);
  parts.push(`safarlar summasi ${(k.gross / 1e6).toFixed(1).replace('.', ',')} mln so'm`);
  const top = hotspots(s, now)[0];
  let text = parts.join(', ') + '.';
  if (top && top.demand >= 2) text += ` Eng band hudud — ${top.place.title}.`;
  const next = hr.forecast[(hr.hour + 1) % 24];
  if (hr.hour < 23 && next) text += ` ${hh(hr.hour + 1)} da ~${next} ta buyurtma kutilmoqda.`;
  return text;
}
