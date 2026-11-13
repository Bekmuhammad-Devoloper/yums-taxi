// YUMS Driver holati. Hisob, hujjatlar, smena, takliflar, safar, faollik, balans va daromad —
// backendda (docs/MOBILE-INTEGRATION.md §6). Takliflar socket orqali keladi, holat REST'dan tekshiriladi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Vibration } from 'react-native';

import { toast } from '@/components/toast';
import { updateProfile as saveUserProfile } from '@/lib/account-api';
import { ApiError, errorText } from '@/lib/api';
import { DEFAULT_CENTER, TARIFFS, type Driver, type LatLng, type PaymentId, type Place } from '@/lib/data';
import * as dapi from '@/lib/driver-api';
import type { DriverAccount, DriverOrder, DriverTrip, OfferView } from '@/lib/driver-api';
import { bearing, curve, decodePolyline, distanceKm, pathLength, pointAt } from '@/lib/geo';
import { getLang, isLang, onLangChange, tr } from '@/lib/i18n';
import { registerThisDevice } from '@/lib/push';
import { onRealtime, onRealtimeReady, startRealtime, stopRealtime } from '@/lib/realtime';
import { nameGender } from '@/lib/registry';
import { haptic, useStore } from '@/lib/store';
import { publicSettings, type PublicSettings } from '@/lib/trip-api';

import { toZones, type DemandZone } from './demand';
import { DOC_KINDS, DOC_META, emptyDoc, fromServerDoc, serverKind, toServerDoc, type DocKind, type DriverDoc } from './docs';
import { nextManeuver, OFF_ROUTE_M, planOf, progressOf, type NavPlan } from './nav';
import { tariffChecks, type Check } from './requirements';
import { say, setVoiceEnabled, setVoiceLang, type VoiceLang } from './voice';

/** tariffs — haydovchi yoqqan tariflar (ishlashi uchun shartlari ham bajarilishi kerak), year — avtomobil yili */
export type DriverProfile = Driver & { tariffs: string[]; city: string; joinedAt: string; year?: number; deliveryTerms?: boolean };

/** Haydovchiga taklif qilinadigan yoki u olgan buyurtma */
export type OrderOffer = {
  id: string;
  number?: string;
  passenger: { name: string; rating: number; gender?: 'm' | 'f'; phone?: string };
  pickup: Place;
  destination: Place;
  route: { km: number; min: number; coords: LatLng[] };
  tariffId: string;
  /** Yo'lovchi to'laydigan summa */
  price: number;
  /** Haydovchiga qoladigan qism (komissiyadan keyin) */
  earning: number;
  surge?: number;
  payment: PaymentId;
  options: string[];
  comment: string;
  createdAt: string;
};

export type Offer = { id: string; order: OrderOffer; distanceKm: number; expiresAt: number; total: number; chain?: boolean };

/** Safar bosqichlari: mijozga borish → kutish → yo'lda */
export type TripStage = 'toPickup' | 'waiting' | 'inride';
export type Trip = { order: OrderOffer; stage: TripStage; approach: LatLng[]; arrivedAt?: number; startedAt?: number; waitFee: number; cashToCollect: number };

export type Earning = {
  id: string; at: string; price: number; waitFee?: number; fee?: number; tip: number; stars?: number; passengerStars?: number;
  km: number; min: number; from: string; to: string; payment: PaymentId; tariffId?: string; surge?: number;
  /** mijoz chiqmadi */
  noShow?: boolean;
};
export type Payout = { id: string; at: string; amount: number; status?: string };
export type NavApp = 'yandex' | 'google';
export type GpsState = 'demo' | 'searching' | 'ok' | 'denied';

/** Safar tugagach ko'rsatiladigan hisob-kitob */
export type Summary = { earning: Earning; passenger: string; orderId: string };

export const feeOf = (e: Earning) => e.fee ?? 0;

export type TariffState = { id: string; checks: Check[]; eligible: boolean; enabled: boolean };
type Docs = Record<DocKind, DriverDoc>;
const emptyDocs = () => Object.fromEntries(DOC_KINDS.map(k => [k, emptyDoc(k)])) as Docs;

/** Ekranda ko'rinadigan qoidalar — server sozlamalari (GET /settings/public) bilan almashtiriladi */
export type DriverRules = { freeWaitSec: number; waitPerMin: number; noShowAfterSec: number; activity: { accept: number; decline: number; missed: number; cancel: number }; homeUsesPerDay: number; chainRadiusKm: number };
const DEFAULT_RULES: DriverRules = { freeWaitSec: 180, waitPerMin: 500, noShowAfterSec: 120, activity: { accept: 2, decline: -5, missed: -5, cancel: -10 }, homeUsesPerDay: 2, chainRadiusKm: 2 };
const rulesOf = (s: PublicSettings): DriverRules => ({
  freeWaitSec: s.freeWaitSec,
  waitPerMin: s.waitPerMin,
  noShowAfterSec: s.noShowAfterSec,
  activity: { accept: s.activityAcceptBonus, decline: -s.activityDeclinePenalty, missed: -s.activityMissPenalty, cancel: -s.activityCancelPenalty },
  homeUsesPerDay: s.homeUsesPerDay,
  chainRadiusKm: s.chainRadiusKm ?? 0,
});
/** Pullik kutish (ko'rsatish uchun; summani server safar boshlanganda hisoblaydi) */
export const waitFeeOf = (rules: DriverRules, arrivedAt: number | undefined, now: number) =>
  arrivedAt ? Math.ceil(Math.max(0, (now - arrivedAt) / 1000 - rules.freeWaitSec) / 60) * rules.waitPerMin : 0;

type Ctx = {
  ready: boolean;
  rules: DriverRules;
  docs: Docs;
  docsApproved: boolean;
  /** Hujjatni tekshiruvga yuboradi; server rad etsa xabar ko'rsatib false qaytaradi */
  submitDoc: (d: DriverDoc) => Promise<boolean>;
  tariffState: TariffState[];
  activeTariffs: string[];
  setTariffEnabled: (id: string, on: boolean) => boolean;
  /** Avtomobil almashsa texnik pasport qayta tekshiriladi */
  updateCar: (car: string, year: number) => void;
  acceptDeliveryTerms: () => Promise<boolean>;
  profile: DriverProfile | null;
  /** Xato bo'lsa rad etiladi: ekran server xabarini ko'rsatadi */
  register: (p: Omit<DriverProfile, 'id' | 'rating' | 'trips' | 'joinedAt'>, tariffIds: string[]) => Promise<void>;
  /** Serverdagi haydovchi hisobi va balansini yuklaydi */
  loadAccount: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  updateProfile: (p: Partial<DriverProfile>) => void;
  logout: () => void;
  online: boolean;
  setOnline: (v: boolean) => void;
  pos: LatLng;
  heading: number;
  gps: GpsState;
  retryGps: () => void;
  offer: Offer | null;
  accept: () => void;
  decline: () => void;
  trip: Trip | null;
  /** Zanjir buyurtma (hozircha server tomonidan berilmaydi) */
  next: OrderOffer | null;
  /** Yo'ldagi safarda manzilgacha qolgan masofa */
  leftKm: number | null;
  /** Joriy bosqich (mijozga / manzilga) uchun navigator rejasi: yo'l, burilishlar, ko'chalar */
  nav: NavPlan | null;
  arrived: () => void;
  startRide: () => void;
  finishRide: () => void;
  cancelTrip: () => void;
  noShow: () => void;
  cancelNext: () => void;
  summary: Summary | null;
  closeSummary: (passengerStars?: number) => void;
  earnings: Earning[];
  today: { sum: number; count: number; km: number };
  /** Bugun liniyada o'tkazilgan vaqt (ms) */
  onlineMsToday: (now: number) => number;
  rating: number;
  activity: number;
  balance: number;
  /** Shu summadan yuqori bo'lgandagina buyurtma olish mumkin */
  minBalance: number;
  payouts: Payout[];
  withdraw: (amount: number) => Promise<boolean>;
  zones: DemandZone[];
  /** «Uyga» rejimi: buyurtmalar tanlangan manzil tomonga */
  homeDest: Place | null;
  homeUsesLeft: number;
  setHomeDest: (p: Place | null) => Promise<boolean>;
  navApp: NavApp;
  setNavApp: (a: NavApp) => void;
  voice: boolean;
  setVoice: (v: boolean) => void;
  voiceLang: VoiceLang;
  setVoiceLang: (l: VoiceLang) => void;
  /** Faqat ishlab chiqish rejimida: GPS o'rniga mashina marshrut bo'ylab o'zi yuradi */
  autopilot: boolean;
  setAutopilot: (v: boolean) => void;
  /** Serverga jonli ulanish */
  live: boolean;
  lastRating: { stars: number; tip: number } | null;
  clearRating: () => void;
  /** Operator bloklagan bo'lsa — sababi (liniyaga chiqib bo'lmaydi) */
  blocked: { reason: string } | null;
  /** Operatordan kelgan so'nggi xabar (bosh ekranda yopilguncha turadi) */
  notice: { title: string; text: string; at: string } | null;
  dismissNotice: () => void;
  /** Bitta safardan YUMS komissiyasi (so'm) — so'nggi taklif va safarlardan */
  commission: number;
  sos: (at?: LatLng) => Promise<boolean>;
};

const DCtx = createContext<Ctx | null>(null);
export const useDriver = () => {
  const c = useContext(DCtx);
  if (!c) throw new Error('useDriver must be inside DriverProvider');
  return c;
};

const K = {
  local: 'yd:profileLocal', autopilot: 'yd:autopilot', online: 'yd:onlineLog', navApp: 'yd:navApp', voice: 'yd:voice', voiceLang: 'yd:voiceLang',
  /** Baholamay yopilgan safar yakunlari — server ularni «baholanmagan» deb qaytaraveradi */
  summaryDone: 'yd:summaryDone',
};
/** Faqat qurilmada saqlanadigan qismlar: jins, shahar, yetkazish shartlari roziligi */
type LocalProfile = { gender?: 'm' | 'f'; city?: string; deliveryTerms?: boolean };

const PING_MS = 3000;
/** Navigator yo'lini qayta so'rash oralig'i (yo'ldan chiqqanda) */
const REROUTE_GAP_MS = 8000;
const OFFER_POLL_MS = 5000;
const TRIP_POLL_MS = 7000;
const DEMAND_MS = 60000;
const APPROACH_KMH = 32;
const RIDE_KMH = 38;
const DEMO_SPEEDUP = 6;
const DEFAULT_COMMISSION = 1200;
const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const dayKey = () => new Date().toDateString();
const persist = (k: string, v: unknown) => { AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}); };

const PAY: Record<'CASH' | 'BALANCE' | 'CARD', PaymentId> = { CASH: 'cash', BALANCE: 'balance', CARD: 'card' };
/** Server shart kodlari → ilovadagi shart turlari */
const CHECK_ID: Record<dapi.TariffCheckServer['check'], Check['id']> = {
  DOCUMENTS: 'docs', CLASS: 'class', YEAR: 'year', SEATS: 'seats', RATING: 'rating', TRIPS: 'trips', ACTIVITY: 'activity', TERMS: 'terms',
};
const placeOf = (p: { id?: string; title: string; subtitle?: string; latitude: number; longitude: number }): Place =>
  ({ id: p.id, title: p.title, subtitle: p.subtitle, latitude: p.latitude, longitude: p.longitude });

function offerOf(v: OfferView): Offer {
  const pickup = placeOf(v.order.pickup);
  const destination = placeOf(v.order.destination);
  return {
    id: v.id,
    chain: v.chained,
    distanceKm: v.pickupDistanceKm,
    expiresAt: Date.now() + v.secondsLeft * 1000,
    total: Math.max(1, v.secondsLeft) * 1000,
    order: {
      id: v.order.id, number: v.order.orderNumber, passenger: { name: tr("Yo'lovchi"), rating: 5 },
      pickup, destination, route: { km: v.order.distanceKm, min: v.order.durationMin, coords: v.order.polyline ? decodePolyline(v.order.polyline) : curve(pickup, destination) },
      tariffId: v.order.tariffId, price: v.order.fare, earning: v.order.earning, payment: PAY[v.order.paymentMethod],
      options: v.order.options, comment: v.order.comment ?? '', createdAt: v.expiresAt,
    },
  };
}

function orderOf(o: DriverOrder): OrderOffer {
  return {
    id: o.id, number: o.orderNumber,
    passenger: { name: o.passenger.firstName, rating: o.passenger.rating, gender: nameGender(o.passenger.firstName) },
    pickup: placeOf(o.pickup), destination: placeOf(o.destination),
    route: { km: o.route.distanceKm, min: o.route.durationMin, coords: decodePolyline(o.route.polyline) },
    tariffId: o.tariffId, price: o.fare, earning: o.earning, payment: PAY[o.paymentMethod],
    options: o.options, comment: o.comment ?? '', createdAt: o.createdAt,
  };
}

const STAGE: Partial<Record<DriverOrder['status'], TripStage>> = { DRIVER_ASSIGNED: 'toPickup', DRIVER_ARRIVED: 'waiting', IN_PROGRESS: 'inride' };

function tripOf(o: DriverOrder, me: LatLng): Trip | null {
  const stage = STAGE[o.status];
  if (!stage) return null;
  const order = orderOf(o);
  return {
    order, stage,
    approach: o.approachPolyline ? decodePolyline(o.approachPolyline) : [me, order.pickup],
    arrivedAt: o.arrivedAt ? new Date(o.arrivedAt).getTime() : undefined,
    startedAt: o.startedAt ? new Date(o.startedAt).getTime() : undefined,
    waitFee: o.waitFee, cashToCollect: o.cashToCollect,
  };
}

const earningOf = (t: DriverTrip): Earning => ({
  id: t.id, at: t.at, price: t.price, waitFee: t.waitFee, fee: t.commission, tip: t.tip, stars: t.stars, passengerStars: t.passengerStars,
  km: t.distanceKm, min: t.durationMin, from: t.from, to: t.to, payment: PAY[t.paymentMethod], tariffId: t.tariffId,
  surge: t.surge > 1 ? t.surge : undefined, noShow: t.noShow,
});

export function DriverProvider({ children }: { children: ReactNode }) {
  const { lang, user, adoptUser, logout: endSession } = useStore();
  const [ready, setReady] = useState(false);
  const [rules, setRules] = useState<DriverRules>(DEFAULT_RULES);
  const [account, setAccount] = useState<DriverAccount | null>(null);
  const [local, setLocal] = useState<LocalProfile>({});
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balance, setBalance] = useState(0);
  const [minBalance, setMinBalance] = useState(0);
  const [online, setOnlineState] = useState(false);
  const [onlineLog, setOnlineLog] = useState<{ date: string; ms: number }>({ date: dayKey(), ms: 0 });
  const [onlineSince, setOnlineSince] = useState<number | null>(null);
  const [pos, setPos] = useState<LatLng>(DEFAULT_CENTER);
  const [heading, setHeading] = useState(0);
  const [gps, setGps] = useState<GpsState>('searching');
  const [gpsTry, setGpsTry] = useState(0);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  /** Zanjir: joriy safar tugagach boshlanadigan buyurtma */
  const [next, setNext] = useState<OrderOffer | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const summaryDone = useRef(new Set<string>());
  const [navApp, setNavAppState] = useState<NavApp>('yandex');
  const [voice, setVoiceState] = useState(true);
  const [voiceLang, setVoiceLangState] = useState<VoiceLang>('uz');
  const [autopilot, setAutopilotState] = useState(DEV && Platform.OS === 'web');
  const [live, setLive] = useState(false);
  const [lastRating, setLastRating] = useState<{ stars: number; tip: number } | null>(null);
  const [docs, setDocs] = useState<Docs>(emptyDocs);
  const [zones, setZones] = useState<DemandZone[]>([]);
  const [notice, setNotice] = useState<{ title: string; text: string; at: string } | null>(null);
  const [commission, setCommission] = useState(DEFAULT_COMMISSION);

  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const headingRef = useRef(heading);
  useEffect(() => { headingRef.current = heading; }, [heading]);
  const tripRef = useRef(trip);
  useEffect(() => { tripRef.current = trip; }, [trip]);
  const offerRef = useRef(offer);
  useEffect(() => { offerRef.current = offer; }, [offer]);
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);
  /** Taklif qabul qila oladimi: bo'sh yoki safar oxirida (zanjir uchun), keyingi buyurtmasi yo'q */
  const canTakeOffer = useCallback(() => !tripRef.current || (tripRef.current.stage === 'inride' && !nextRef.current), []);
  const sinceRef = useRef(onlineSince);
  useEffect(() => { sinceRef.current = onlineSince; }, [onlineSince]);
  const speedRef = useRef<number | undefined>(undefined);
  const autopilotOn = DEV && autopilot;

  /* ---------- Qurilmadagi sozlamalar ---------- */
  useEffect(() => {
    publicSettings().then(s => setRules(rulesOf(s))).catch(() => {});
    (async () => {
      try {
        const e = Object.fromEntries((await AsyncStorage.multiGet(Object.values(K))).map(([k, v]) => [k, v ? JSON.parse(v) : undefined]));
        if (e[K.local]) setLocal(e[K.local]);
        if (Array.isArray(e[K.summaryDone])) summaryDone.current = new Set(e[K.summaryDone]);
        if (typeof e[K.autopilot] === 'boolean') setAutopilotState(DEV && e[K.autopilot]);
        if (e[K.online]?.date === dayKey()) setOnlineLog(e[K.online]);
        if (e[K.navApp]) setNavAppState(e[K.navApp]);
        if (typeof e[K.voice] === 'boolean') { setVoiceState(e[K.voice]); setVoiceEnabled(e[K.voice]); }
        const vl: VoiceLang = isLang(e[K.voiceLang]) ? e[K.voiceLang] : getLang();
        setVoiceLangState(vl);
        setVoiceLang(vl);
      } catch {
        // xotira mavjud emas
      }
      setReady(true);
    })();
  }, []);

  // foydalanuvchi ilova tilini almashtirsa — ovozli yo'riqnoma ham shu tilda gapiradi
  useEffect(() => onLangChange((l, byUser) => {
    if (!byUser) return;
    setVoiceLangState(l);
    setVoiceLang(l);
    persist(K.voiceLang, l);
  }), []);

  /* ---------- Profil: serverdagi hisob + qurilmadagi qo'shimchalar ---------- */
  const profile = useMemo<DriverProfile | null>(() => {
    if (!account) return null;
    const v = account.vehicle;
    return {
      id: account.id, name: account.fullName, phone: account.phone, rating: account.rating, trips: account.trips,
      car: v ? `${v.brand} ${v.model}` : '', color: v?.color ?? '', plate: v?.plate ?? '', year: v?.year,
      tariffs: v?.tariffIds ?? [], city: account.city ?? local.city ?? 'Toshkent', joinedAt: user?.joinedAt ?? new Date().toISOString(),
      gender: account.gender ? (account.gender === 'F' ? 'f' : 'm') : local.gender ?? nameGender(account.fullName),
      photo: user?.avatar, deliveryTerms: account.deliveryTermsAccepted,
    };
  }, [account, local, user?.joinedAt, user?.avatar]);

  const refreshWallet = useCallback(async () => {
    const wallet = await dapi.loadDriverWallet();
    setBalance(wallet.balance);
    setMinBalance(wallet.minBalance);
  }, []);

  const refreshDocs = useCallback(async () => {
    const list = await dapi.listDocuments();
    const next = emptyDocs();
    for (const d of list) { const doc = fromServerDoc(d); next[doc.kind] = doc; }
    setDocs(next);
  }, []);

  const refreshEarnings = useCallback(async () => {
    const list = (await dapi.driverTrips()).map(earningOf);
    setEarnings(list);
    const last = list.find(e => !e.noShow && e.fee);
    if (last?.fee) setCommission(last.fee);
  }, []);

  const loadAccount = useCallback(async () => {
    const acc = await dapi.loadDriverAccount();
    setAccount(acc);
    if (!acc) return;
    if (acc.online) { setOnlineState(true); setOnlineSince(s => s ?? Date.now()); }
    await Promise.all([
      refreshWallet().catch(() => {}),
      refreshDocs().catch(() => {}),
      refreshEarnings().catch(() => {}),
      dapi.listPayouts().then(ps => setPayouts(ps.map(p => ({ id: p.id, at: p.createdAt, amount: p.amount, status: p.status })))).catch(() => {}),
    ]);
  }, [refreshWallet, refreshDocs, refreshEarnings]);

  /* ---------- Faol safar va taklifni serverdan tiklash ---------- */
  const applyOrder = useCallback((o: DriverOrder | null) => {
    if (!o) { setTrip(t => (t ? null : t)); return; }
    if (o.status === 'COMPLETED') {
      setTrip(null);
      // Yo'lovchi hali baholanmagan — hisob-kitob oynasi (haydovchi baholamay yopgan bo'lsa, qayta chiqmaydi)
      if (o.passengerRating === undefined && !summaryDone.current.has(o.id)) {
        setSummary(s => s ?? {
          orderId: o.id, passenger: o.passenger.firstName,
          earning: { id: o.id, at: o.completedAt ?? new Date().toISOString(), price: o.fare - o.waitFee, waitFee: o.waitFee, fee: o.fare - o.earning, tip: 0, km: o.route.distanceKm, min: o.route.durationMin, from: o.pickup.title, to: o.destination.title, payment: PAY[o.paymentMethod], tariffId: o.tariffId },
        });
      }
      return;
    }
    const next = tripOf(o, posRef.current);
    setTrip(next);
    if (next && o.fare > o.earning) setCommission(o.fare - o.earning);
  }, []);

  const syncState = useCallback(async () => {
    try {
      const [active, upcoming] = await Promise.all([dapi.activeDriverOrder(), dapi.nextDriverOrder()]);
      applyOrder(active);
      setNext(upcoming ? orderOf(upcoming) : null);
      if (canTakeOffer()) {
        const v = await dapi.currentOffer();
        setOffer(cur => (v ? (cur?.id === v.id ? cur : offerOf(v)) : null));
      }
    } catch {
      // tarmoq yo'q — keyingi urinishda
    }
  }, [applyOrder, canTakeOffer]);

  const accountOwner = user?.id;
  useEffect(() => {
    if (!accountOwner) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- server javobi kelgach yangilanadi
    loadAccount().then(() => syncState()).catch(() => {});
  }, [accountOwner, loadAccount, syncState]);

  /* ---------- Hujjatlar ---------- */
  const docsApproved = DOC_KINDS.every(k => docs[k].status === 'approved') && (account?.documentsBlocking.length ?? 0) === 0;

  const submitDoc = useCallback(async (d: DriverDoc) => {
    try {
      const saved = fromServerDoc(await dapi.submitDocument(serverKind(d.kind), toServerDoc(d)));
      setDocs(cur => ({ ...cur, [d.kind]: saved }));
      loadAccount().catch(() => {});
      return true;
    } catch (error) {
      toast(errorText(error), 'alert-circle');
      return false;
    }
  }, [loadAccount]);

  // Avvalgi versiya jinsi, shahar va yetkazish qoidalarini telefonda saqlagan — bir marta serverga o'tkazamiz
  useEffect(() => {
    if (!account || (!local.gender && !local.city && !local.deliveryTerms)) return;
    const personal = {
      gender: !account.gender && local.gender ? (local.gender === 'f' ? 'F' as const : 'M' as const) : undefined,
      city: !account.city ? local.city : undefined,
    };
    const jobs: Promise<unknown>[] = [];
    if (personal.gender || personal.city) jobs.push(dapi.updateDriverPersonal(personal));
    if (local.deliveryTerms && !account.deliveryTermsAccepted) jobs.push(dapi.acceptDeliveryTerms());
    Promise.all(jobs)
      .then(() => { setLocal({}); persist(K.local, {}); return jobs.length ? loadAccount() : undefined; })
      .catch(() => {});
  }, [account, local, loadAccount]);

  /* ---------- Tariflar: shartlar bajarilganda yoqiladi ---------- */
  const rating = account?.rating ?? 5;
  const activity = account?.activity ?? 100;
  const serverTariffs = account?.tariffs;
  const tariffState = useMemo<TariffState[]>(() => TARIFFS.map(t => {
    void lang;
    const rows = tariffChecks(t.id, profile?.car, profile?.year, { docsApproved, rating, trips: profile?.trips ?? 0, activity, deliveryTerms: !!profile?.deliveryTerms });
    const server = serverTariffs?.find(s => s.tariffId === t.id);
    if (!server) {
      const ok = rows.every(c => c.ok);
      return { id: t.id, checks: rows, eligible: ok, enabled: ok && !!profile?.tariffs.includes(t.id) };
    }
    // Shartlar serverda tekshiriladi: matnlar ilovada, natija («bajarildimi») serverdan
    const checks = rows.map(c => {
      const s = server.checks.find(x => CHECK_ID[x.check] === c.id);
      return s ? { ...c, ok: s.ok } : c;
    });
    return { id: t.id, checks, eligible: server.eligible, enabled: server.eligible && server.enabled };
  }), [profile, docsApproved, rating, activity, lang, serverTariffs]);
  const activeKey = tariffState.filter(t => t.enabled).map(t => t.id).join(',');
  const activeTariffs = useMemo(() => (activeKey ? activeKey.split(',') : []), [activeKey]);

  /* ---------- Joylashuv: GPS (ishlab chiqishda — avtopilot) ---------- */
  const hasProfile = !!account;
  useEffect(() => {
    if (autopilotOn || !hasProfile) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      setGps('searching');
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm.status !== 'granted') { setGps('denied'); return; }
        const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1500, distanceInterval: 5 }, loc => {
          const p = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setGps('ok');
          speedRef.current = loc.coords.speed != null && loc.coords.speed >= 0 ? loc.coords.speed * 3.6 : undefined;
          setHeading(h => (loc.coords.heading != null && loc.coords.heading >= 0 && (loc.coords.speed ?? 0) > 1 ? loc.coords.heading : distanceKm(posRef.current, p) > 0.008 ? bearing(posRef.current, p) : h));
          setPos(p);
        });
        if (cancelled) sub.remove(); else stop = () => sub.remove();
      } catch {
        if (!cancelled) setGps('denied');
      }
    })();
    return () => { cancelled = true; stop?.(); };
  }, [autopilotOn, hasProfile, gpsTry]);
  const gpsState: GpsState = autopilotOn ? 'demo' : gps;

  /* ---------- Navigator: joriy bosqich uchun yo'l va burilishlar ---------- */
  // reja bosqich kaliti bilan saqlanadi — bosqich almashganda eskisi o'z-o'zidan amal qilmaydi
  const legTarget = trip ? (trip.stage === 'toPickup' ? trip.order.pickup : trip.stage === 'inride' ? trip.order.destination : null) : null;
  const legKey = trip && legTarget ? `${trip.order.id}:${trip.stage}` : '';
  const [navState, setNavState] = useState<{ key: string; plan: NavPlan } | null>(null);
  const nav = navState && navState.key === legKey ? navState.plan : null;
  const legRef = useRef({ key: legKey, target: legTarget });
  useEffect(() => { legRef.current = { key: legKey, target: legTarget }; }, [legKey, legTarget]);
  const navReq = useRef({ busy: false, at: 0, off: 0 });
  const fetchNav = useCallback((reroute: boolean) => {
    const { key, target } = legRef.current;
    const r = navReq.current;
    if (!key || !target || r.busy) return;
    r.busy = true;
    r.at = Date.now();
    r.off = 0;
    dapi.navigationRoute(posRef.current, target)
      .then(res => {
        if (legRef.current.key !== key || res.polyline === '') return;
        const plan = planOf(res, target);
        if (plan.coords.length < 2) return;
        setNavState({ key, plan });
        if (reroute && plan.steps.length) say('rerouted');
      })
      // eski server yoki aloqa yo'q — buyurtmadagi yo'l chizig'i bilan davom etamiz
      .catch(() => {})
      .finally(() => { r.busy = false; });
  }, []);
  useEffect(() => {
    if (legKey) fetchNav(false);
  }, [legKey, fetchNav]);
  // yo'ldan chiqish: 3 ketma-ket nuqta 45 m dan uzoqda yoki bir marta 120 m dan uzoqda — yangi yo'l.
  // So'rovlar orasida kamida 8 s; mashina to'xtab qolsa ham (yangi nuqta kelmasa) shu vaqt o'tgach so'raladi
  useEffect(() => {
    if (!nav) return;
    const r = navReq.current;
    const { offM } = progressOf(nav, pos);
    r.off = offM > OFF_ROUTE_M ? r.off + 1 : 0;
    if (r.off < 3 && offM <= 120) return;
    const wait = REROUTE_GAP_MS - (Date.now() - r.at);
    if (wait <= 0) { fetchNav(true); return; }
    const t = setTimeout(() => fetchNav(true), wait);
    return () => clearTimeout(t);
  }, [pos, nav, fetchNav]);

  // Avtopilot (faqat ishlab chiqishda): navigator yo'li (bo'lmasa buyurtmadagi yo'l) bo'ylab harakat
  const navCoords = nav?.coords;
  useEffect(() => {
    if (!autopilotOn || !trip || trip.stage === 'waiting') return;
    const path = navCoords ?? (trip.stage === 'toPickup' ? trip.approach : trip.order.route.coords);
    if (path.length < 2) return;
    const kmh = (trip.stage === 'toPickup' ? APPROACH_KMH : RIDE_KMH) * DEMO_SPEEDUP;
    const total = pathLength(path);
    const startT = Math.max(0, 1 - nextManeuver(path, posRef.current).leftKm / Math.max(0.05, total));
    const t0 = Date.now();
    const iv = setInterval(() => {
      const t = Math.min(1, startT + ((Date.now() - t0) / 3600000) * kmh / Math.max(0.05, total));
      const p = pointAt(path, t);
      const ahead = pointAt(path, Math.min(1, t + 0.02));
      if (distanceKm(p, ahead) > 0.002) setHeading(bearing(p, ahead));
      setPos(p);
      if (t >= 1) clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, [autopilotOn, trip, navCoords]);

  const leftKm = useMemo(() => {
    if (trip?.stage !== 'inride') return null;
    return nav ? Math.max(0, nav.km - progressOf(nav, pos).along) : nextManeuver(trip.order.route.coords, pos).leftKm;
  }, [trip, pos, nav]);

  // Liniyada yoki safarda joylashuv serverga yuboriladi (u yo'lovchining xaritasida mashinani yurgizadi)
  const sending = online || !!trip;
  useEffect(() => {
    if (!sending || !hasProfile) return;
    const ping = () => {
      dapi.reportLocation(posRef.current, headingRef.current, speedRef.current)
        .then(r => { if (!r.online && sinceRef.current != null && !tripRef.current) { setOnlineState(false); setOnlineSince(null); } })
        .catch(() => {});
    };
    ping();
    const iv = setInterval(ping, PING_MS);
    return () => clearInterval(iv);
  }, [sending, hasProfile]);

  // Liniyada yoki safarda ekran o'chmaydi
  useEffect(() => {
    if (!sending) return;
    activateKeepAwakeAsync('yums-driver').catch(() => {});
    return () => { deactivateKeepAwake('yums-driver').catch(() => {}); };
  }, [sending]);

  /* ---------- Jonli aloqa: takliflar va safar o'zgarishlari ---------- */
  useEffect(() => {
    if (!accountOwner || !hasProfile) return;
    startRealtime();
    registerThisDevice().catch(() => {});
    const offs = [
      onRealtimeReady(() => { setLive(true); syncState().catch(() => {}); }),
      onRealtime<OfferView>('offer.new', v => {
        if (!canTakeOffer()) return;
        notifyOffer();
        setOffer(offerOf(v));
      }),
      onRealtime<{ offerId: string; orderId: string; reason: string }>('offer.closed', e => {
        const cur = offerRef.current;
        if (cur?.id !== e.offerId) return;
        setOffer(null);
        if (e.reason === 'EXPIRED') {
          say('missed');
          toast(tr("Buyurtma o'tkazib yuborildi · faollik {missed}", { missed: rules.activity.missed }), 'time-outline');
          loadAccount().catch(() => {});
        }
      }),
      onRealtime<{ orderId: string; cancelledBy: string }>('order.cancelled', e => {
        if (nextRef.current?.id === e.orderId) {
          haptic.error();
          toast(tr("Keyingi buyurtmani yo'lovchi bekor qildi"), 'close-circle');
          setNext(null);
          return;
        }
        if (tripRef.current?.order.id !== e.orderId) return;
        haptic.error();
        say('passengerCancelled', true);
        toast(e.cancelledBy === 'ADMIN' ? tr('Buyurtma operator tomonidan bekor qilindi') : tr("Yo'lovchi buyurtmani bekor qildi"), 'close-circle');
        setTrip(null);
      }),
      // Joriy safar tugadi — zanjirdagi buyurtma endi asosiy safar
      onRealtime<{ orderId: string }>('order.next_started', () => {
        haptic.success();
        syncState().catch(() => {});
        toast(tr("Keyingi buyurtma boshlandi — mijozga yo'l oling"), 'navigate');
      }),
      onRealtime<{ reason: string }>('driver.offline', e => {
        haptic.error();
        setOnlineState(false);
        setOnlineSince(null);
        setOffer(null);
        toast(e.reason === 'DEBT_LIMIT' ? tr("Balans minimal miqdordan kam — liniyadan chiqdingiz. Balansni to'ldiring") : tr('Operator sizni liniyadan chiqardi'), 'alert-circle');
        loadAccount().catch(() => {});
      }),
      onRealtime<{ kind: dapi.DocKindServer; status: string; note: string | null }>('driver.document', e => {
        refreshDocs().catch(() => {});
        loadAccount().catch(() => {});
        const short = tr(DOC_META[fromServerDoc({ kind: e.kind, number: '', frontImage: '', status: 'REVIEW', submittedAt: '' }).kind].short);
        if (e.status === 'APPROVED') toast(tr('{short} tasdiqlandi', { short }), 'checkmark-circle');
        if (e.status === 'REJECTED') { haptic.error(); toast(tr('{short} rad etildi: {note}', { short, note: e.note ?? '' }), 'close-circle'); }
      }),
      onRealtime<{ title: string; text: string }>('driver.notice', e => {
        haptic.success();
        setNotice({ title: e.title, text: e.text, at: new Date().toISOString() });
        toast(e.title || e.text, 'megaphone');
      }),
      onRealtime<{ orderId: string; name: string; text: string }>('order.message', m => {
        if (tripRef.current?.order.id !== m.orderId) return;
        haptic.success();
        if (Platform.OS !== 'web') Vibration.vibrate(200);
        toast(`${m.name}: ${m.text}`, 'chatbubble-ellipses');
      }),
      onRealtime<{ orderId: string; stars: number; tip: number }>('order.rated', e => {
        setLastRating({ stars: e.stars, tip: e.tip });
        refreshEarnings().catch(() => {});
        if (e.tip > 0) refreshWallet().catch(() => {});
      }),
    ];
    return () => { offs.forEach(off => off()); setLive(false); };
  }, [accountOwner, hasProfile, syncState, loadAccount, refreshDocs, refreshEarnings, refreshWallet, rules.activity.missed, canTakeOffer]);

  // Socket — signal; liniyada taklif, safarda holat REST orqali ham tekshirib turiladi
  useEffect(() => {
    if (!hasProfile || (!online && !trip)) return;
    const iv = setInterval(() => { syncState().catch(() => {}); }, trip ? TRIP_POLL_MS : OFFER_POLL_MS);
    return () => clearInterval(iv);
  }, [hasProfile, online, trip, syncState]);

  // Taklif muddati tugadi — server o'zi yopadi, ekrandan olib tashlaymiz
  useEffect(() => {
    if (!offer) return;
    const t = setTimeout(() => setOffer(o => (o?.id === offer.id ? null : o)), Math.max(0, offer.expiresAt - Date.now()) + 1500);
    return () => clearTimeout(t);
  }, [offer]);

  /* ---------- Talab xaritasi ---------- */
  useEffect(() => {
    if (!hasProfile) return;
    const load = () => dapi.demandAround(posRef.current).then(c => setZones(toZones(c))).catch(() => {});
    load();
    const iv = setInterval(load, DEMAND_MS);
    return () => clearInterval(iv);
  }, [hasProfile]);

  /* ---------- Amallar ---------- */
  const fail = (error: unknown) => {
    haptic.error();
    if (error instanceof ApiError && error.code === 'TOO_FAR_FROM_PICKUP') {
      toast(tr("Siz olish nuqtasidan hali {m} m uzoqdasiz", { m: Number(error.details?.distanceM ?? 0) }), 'navigate');
      return;
    }
    toast(errorText(error), 'alert-circle');
  };

  const accept = useCallback(() => {
    const o = offerRef.current;
    if (!o) return;
    haptic.success();
    setOffer(null);
    dapi.acceptOffer(o.id)
      .then(order => {
        if (order.chained) {
          setNext(orderOf(order));
          toast(tr('Keyingi buyurtma qabul qilindi — joriy safardan keyin boshlanadi'), 'link');
        } else applyOrder(order);
        say('accepted');
        loadAccount().catch(() => {});
      })
      .catch(error => {
        if (error instanceof ApiError && error.code === 'OFFER_GONE') { toast(tr("Buyurtma boshqa haydovchiga o'tdi"), 'alert-circle'); return; }
        fail(error);
      });
  }, [applyOrder, loadAccount]);

  const decline = useCallback(() => {
    const o = offerRef.current;
    if (!o) return;
    haptic.tap();
    setOffer(null);
    dapi.declineOffer(o.id).catch(() => {});
    toast(tr('Buyurtma rad etildi · faollik {decline}', { decline: rules.activity.decline }), 'remove-circle-outline');
    setTimeout(() => loadAccount().catch(() => {}), 800);
  }, [loadAccount, rules.activity.decline]);

  const arrived = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    if (autopilotOn) setPos(t.order.pickup);
    const send = () => dapi.markArrived(t.order.id).then(o => { haptic.success(); applyOrder(o); say('arrivedSent'); });
    // avtopilotda nuqta endigina o'zgardi — avval uni serverga yetkazamiz
    (autopilotOn ? dapi.reportLocation(t.order.pickup, headingRef.current).then(send) : send()).catch(fail);
  }, [applyOrder, autopilotOn]);

  const startRide = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    haptic.tap();
    dapi.startTrip(t.order.id).then(o => { applyOrder(o); say('rideStart'); }).catch(fail);
  }, [applyOrder]);

  const finishRide = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    dapi.completeTrip(t.order.id)
      .then(o => {
        haptic.success();
        if (autopilotOn) setPos(t.order.destination);
        if (o.paymentMethod === 'CASH' && t.order.payment !== 'cash') toast(tr("Karta to'lovi o'tmadi — yo'lovchidan naqd oling"), 'cash');
        say(o.paymentMethod === 'CASH' ? 'finishCash' : 'finishCard');
        setTrip(null);
        setSummary({
          orderId: o.id, passenger: o.passenger.firstName,
          earning: { id: o.id, at: o.completedAt ?? new Date().toISOString(), price: o.fare - o.waitFee, waitFee: o.waitFee, fee: o.fare - o.earning, tip: 0, km: o.route.distanceKm, min: o.route.durationMin, from: o.pickup.title, to: o.destination.title, payment: PAY[o.paymentMethod], tariffId: o.tariffId },
        });
        refreshWallet().catch(() => {});
        refreshEarnings().catch(() => {});
        loadAccount().catch(() => {});
        // zanjirdagi buyurtma serverda boshlanadi — uni darhol olamiz
        if (nextRef.current) syncState().catch(() => {});
      })
      .catch(fail);
  }, [autopilotOn, refreshWallet, refreshEarnings, loadAccount, syncState]);

  /** Keyingi buyurtmadan voz kechish: u boshqa haydovchiga qaytadi, faollik kamayadi */
  const cancelNext = useCallback(() => {
    const n = nextRef.current;
    if (!n) return;
    dapi.dropOrder(n.id)
      .then(() => {
        setNext(null);
        toast(tr('Keyingi buyurtmadan voz kechildi · faollik {cancel}', { cancel: rules.activity.cancel }), 'unlink');
        loadAccount().catch(() => {});
      })
      .catch(fail);
  }, [loadAccount, rules.activity.cancel]);

  const closeSummary = useCallback((passengerStars?: number) => {
    setSummary(s => {
      if (s && passengerStars) dapi.ratePassenger(s.orderId, passengerStars).then(() => refreshEarnings()).catch(() => {});
      if (s) {
        summaryDone.current.add(s.orderId);
        persist(K.summaryDone, [...summaryDone.current].slice(-20));
      }
      return null;
    });
  }, [refreshEarnings]);

  const cancelTrip = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    dapi.dropOrder(t.order.id)
      .then(() => {
        setTrip(null);
        toast(tr('Buyurtma bekor qilindi · faollik {cancel}', { cancel: rules.activity.cancel }), 'close-circle-outline');
        loadAccount().catch(() => {});
      })
      .catch(fail);
  }, [loadAccount, rules.activity.cancel]);

  // Mijoz chiqmadi: faollik kamaymaydi, buyurtma yopiladi
  const noShow = useCallback(() => {
    const t = tripRef.current;
    if (!t || t.stage !== 'waiting') return;
    dapi.closeNoShow(t.order.id)
      .then(() => {
        setTrip(null);
        say('noShow');
        toast(tr('Mijoz chiqmadi · buyurtma yopildi'), 'person-remove');
        refreshEarnings().catch(() => {});
      })
      .catch(fail);
  }, [refreshEarnings]);

  const setOnline = useCallback((v: boolean) => {
    haptic.tap();
    if (v && !activeTariffs.length) { toast(tr('Kamida bitta tarifni yoqing'), 'car'); return; }
    dapi.setDriverOnline(v)
      .then(() => {
        const now = Date.now();
        setOnlineState(v);
        if (v) {
          setOnlineSince(now);
          say('online');
          dapi.reportLocation(posRef.current, headingRef.current).catch(() => {});
        } else {
          setOffer(null);
          say('offline');
          const since = sinceRef.current;
          if (since) setOnlineLog(l => { const n = { date: dayKey(), ms: (l.date === dayKey() ? l.ms : 0) + (now - since) }; persist(K.online, n); return n; });
          setOnlineSince(null);
        }
      })
      .catch(error => {
        if (error instanceof ApiError && error.code === 'DOCUMENTS_REQUIRED') { toast(tr('Avval hujjatlaringiz tasdiqlanishi kerak'), 'document-text'); return; }
        if (error instanceof ApiError && error.code === 'DRIVER_DEBT_LIMIT') { toast(tr("Balans minimal miqdordan kam — avval balansni to'ldiring"), 'wallet'); return; }
        fail(error);
      });
  }, [activeTariffs.length]);

  const onlineMsToday = useCallback((now: number) => (onlineLog.date === dayKey() ? onlineLog.ms : 0) + (onlineSince ? Math.max(0, now - onlineSince) : 0), [onlineLog, onlineSince]);

  const today = useMemo(() => {
    const d = dayKey();
    const list = earnings.filter(e => new Date(e.at).toDateString() === d);
    return { sum: list.reduce((s, e) => s + e.price + (e.waitFee ?? 0) + e.tip - feeOf(e), 0), count: list.filter(e => !e.noShow).length, km: list.reduce((s, e) => s + e.km, 0) };
  }, [earnings]);

  const withdraw = async (amount: number) => {
    try {
      const payout = await dapi.requestPayout(amount);
      setPayouts(ps => [{ id: payout.id, at: payout.createdAt, amount: payout.amount, status: 'PENDING' }, ...ps]);
      await refreshWallet();
      return true;
    } catch (error) {
      toast(errorText(error), 'alert-circle');
      return false;
    }
  };

  const setHomeDest = async (p: Place | null) => {
    try {
      setAccount(p ? await dapi.setHome(p) : await dapi.clearHome());
      return true;
    } catch (error) {
      toast(errorText(error), 'alert-circle');
      return false;
    }
  };

  const setTariffEnabled = (id: string, on: boolean) => {
    const st = tariffState.find(t => t.id === id);
    if (!profile || !st || (on && !st.eligible)) return false;
    if (!on && activeTariffs.length === 1 && activeTariffs[0] === id) { toast(tr("Kamida bitta tarif yoqilgan bo'lishi kerak"), 'alert-circle'); return false; }
    const tariffs = on ? [...new Set([...profile.tariffs, id])] : profile.tariffs.filter(x => x !== id);
    dapi.setDriverTariffs(tariffs).then(setAccount).catch(fail);
    return true;
  };

  const updateCar = (car: string, year: number) => {
    if (!profile || (profile.car === car && profile.year === year)) return;
    const [brand, ...model] = car.split(' ');
    dapi.updateVehicle({ brand, model: model.join(' ') || brand, year })
      .then(acc => {
        setAccount(acc);
        refreshDocs().catch(() => {});
        if (acc.documentsBlocking.includes('TECH_PASSPORT')) {
          setOnlineState(acc.online);
          toast(tr('Yangi avtomobil uchun texnik pasportni yuklang'), 'document-text');
        }
      })
      .catch(fail);
  };

  const sos = async (at?: LatLng) => {
    const id = tripRef.current?.order.id;
    if (!id) return false;
    try { await dapi.driverSos(id, at ?? posRef.current); return true; } catch (error) { fail(error); return false; }
  };


  const value: Ctx = {
    ready, rules, profile,
    docs, docsApproved, submitDoc, tariffState, activeTariffs, setTariffEnabled, updateCar,
    acceptDeliveryTerms: () => dapi.acceptDeliveryTerms().then(acc => { setAccount(acc); return true; }).catch(error => { fail(error); return false; }),
    register: async (p, tariffIds) => {
      const [brand, ...model] = p.car.split(' ');
      await dapi.registerDriver({ fullName: p.name, gender: p.gender ? (p.gender === 'f' ? 'F' : 'M') : undefined, city: p.city, brand, model: model.join(' ') || brand, color: p.color, plate: p.plate, year: p.year, tariffIds });
      await loadAccount();
    },
    loadAccount, refreshWallet,
    updateProfile: p => {
      if (p.gender || p.city) {
        dapi.updateDriverPersonal({ gender: p.gender ? (p.gender === 'f' ? 'F' : 'M') : undefined, city: p.city }).then(setAccount).catch(fail);
      }
      if ('photo' in p && user) {
        // rasm darhol almashadi; server javobi kelgach undagi qiymat olinadi, xato bo'lsa eski rasm qaytadi
        const prev = user.avatar;
        adoptUser({ ...user, avatar: p.photo });
        saveUserProfile({ avatar: p.photo ?? null })
          .then(adoptUser)
          .catch(error => {
            adoptUser({ ...user, avatar: prev });
            fail(error);
          });
      }
      if (p.name && p.name !== profile?.name) saveUserProfile({ fullName: p.name }).then(() => loadAccount()).catch(fail);
      if (p.color && p.color !== profile?.color) dapi.updateVehicle({ color: p.color }).then(setAccount).catch(fail);
      if (p.plate && p.plate !== profile?.plate) dapi.updateVehicle({ plate: p.plate }).then(acc => { setAccount(acc); refreshDocs().catch(() => {}); }).catch(fail);
    },
    logout: () => {
      if (online) dapi.setDriverOnline(false).catch(() => {});
      setOffer(null); setTrip(null); setSummary(null); setAccount(null); setDocs(emptyDocs()); setNotice(null);
      setBalance(0); setMinBalance(0); setEarnings([]); setPayouts([]); setOnlineState(false); setOnlineSince(null);
      stopRealtime();
      endSession();
    },
    online, setOnline, pos, heading, gps: gpsState, retryGps: () => setGpsTry(n => n + 1),
    offer, accept, decline, trip, next, leftKm, arrived, startRide, finishRide, cancelTrip, noShow, cancelNext, summary, closeSummary,
    earnings, today, onlineMsToday, rating, activity, balance, minBalance, payouts, withdraw, zones,
    homeDest: account?.home ? { title: account.home.title, latitude: account.home.latitude, longitude: account.home.longitude } : null,
    homeUsesLeft: account?.homeUsesLeft ?? rules.homeUsesPerDay,
    setHomeDest,
    navApp, setNavApp: a => { setNavAppState(a); persist(K.navApp, a); },
    voice, setVoice: v => { setVoiceState(v); setVoiceEnabled(v); persist(K.voice, v); },
    voiceLang, setVoiceLang: l => { setVoiceLangState(l); setVoiceLang(l); persist(K.voiceLang, l); },
    autopilot: autopilotOn, setAutopilot: v => { setAutopilotState(DEV && v); persist(K.autopilot, DEV && v); },
    live, lastRating, clearRating: () => setLastRating(null), nav,
    blocked: account?.status === 'BLOCKED' ? { reason: tr('Hisobingiz operator tomonidan bloklangan') } : null,
    notice, dismissNotice: () => setNotice(null), commission, sos,
  };
  return <DCtx.Provider value={value}>{children}</DCtx.Provider>;
}

/** Yangi taklif: tebranish, ovoz va haptik */
function notifyOffer() {
  haptic.success();
  if (Platform.OS !== 'web') Vibration.vibrate([0, 350, 180, 350]);
  say('newOrder', true);
}
