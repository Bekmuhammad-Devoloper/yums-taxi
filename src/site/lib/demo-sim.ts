// Demo rejim: server bo'lmaganda admin panel uchun brauzer ichidagi simulyatsiya.
// Server bilan bir xil xabarlarni chiqaradi (admin:init, admin:live, admin:order …) va bir xil buyruqlarni qabul qiladi,
// shuning uchun panel kodi ikkala rejimda o'zgarmaydi. Narx sozlamalari, sayt matni va arizalar brauzer xotirasida —
// sayt (demo) ham shularni o'qiydi, ya'ni paneldagi o'zgarish saytda darhol ko'rinadi.
import { DOC_KINDS, DOC_META, type DocKind } from '@/driver/lib/docs';
import { CAR_MODELS, carTitle, tariffChecks } from '@/driver/lib/requirements';
import { PLACES, type LatLng, type Place } from '@/lib/data';
import type { ConnState } from '@/lib/dispatch';
import { bearing, distanceKm, priceFor } from '@/lib/geo';
import { tariffOf, zoneActive, zoneSurgeAt } from '@/lib/remote-config';

import type { AdminClientMsg, AdminDriver, AdminServerMsg, DocMeta, DriverStats, LiveDriver, LogEntry, OrderRec } from './admin-types';
import { DEMO_KEYS, demoRead, demoWrite, EMPTY_CONFIG, type AdminConfig, type Lead } from './api';
import type { ContentOverrides } from './content';
import { precheck } from './precheck';

type Listener = (m: AdminServerMsg) => void;
type Sim = { target?: LatLng; from?: LatLng; to?: LatLng; t0?: number; dur?: number };
type Active = { stage: 'searching' | 'toPickup' | 'waiting' | 'ride'; tried: Set<string>; nextTry: number; offerTo?: string; offerUntil?: number; until?: number };

const H = 3600000, MIN = 60000, DAY = 24 * H;
/** demo vaqti: mashinalar real tezlikdan ~25 barobar tez yuradi */
const KM_PER_SEC_BUSY = 0.2, KM_PER_SEC_FREE = 0.05;

/** Takrorlanadigan tasodifiy sonlar (har ochilganda bir xil boshlang'ich holat) */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES: [string, 'm' | 'f'][] = [
  ['Jasur Karimov', 'm'], ['Sardor Aliyev', 'm'], ['Akmal Rasulov', 'm'], ['Bobur Tursunov', 'm'], ['Dilshod Ergashev', 'm'], ['Sherzod Yusupov', 'm'],
  ['Malika Yusupova', 'f'], ['Javohir Qodirov', 'm'], ['Rustam Nazarov', 'm'], ['Aziz Rahimov', 'm'], ['Otabek Sobirov', 'm'], ['Dilnoza Rahimova', 'f'],
  ['Farrux Mirzayev', 'm'], ['Sanjar Ismoilov', 'm'], ['Bekzod Hamidov', 'm'], ['Ulug\'bek Saidov', 'm'], ['Nigora Aminova', 'f'], ['Eldor Xolmatov', 'm'],
  ['Islom Abdullayev', 'm'], ['Doniyor Murodov', 'm'], ['Kamron Tojiyev', 'm'], ['Madina Ergasheva', 'f'], ['Nodir Usmonov', 'm'], ['Anvar Jo\'rayev', 'm'],
  ['Shoxrux Olimov', 'm'], ['Zarina Qosimova', 'f'], ['Behruz Karimov', 'm'], ['Temur Rashidov', 'm'],
];
const NEW_NAMES: [string, 'm' | 'f'][] = [['Mirjalol Hakimov', 'm'], ['Gulnora Tursunova', 'f'], ['Abdulla Qahhorov', 'm'], ['Oybek Sultonov', 'm'], ['Ra\'no Ahmedova', 'f'], ['Sarvar Ibragimov', 'm']];
const PASSENGERS = ['Aziza', 'Bekzod', 'Dilshod', 'Madina', 'Sherzod', 'Nigora', 'Javohir', 'Kamola', 'Lola', 'Timur', 'Feruza', 'Sardor', 'Shahnoza', 'Alisher'];
const COLORS = ['Oq', 'Kumush', 'Qora', 'Kulrang', "Ko'k", 'Sariq'];
const REGIONS = ['01', '01', '01', '10', '20', '30', '40'];
const LETTERS = 'ABCDEFGHKLMNOPRSTUXYZ';
/** Talab ko'p tushadigan joylar (ulushi) */
const HOT_WEIGHT: Record<string, number> = { vokzal: 3, chorsu: 3, tcity: 2.5, airport: 2, amirtemur: 2, magic: 1.5, megaplanet: 1.5, yunusobod: 1.5, chilonzor: 2 };
const TARIFF_WEIGHT: [string, number][] = [['start', 0.62], ['comfort', 0.22], ['business', 0.06], ['minivan', 0.05], ['delivery', 0.05]];
/** Soatlar bo'yicha talab (cho'qqi = 1) */
const HOURS = [0.25, 0.15, 0.1, 0.08, 0.08, 0.15, 0.4, 0.85, 1, 0.8, 0.65, 0.6, 0.62, 0.6, 0.58, 0.62, 0.75, 0.95, 1, 0.9, 0.75, 0.6, 0.5, 0.35];
const PEAK_PER_HOUR = 34;

const emptyStats = (): DriverStats => ({ offers: 0, accepted: 0, declined: 0, missed: 0, cancelled: 0, completed: 0, noShow: 0, revenue: 0, ratings: 0, ratingSum: 0, lowRatings: 0 });
const iso = (ms: number) => new Date(ms).toISOString();
const ddmmyyyy = (ms: number) => { const d = new Date(ms); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };

export class DemoSim {
  state: ConnState = 'online';
  private listeners = new Set<Listener>();
  private ready = false;
  private r = seeded(20261030);
  private drivers = new Map<string, AdminDriver>();
  private live = new Map<string, LiveDriver & Sim>();
  private orders = new Map<string, OrderRec>();
  private active = new Map<string, Active>();
  private leads: Lead[] = [];
  private config: AdminConfig = EMPTY_CONFIG;
  private content: ContentOverrides = {};
  private log: LogEntry[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];
  private hot = 'chorsu';
  private seq = 0;
  private newDrivers = 0;
  private closed = false;

  constructor() {
    this.boot();
  }

  /* ---------- Klient bilan bir xil interfeys (DispatchClient o'rnida) ---------- */

  on(f: Listener) {
    this.listeners.add(f);
    if (this.ready) f(this.initMsg());
    return () => { this.listeners.delete(f); };
  }
  onState(f: (s: ConnState) => void) { f('online'); return () => {}; }
  send(m: AdminClientMsg) { if (this.ready) this.command(m); }
  close() {
    this.closed = true;
    this.timers.forEach(clearInterval);
    this.listeners.clear();
  }

  private emit(m: AdminServerMsg) { for (const f of this.listeners) f(m); }
  private uid(p: string) { return p + Date.now().toString(36) + (this.seq++).toString(36); }
  private pick<T>(list: T[]) { return list[Math.floor(this.r() * list.length)]; }
  private weighted<T>(list: [T, number][]) {
    let x = this.r() * list.reduce((n, [, w]) => n + w, 0);
    for (const [v, w] of list) { x -= w; if (x <= 0) return v; }
    return list[list.length - 1][0];
  }
  private jitter(p: LatLng, km: number): LatLng {
    const a = this.r() * Math.PI * 2, d = Math.sqrt(this.r()) * km;
    return { latitude: p.latitude + (Math.sin(a) * d) / 111.32, longitude: p.longitude + (Math.cos(a) * d) / (111.32 * Math.cos((p.latitude * Math.PI) / 180)) };
  }
  private addLog(text: string, kind: LogEntry['kind'] = 'system', extra: Partial<LogEntry> = {}, at = Date.now()) {
    const e: LogEntry = { id: this.uid('l'), at: iso(at), kind, text, ...extra };
    this.log.push(e);
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
    if (this.ready) this.emit({ t: 'admin:log', entry: e });
  }

  /* ---------- Boshlang'ich holat ---------- */

  private async boot() {
    const [config, content, leads] = await Promise.all([demoRead.config(), demoRead.content(), demoRead.leads()]);
    if (this.closed) return;
    this.config = { ...EMPTY_CONFIG, ...config, zones: (config.zones ?? []).filter(z => zoneActive(z)) };
    this.content = content;
    const now = Date.now();
    this.seedDrivers(now);
    this.seedHistory(now);
    this.leads = leads.length ? leads : this.seedLeads(now);
    if (!leads.length) demoWrite(DEMO_KEYS.leads, this.leads);
    this.ready = true;
    const init = this.initMsg();
    for (const f of this.listeners) f(init);
    // yaqinda kelgan hujjatlar avtomatik tekshiriladi (yoqilgan bo'lsa)
    for (const d of this.drivers.values()) for (const k of DOC_KINDS) if (d.docs[k]?.status === 'review') this.autoReview(d.id, k);
    this.timers.push(setInterval(() => this.tick(), 1000));
    this.timers.push(setInterval(() => this.syncLeads(), 4000));
    this.timers.push(setInterval(() => this.churn(), 20000));
    this.timers.push(setInterval(() => this.newDriver(), 100000));
    this.timers.push(setInterval(() => { this.hot = this.pick(['chorsu', 'vokzal', 'tcity', 'chilonzor', 'yunusobod']); }, 10 * MIN));
  }

  private initMsg(): AdminServerMsg {
    return {
      t: 'admin:init', at: iso(Date.now()), drivers: [...this.drivers.values()], photos: {}, live: this.liveList(), orders: [...this.orders.values()],
      leads: this.leads, config: this.config, content: this.content, log: this.log.slice(-300),
    };
  }

  private plate() {
    const L = () => LETTERS[Math.floor(this.r() * LETTERS.length)];
    return `${this.pick(REGIONS)} ${L()} ${String(100 + Math.floor(this.r() * 900))} ${L()}${L()}`;
  }
  private docNumber(kind: DocKind) {
    const L = () => LETTERS[Math.floor(this.r() * LETTERS.length)];
    const n = (len: number) => String(Math.floor(this.r() * 10 ** len)).padStart(len, '0');
    return kind === 'license' ? `A${L()} ${n(7)}` : kind === 'techPassport' ? `AA${L()} ${n(7)}` : kind === 'taxiLicense' ? `TL ${n(6)}` : `EA${L()} ${n(7)}`;
  }
  private makeDoc(kind: DocKind, now: number, opt: Partial<{ issuedAgoY: number; expiresInD: number; status: DocMeta['status']; receivedAgoMin: number; number: string }> = {}): DocMeta {
    const issuedAgo = (opt.issuedAgoY ?? (kind === 'license' ? 4 + this.r() * 10 : kind === 'osago' ? this.r() * 0.8 : 1 + this.r() * 3)) * 365 * DAY;
    const expiresIn = (opt.expiresInD ?? (kind === 'license' ? 400 + this.r() * 2500 : kind === 'osago' ? 40 + this.r() * 300 : 200 + this.r() * 1000)) * DAY;
    const status = opt.status ?? 'approved';
    const received = now - (opt.receivedAgoMin ?? 60 * 24 * (10 + this.r() * 300)) * MIN;
    return {
      kind, number: opt.number ?? this.docNumber(kind), issued: ddmmyyyy(now - issuedAgo), expires: DOC_META[kind].expires ? ddmmyyyy(now + expiresIn) : undefined,
      categories: kind === 'license' ? (this.r() < 0.3 ? 'B, C' : 'B') : undefined, status, submittedAt: iso(received - 20000), receivedAt: iso(received),
      checkedAt: status === 'review' ? undefined : iso(received + 3 * MIN), by: status === 'review' ? undefined : this.r() < 0.7 ? 'auto' : 'admin',
      hasFront: true, hasBack: DOC_META[kind].back, sample: false,
    };
  }

  private seedDrivers(now: number) {
    NAMES.forEach(([name, gender], i) => {
      const model = i % 9 === 4 ? this.pick(CAR_MODELS.filter(m => m.cls === 'business')) : i % 7 === 3 ? this.pick(CAR_MODELS.filter(m => m.cls === 'comfort')) : i === 20 ? CAR_MODELS.find(m => m.model === 'Orlando')! : this.pick(CAR_MODELS.filter(m => m.cls === 'economy'));
      const year = 2014 + Math.floor(this.r() * 11);
      const trips = Math.floor(80 + this.r() * 5200);
      const rating = i === 25 ? 4.52 : Math.round((4.68 + this.r() * 0.31) * 100) / 100;
      const tariffs = ['start', 'comfort', 'business', 'minivan', 'delivery'].filter(t => tariffChecks(t, carTitle(model), year, { docsApproved: true, rating, trips, activity: 90, deliveryTerms: true }).every(c => c.ok));
      const id = `dm${i + 1}`;
      const joined = now - (30 + this.r() * 900) * DAY;
      const docs = Object.fromEntries(DOC_KINDS.map(k => [k, this.makeDoc(k, now)])) as AdminDriver['docs'];
      this.drivers.set(id, {
        id, name, gender, phone: `+998 9${Math.floor(this.r() * 10)} ${100 + Math.floor(this.r() * 900)} ${10 + Math.floor(this.r() * 90)} ${10 + Math.floor(this.r() * 90)}`,
        car: carTitle(model), color: this.pick(COLORS), plate: this.plate(), year, city: 'Toshkent', joinedAt: iso(joined), rating, trips, tariffs: tariffs.length ? tariffs : ['start'],
        hasPhoto: false, createdAt: iso(joined), lastSeen: iso(now - this.r() * 3 * H), stats: emptyStats(), docs,
      });
    });
    const d = (n: number) => this.drivers.get(`dm${n}`)!;
    // Tekshiruv navbati: har xil holatlar avtomatik tekshiruvni ko'rsatish uchun
    d(3).docs.license = this.makeDoc('license', now, { status: 'review', receivedAgoMin: 1 });
    d(7).docs.osago = this.makeDoc('osago', now, { status: 'review', receivedAgoMin: 26, expiresInD: 9 });
    d(11).docs.license = this.makeDoc('license', now, { status: 'review', receivedAgoMin: 41, number: d(2).docs.license!.number });
    d(15).docs.taxiLicense = this.makeDoc('taxiLicense', now, { status: 'review', receivedAgoMin: 2, expiresInD: -20 });
    d(18).docs.license = this.makeDoc('license', now, { status: 'review', receivedAgoMin: 14, issuedAgoY: 1.2 });
    // muddati yaqinda tugaydiganlar
    d(5).docs.osago = this.makeDoc('osago', now, { expiresInD: 6 });
    d(9).docs.taxiLicense = this.makeDoc('taxiLicense', now, { expiresInD: 12 });
    d(22).docs.osago = this.makeDoc('osago', now, { expiresInD: 2 });
    // bloklangan haydovchi
    d(19).blocked = { reason: "Bir kunda 7 ta buyurtmani bekor qilgan, yo'lovchilar shikoyati", at: iso(now - 26 * H) };
    // liniyadagilar: 18 tasi, hujjatlari tasdiqlanganlardan
    let online = 0;
    for (const x of this.drivers.values()) {
      const ok = !x.blocked && DOC_KINDS.every(k => x.docs[k]?.status === 'approved');
      if (!ok || online >= 18 || this.r() < 0.25) continue;
      online++;
      const base = this.weightedPlace();
      const pos = this.jitter(base, 2.5);
      this.live.set(x.id, { id: x.id, busy: false, pos, heading: this.r() * 360, tariffs: x.tariffs });
    }
  }

  private weightedPlace(): Place {
    return this.weighted(PLACES.map(p => [p, HOT_WEIGHT[p.id!] ?? 1] as [Place, number]));
  }

  /** O'tgan 7 kun va bugungi kunning shu vaqtgacha bo'lgan buyurtmalari */
  private seedHistory(now: number) {
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
    const ids = [...this.drivers.keys()].filter(id => id !== 'dm19');
    const risky = { cancel: 'dm21', noShow: 'dm24', lowRating: 'dm26' };
    for (let day = 7; day >= 0; day--) {
      const dayStart = d0.getTime() - day * DAY;
      const wd = new Date(dayStart).getDay();
      const weekend = wd === 0 || wd === 6;
      const dayFactor = 0.85 + this.r() * 0.3;
      for (let h = 0; h < 24; h++) {
        const w = weekend ? (h >= 7 && h <= 10 ? HOURS[h] * 0.55 : h >= 18 ? HOURS[h] * 1.15 : HOURS[h]) : HOURS[h];
        const n = Math.round(PEAK_PER_HOUR * w * dayFactor * (0.8 + this.r() * 0.4));
        for (let i = 0; i < n; i++) {
          const ts = dayStart + h * H + this.r() * H;
          if (ts > now - 12 * MIN) continue;
          this.historyOrder(ts, this.pick(ids), risky);
        }
      }
    }
    // xavfli haydovchi uchun bugun bir necha «mijoz chiqmadi»
    for (let i = 0; i < 4; i++) this.historyOrder(now - (20 + i * 35) * MIN, risky.noShow, risky, 'noShow');
  }

  private makeOrder(ts: number, pickupPt?: LatLng): OrderRec {
    const from = pickupPt ? { ...pickupPt, title: this.titleNear(pickupPt) } : (() => { const p = this.weightedPlace(); const pt = this.jitter(p, 0.7); return { ...pt, title: this.titleNear(pt) }; })();
    let dest = this.pick(PLACES);
    while (distanceKm(dest, from) < 1.5) dest = this.pick(PLACES);
    const km = Math.round((distanceKm(from, dest) * 1.3 + 0.4) * 10) / 10;
    const min = Math.round((km / 24) * 60 + 3);
    const tariffId = this.weighted(TARIFF_WEIGHT);
    const surge = zoneSurgeAt(this.config.zones, from, ts);
    const price = priceFor(tariffOf(tariffId, this.config), km, min, surge);
    return {
      id: 'o' + ts.toString(36) + (this.seq++).toString(36), createdAt: iso(ts), status: 'searching',
      pickup: from, destination: { title: dest.title, latitude: dest.latitude, longitude: dest.longitude },
      km, min, price, tariffId, payment: this.r() < 0.55 ? 'cash' : 'card', surge: surge > 1 ? surge : undefined, options: [],
      passenger: { id: 'p' + Math.floor(this.r() * 5000), name: this.pick(PASSENGERS), phone: `+998 9${Math.floor(this.r() * 10)} ${100 + Math.floor(this.r() * 900)} ${10 + Math.floor(this.r() * 90)} ${10 + Math.floor(this.r() * 90)}`, rating: Math.round((4.5 + this.r() * 0.5) * 10) / 10 },
      offers: 0, timeline: [{ t: 'created', at: iso(ts) }],
    };
  }

  private titleNear(p: LatLng) {
    const n = PLACES.reduce((b, x) => (distanceKm(p, x) < distanceKm(p, b) ? x : b), PLACES[0]);
    return distanceKm(p, n) < 0.35 ? n.title : `${n.title} yaqinida`;
  }

  private historyOrder(ts: number, driverId: string, risky: { cancel: string; noShow: string; lowRating: string }, force?: 'noShow') {
    const o = this.makeOrder(ts);
    const d = this.drivers.get(driverId)!;
    const st = d.stats;
    const hour = new Date(ts).getHours();
    const peak = HOURS[hour] > 0.9;
    const x = this.r();
    let at = ts;
    const ev = (t: string, plusSec: number, extra: Partial<OrderRec['timeline'][number]> = {}) => { at += plusSec * 1000; o.timeline.push({ t, at: iso(at), ...extra }); };
    const fail = !force && x < (peak ? 0.06 : 0.025);
    const passengerCancel = !force && !fail && x < (peak ? 0.12 : 0.08);
    if (fail) {
      ev('offer', 10 + this.r() * 20, { driverId }); st.offers++; ev('declined', 6, { driverId }); st.declined++;
      ev('noDriver', 60); o.status = 'failed'; o.cancelReason = 'noDriver';
    } else if (passengerCancel) {
      if (this.r() < 0.5) { ev('offer', 12, { driverId }); st.offers++; ev('accepted', 8, { driverId }); st.accepted++; o.driverId = driverId; o.driverName = d.name; }
      ev('cancelled', 60 + this.r() * 180); o.status = 'cancelled'; o.cancelReason = 'passenger';
    } else {
      if (this.r() < 0.15) { ev('offer', 8, { driverId: 'dm1' }); ev('declined', 5, { driverId: 'dm1' }); }
      ev('offer', 10 + this.r() * 25, { driverId }); st.offers++;
      ev('accepted', 4 + this.r() * 10, { driverId }); st.accepted++;
      o.driverId = driverId; o.driverName = d.name; o.offers = o.timeline.filter(e => e.t === 'offer').length;
      if (driverId === risky.cancel && this.r() < 0.35) { st.cancelled++; ev('driverCancelled', 90, { driverId }); }
      ev('arrived', (2 + this.r() * 7) * 60);
      if (force === 'noShow' || (driverId === risky.noShow && this.r() < 0.15)) {
        ev('noShow', 300); o.status = 'noShow'; o.cancelReason = 'noShow'; st.noShow++;
      } else {
        ev('started', (0.5 + this.r() * 2.5) * 60);
        ev('finished', o.min * 60);
        o.status = 'finished';
        o.finalPrice = this.r() < 0.06 ? o.price + 500 * Math.ceil(this.r() * 6) : o.price;
        st.completed++; st.revenue += o.finalPrice;
        if (this.r() < 0.7) {
          const stars = driverId === risky.lowRating ? (this.r() < 0.4 ? 3 : 4) : this.r() < 0.82 ? 5 : this.r() < 0.8 ? 4 : this.r() < 0.6 ? 3 : 2;
          o.stars = stars; o.tip = this.r() < 0.2 ? this.pick([2000, 3000, 5000, 10000]) : 0;
          st.ratings++; st.ratingSum += stars; if (stars <= 3) st.lowRatings++;
          ev('rated', 40);
        }
      }
    }
    o.offers = o.timeline.filter(e => e.t === 'offer').length;
    this.orders.set(o.id, o);
  }

  private seedLeads(now: number): Lead[] {
    const mk = (name: string, phone: string, car: string, year: number, agoH: number, status: Lead['status'], note?: string): Lead => {
      const tariffs = ['start', 'comfort', 'business', 'minivan', 'delivery'].filter(t => tariffChecks(t, car, year, { docsApproved: true, rating: 5, trips: 0, activity: 100, deliveryTerms: true }).every(c => c.ok));
      return { id: this.uid('a'), at: iso(now - agoH * H), name, phone, city: 'Toshkent', car, year, tariffs, lang: 'uz', status, note };
    };
    return [
      mk('Umid Qodirov', '+998901234501', 'Chevrolet Cobalt', 2021, 1.5, 'new'),
      mk('Ravshan Tojiev', '+998935557711', 'Kia K5', 2022, 5, 'new'),
      mk('Lobar Saidova', '+998977203040', 'Hyundai Elantra', 2019, 30, 'new'),
      mk('Murod Ergashev', '+998946662211', 'Chevrolet Nexia 3', 2017, 52, 'contacted', 'Ertaga ofisga keladi'),
      mk('Ilhom Nazarov', '+998998887766', 'Chevrolet Orlando', 2016, 80, 'contacted'),
      mk('Kamol Usmonov', '+998901110022', 'Chevrolet Spark', 2006, 120, 'rejected', "Avtomobil 2008-yildan eski"),
      mk('Asror Rahimov', '+998933334455', 'Toyota Camry', 2021, 150, 'approved', "Ro'yxatdan o'tdi, hujjatlari tasdiqlandi"),
    ];
  }

  /* ---------- Jonli simulyatsiya ---------- */

  private liveList(): LiveDriver[] {
    return [...this.live.values()].map(({ id, busy, pending, pos, heading, orderId, nextOrderId, offering, tariffs }) => ({ id, busy, pending, pos, heading, orderId, nextOrderId, offering, tariffs }));
  }

  private emitOrder(o: OrderRec) { this.emit({ t: 'admin:order', order: { ...o, timeline: [...o.timeline] } }); }
  private emitDriver(d: AdminDriver) { this.emit({ t: 'admin:driver', driver: { ...d, stats: { ...d.stats }, docs: { ...d.docs } } }); }
  private stat(id: string, inc: Partial<DriverStats>) {
    const d = this.drivers.get(id);
    if (!d) return;
    for (const [k, v] of Object.entries(inc)) d.stats[k as keyof DriverStats] += v as number;
    this.emitDriver(d);
  }

  private tick() {
    const now = Date.now();
    // yangi buyurtmalar: soatdagi talabga qarab (demo uchun tezlashtirilgan)
    const rate = 0.12 + HOURS[new Date(now).getHours()] * 0.16;
    if (this.r() < rate) this.spawn(now);
    for (const [id, a] of this.active) this.step(id, a, now);
    for (const l of this.live.values()) this.move(l, now);
    this.emit({ t: 'admin:live', at: iso(now), live: this.liveList() });
  }

  private spawn(now: number) {
    const hot = PLACES.find(p => p.id === this.hot)!;
    const o = this.makeOrder(now, this.r() < 0.4 ? this.jitter(hot, 0.8) : undefined);
    this.orders.set(o.id, o);
    this.active.set(o.id, { stage: 'searching', tried: new Set(), nextTry: now + 2500 });
    this.emitOrder(o);
  }

  private freeDrivers(o: OrderRec, tried: Set<string>) {
    return [...this.live.values()].filter(l => !l.busy && !l.pending && l.pos && !tried.has(l.id) && !this.drivers.get(l.id)?.blocked && (l.tariffs ?? []).includes(o.tariffId))
      .sort((a, b) => distanceKm(a.pos!, o.pickup) - distanceKm(b.pos!, o.pickup));
  }

  private route(l: LiveDriver & Sim, to: LatLng, kmPerSec: number, now: number) {
    l.from = l.pos; l.to = to; l.t0 = now;
    l.dur = Math.max(4000, (distanceKm(l.pos!, to) / kmPerSec) * 1000);
    l.heading = bearing(l.pos!, to);
  }

  private step(id: string, a: Active, now: number) {
    const o = this.orders.get(id);
    if (!o) { this.active.delete(id); return; }
    const ev = (t: string, extra: Partial<OrderRec['timeline'][number]> = {}) => o.timeline.push({ t, at: iso(now), ...extra });
    if (a.stage === 'searching') {
      if (now - Date.parse(o.createdAt) > 12000 && this.r() < 0.004) {
        ev('cancelled'); o.status = 'cancelled'; o.cancelReason = 'passenger';
        if (a.offerTo) { const l = this.live.get(a.offerTo); if (l) l.offering = undefined; }
        this.active.delete(id); this.emitOrder(o); return;
      }
      if (now < a.nextTry) return;
      if (a.offerTo) {
        const l = this.live.get(a.offerTo);
        if (l) l.offering = undefined;
        if (!l || l.busy) { a.offerTo = undefined; a.nextTry = now + 500; return; }
        if (this.r() < 0.84) {
          ev('accepted', { driverId: l.id });
          o.status = 'accepted'; o.driverId = l.id; o.driverName = this.drivers.get(l.id)?.name;
          l.busy = true; l.orderId = o.id;
          this.route(l, o.pickup, KM_PER_SEC_BUSY, now);
          a.stage = 'toPickup';
          this.stat(l.id, { accepted: 1 });
        } else {
          ev('declined', { driverId: l.id });
          this.stat(l.id, { declined: 1 });
          a.offerTo = undefined; a.nextTry = now + 800;
        }
        this.emitOrder(o);
        return;
      }
      const c = this.freeDrivers(o, a.tried)[0];
      if (!c) {
        if (now - Date.parse(o.createdAt) > 45000) {
          ev('noDriver'); o.status = 'failed'; o.cancelReason = 'noDriver';
          this.active.delete(id); this.emitOrder(o);
        } else { a.tried.clear(); a.nextTry = now + 3000; }
        return;
      }
      a.tried.add(c.id); a.offerTo = c.id; c.offering = o.id; a.nextTry = now + 2000 + this.r() * 3000;
      ev('offer', { driverId: c.id }); o.offers++;
      this.stat(c.id, { offers: 1 });
      this.emitOrder(o);
      return;
    }
    const l = o.driverId ? this.live.get(o.driverId) : undefined;
    if (!l) { // haydovchi liniyadan chiqib ketgan — buyurtma qayta qidiriladi
      o.status = 'searching'; o.driverId = undefined; o.driverName = undefined; ev('driverCancelled');
      this.active.set(id, { stage: 'searching', tried: new Set(), nextTry: now + 1000 }); this.emitOrder(o); return;
    }
    if (a.stage === 'toPickup' && l.t0 != null && now - l.t0 >= (l.dur ?? 0)) {
      if (this.r() < 0.03) { // haydovchi bekor qildi
        ev('driverCancelled', { driverId: l.id }); this.stat(l.id, { cancelled: 1 });
        o.status = 'searching'; o.driverId = undefined; o.driverName = undefined;
        l.busy = false; l.orderId = undefined;
        this.active.set(id, { stage: 'searching', tried: new Set([l.id]), nextTry: now + 1000 }); this.emitOrder(o); return;
      }
      ev('arrived'); o.status = 'arrived'; a.stage = 'waiting'; a.until = now + 4000 + this.r() * 5000;
      this.emitOrder(o);
    } else if (a.stage === 'waiting' && now >= (a.until ?? 0)) {
      if (this.r() < 0.02) {
        ev('noShow'); o.status = 'noShow'; o.cancelReason = 'noShow'; this.stat(l.id, { noShow: 1 });
        l.busy = false; l.orderId = undefined; this.active.delete(id); this.emitOrder(o); return;
      }
      ev('started'); o.status = 'started'; a.stage = 'ride';
      this.route(l, o.destination, KM_PER_SEC_BUSY, now);
      this.emitOrder(o);
    } else if (a.stage === 'ride' && l.t0 != null && now - l.t0 >= (l.dur ?? 0)) {
      ev('finished'); o.status = 'finished'; o.finalPrice = o.price;
      this.stat(l.id, { completed: 1, revenue: o.price });
      l.busy = false; l.orderId = undefined; l.target = undefined;
      this.active.delete(id); this.emitOrder(o);
      // yo'lovchi bahosi
      if (this.r() < 0.7) {
        const oid = o.id, did = l.id;
        setTimeout(() => {
          const rec = this.orders.get(oid);
          if (!rec || this.closed) return;
          const stars = this.r() < 0.85 ? 5 : this.r() < 0.8 ? 4 : 3;
          rec.stars = stars; rec.tip = this.r() < 0.2 ? this.pick([2000, 5000]) : 0;
          rec.timeline.push({ t: 'rated', at: iso(Date.now()) });
          this.stat(did, { ratings: 1, ratingSum: stars, lowRatings: stars <= 3 ? 1 : 0 });
          this.emitOrder(rec);
        }, 3000);
      }
    }
  }

  private move(l: LiveDriver & Sim, now: number) {
    if (!l.pos) return;
    if (l.busy && l.from && l.to && l.t0 != null && l.dur) {
      const k = Math.min(1, (now - l.t0) / l.dur);
      l.pos = { latitude: l.from.latitude + (l.to.latitude - l.from.latitude) * k, longitude: l.from.longitude + (l.to.longitude - l.from.longitude) * k };
      return;
    }
    if (l.busy) return;
    // bo'sh haydovchi shahar bo'ylab sekin yuradi
    if (!l.target || distanceKm(l.pos, l.target) < 0.1) l.target = this.jitter(this.r() < 0.5 ? this.weightedPlace() : this.pick(PLACES), 1.5);
    const d = distanceKm(l.pos, l.target);
    const k = Math.min(1, KM_PER_SEC_FREE / Math.max(0.001, d));
    l.heading = bearing(l.pos, l.target);
    l.pos = { latitude: l.pos.latitude + (l.target.latitude - l.pos.latitude) * k, longitude: l.pos.longitude + (l.target.longitude - l.pos.longitude) * k };
  }

  /** Haydovchilar liniyaga chiqib-kirib turadi */
  private churn() {
    const offline = [...this.drivers.values()].filter(d => !this.live.has(d.id) && !d.blocked && DOC_KINDS.every(k => d.docs[k]?.status === 'approved'));
    const free = [...this.live.values()].filter(l => !l.busy && !l.offering);
    if (this.r() < 0.55 && offline.length) {
      const d = this.pick(offline);
      this.live.set(d.id, { id: d.id, busy: false, pos: this.jitter(this.weightedPlace(), 2), heading: 0, tariffs: d.tariffs });
      d.lastSeen = iso(Date.now()); this.emitDriver(d);
    } else if (free.length > 10) {
      this.live.delete(this.pick(free).id);
    }
  }

  /** Vaqti-vaqti bilan yangi haydovchi ro'yxatdan o'tadi va hujjat yuboradi */
  private newDriver() {
    if (this.newDrivers >= NEW_NAMES.length) return;
    const now = Date.now();
    const [name, gender] = NEW_NAMES[this.newDrivers++];
    const model = this.pick(CAR_MODELS.filter(m => m.cls !== 'cargo'));
    const id = `dn${this.newDrivers}`;
    const year = 2016 + Math.floor(this.r() * 9);
    const docs = Object.fromEntries(DOC_KINDS.map(k => [k, this.makeDoc(k, now, { status: 'review', receivedAgoMin: 0 })])) as AdminDriver['docs'];
    const d: AdminDriver = {
      id, name, gender, phone: `+998 9${Math.floor(this.r() * 10)} ${100 + Math.floor(this.r() * 900)} ${10 + Math.floor(this.r() * 90)} ${10 + Math.floor(this.r() * 90)}`,
      car: carTitle(model), color: this.pick(COLORS), plate: this.plate(), year, city: 'Toshkent', joinedAt: iso(now), rating: 5, trips: 0, tariffs: ['start'],
      hasPhoto: false, createdAt: iso(now), lastSeen: iso(now), stats: emptyStats(), docs,
    };
    this.drivers.set(id, d);
    this.emitDriver(d);
    this.addLog(`Yangi haydovchi: ${name} (${d.plate})`, 'system', { driverId: id });
    for (const k of DOC_KINDS) {
      this.addLog(`${name}: ${DOC_META[k].title.toLowerCase()} tekshiruvga yuborildi`, 'system', { driverId: id });
      this.autoReview(id, k);
    }
  }

  private autoReview(driverId: string, kind: DocKind) {
    if (!this.config.autoApprove) return;
    const d = this.drivers.get(driverId);
    const doc = d?.docs[kind];
    if (!d || !doc || doc.status !== 'review') return;
    const check = precheck(doc, d, [...this.drivers.values()]);
    if (check.decision === 'manual') return;
    setTimeout(() => {
      if (this.closed || d.docs[kind] !== doc || doc.status !== 'review') return;
      this.decide(driverId, kind, check.decision === 'approve' ? 'approved' : 'rejected', check.note, 'auto');
    }, 2500 + this.r() * 1500);
  }

  private decide(driverId: string, kind: DocKind, status: 'approved' | 'rejected', note: string | undefined, by: 'auto' | 'admin') {
    const d = this.drivers.get(driverId);
    const doc = d?.docs[kind];
    if (!d || !doc) return false;
    d.docs[kind] = { ...doc, status, note: status === 'rejected' ? note || 'Hujjat talablarga mos emas — tuzatib qayta yuboring' : undefined, checkedAt: iso(Date.now()), by };
    this.emitDriver(d);
    this.addLog(`${d.name}: ${DOC_META[kind].title.toLowerCase()} ${status === 'approved' ? 'tasdiqlandi' : `rad etildi (${d.docs[kind]!.note})`}`, by, { driverId });
    if (!DOC_KINDS.every(k => d.docs[k]?.status === 'approved')) {
      const l = this.live.get(driverId);
      if (l && !l.busy) this.live.delete(driverId);
    }
    return true;
  }

  /** Saytdan (shu brauzerda) yuborilgan arizalar */
  private async syncLeads() {
    const stored = await demoRead.leads();
    for (const l of stored) {
      if (this.leads.some(x => x.id === l.id)) continue;
      this.leads.push(l);
      this.emit({ t: 'admin:lead', lead: l });
      this.addLog(`Saytdan yangi ariza: ${l.name}${l.car ? `, ${l.car}` : ''}`, 'system', { leadId: l.id });
    }
  }

  /* ---------- Buyruqlar ---------- */

  private command(m: AdminClientMsg) {
    const ack = (ok: boolean, error?: string, data: Partial<Extract<AdminServerMsg, { t: 'admin:ack' }>> = {}) => {
      setTimeout(() => this.emit({ t: 'admin:ack', ref: m.ref, ok, error: ok ? undefined : error, ...data }), 120);
    };
    const now = Date.now();
    switch (m.cmd) {
      case 'docDecision':
        return ack(this.decide(m.driverId, m.kind, m.status, m.note, 'admin'), 'Hujjat topilmadi');
      case 'docPhotos': {
        const doc = this.drivers.get(m.driverId)?.docs[m.kind];
        return doc ? ack(true, undefined, { photos: { front: 'sample', back: doc.hasBack ? 'sample' : undefined } }) : ack(false, 'Hujjat topilmadi');
      }
      case 'block': {
        const d = this.drivers.get(m.driverId);
        if (!d) return ack(false, 'Haydovchi topilmadi');
        d.blocked = { reason: m.reason || 'Qoidabuzarlik', at: iso(now) };
        const l = this.live.get(d.id);
        if (l && !l.busy) this.live.delete(d.id);
        this.emitDriver(d);
        this.addLog(`${d.name} bloklandi: ${d.blocked.reason}`, 'admin', { driverId: d.id });
        return ack(true);
      }
      case 'unblock': {
        const d = this.drivers.get(m.driverId);
        if (!d?.blocked) return ack(false, 'Haydovchi bloklanmagan');
        delete d.blocked;
        this.emitDriver(d);
        this.addLog(`${d.name} blokdan chiqarildi`, 'admin', { driverId: d.id });
        return ack(true);
      }
      case 'notice': {
        const live = [...this.live.values()];
        const tg = m.target;
        const sent = tg === 'all' ? live.length + Math.round((this.drivers.size - live.length) * 0.4)
          : tg === 'online' ? live.length
            : tg === 'free' ? live.filter(l => !l.busy).length
              : typeof tg === 'object' ? live.filter(l => l.pos && distanceKm(l.pos, tg.near) <= tg.km).length
                : this.drivers.has(tg) ? 1 : 0;
        this.addLog(`Xabar (${typeof tg === 'object' ? `${tg.km} km atrofga` : tg === 'all' ? 'hammaga' : tg === 'online' ? 'liniyadagilarga' : tg === 'free' ? "bo'shlarga" : this.drivers.get(tg)?.name ?? tg}): ${m.title || m.text} — ${sent} ta haydovchiga`, 'admin');
        return ack(true, undefined, { sent });
      }
      case 'cancelOrder': {
        const o = this.orders.get(m.orderId);
        const a = this.active.get(m.orderId);
        if (!o || !a) return ack(false, 'Buyurtma faol emas');
        if (o.driverId) { const l = this.live.get(o.driverId); if (l) { l.busy = false; l.orderId = undefined; } }
        if (a.offerTo) { const l = this.live.get(a.offerTo); if (l) l.offering = undefined; }
        o.status = 'cancelled'; o.cancelReason = 'admin'; o.timeline.push({ t: 'adminCancelled', at: iso(now) });
        this.active.delete(o.id);
        this.emitOrder(o);
        this.addLog(`Buyurtma bekor qilindi (operator): ${o.pickup.title} → ${o.destination.title}`, 'admin');
        return ack(true);
      }
      case 'config': {
        const p = m.patch;
        const c = { ...this.config, tariffs: { ...this.config.tariffs } };
        const changes: string[] = [];
        if (p.tariffs) for (const [id, v] of Object.entries(p.tariffs)) {
          if (v === null) { delete c.tariffs[id]; changes.push(`${id}: standart narx`); } else { c.tariffs[id] = v; changes.push(id); }
        }
        if ('commission' in p && p.commission !== undefined) { c.commission = p.commission; changes.push(`komissiya ${p.commission == null ? 'standart' : Math.round(p.commission * 100) + '%'}`); }
        if (typeof p.autoApprove === 'boolean') { c.autoApprove = p.autoApprove; changes.push(`avtomatik tekshiruv ${p.autoApprove ? 'yoqildi' : "o'chirildi"}`); }
        if (!changes.length) return ack(false, "O'zgarish yo'q");
        this.config = c;
        demoWrite(DEMO_KEYS.config, c);
        this.emit({ t: 'admin:config', config: c });
        this.addLog(`Sozlamalar: ${changes.join(', ')}`, 'admin');
        if (p.autoApprove) for (const d of this.drivers.values()) for (const k of DOC_KINDS) if (d.docs[k]?.status === 'review') this.autoReview(d.id, k);
        return ack(true);
      }
      case 'zone': {
        const z = m.zone;
        if (!(z.surge >= 1 && z.surge <= 3) || !(z.radiusKm >= 0.2 && z.radiusKm <= 10)) return ack(false, "Hudud ma'lumotlari noto'g'ri");
        const zone = { ...z, id: z.id ?? this.uid('z'), surge: Math.round(z.surge * 10) / 10 };
        const zones = [...this.config.zones.filter(x => x.id !== zone.id), zone];
        this.config = { ...this.config, zones };
        demoWrite(DEMO_KEYS.config, this.config);
        this.emit({ t: 'admin:config', config: this.config });
        this.addLog(`Yuqori talab hududi${zone.label ? ` «${zone.label}»` : ''}: ×${zone.surge}`, 'admin');
        return ack(true);
      }
      case 'zoneRemove': {
        if (!this.config.zones.some(z => z.id === m.id)) return ack(false, 'Hudud topilmadi');
        this.config = { ...this.config, zones: this.config.zones.filter(z => z.id !== m.id) };
        demoWrite(DEMO_KEYS.config, this.config);
        this.emit({ t: 'admin:config', config: this.config });
        this.addLog('Hudud o\'chirildi', 'admin');
        return ack(true);
      }
      case 'lead': {
        const l = this.leads.find(x => x.id === m.id);
        if (!l) return ack(false, 'Ariza topilmadi');
        if (m.patch.status) l.status = m.patch.status;
        if (typeof m.patch.note === 'string') l.note = m.patch.note.slice(0, 500);
        l.updatedAt = iso(now);
        demoWrite(DEMO_KEYS.leads, this.leads);
        this.emit({ t: 'admin:lead', lead: { ...l } });
        this.addLog(`Ariza «${l.name}»: ${{ new: 'yangi', contacted: "bog'lanildi", approved: 'qabul qilindi', rejected: 'rad etildi' }[l.status]}`, 'admin', { leadId: l.id });
        return ack(true);
      }
      case 'content':
        this.content = m.content;
        demoWrite(DEMO_KEYS.content, m.content);
        this.emit({ t: 'admin:content', content: m.content });
        this.addLog('Sayt matni yangilandi', 'admin');
        return ack(true);
    }
  }
}
