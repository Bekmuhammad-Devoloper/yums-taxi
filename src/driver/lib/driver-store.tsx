// YUMS Driver holati: profil, liniya, buyurtma takliflari, faol va zanjir safar, faollik, balans va daromad.
// Dispetcher serveri ulangan bo'lsa — haqiqiy yo'lovchi buyurtmalari, aks holda demo buyurtmalar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Vibration } from 'react-native';

import { toast } from '@/components/toast';
import { DEFAULT_CENTER, PLACES, TARIFFS, type Driver, type LatLng, type Place } from '@/lib/data';
import { DispatchClient, DISPATCH_URL, type ConnState, type OrderOffer } from '@/lib/dispatch';
import { bearing, distanceKm, fetchRoute, nearbyPoint, pathLength, pointAt, priceFor } from '@/lib/geo';
import { haptic } from '@/lib/store';

import { demandSlot, demandZones, surgeAt, type DemandZone } from './demand';
import { nextManeuver } from './nav';
import { say, setVoiceEnabled, spokenSom } from './voice';

export type DriverProfile = Driver & { tariffs: string[]; city: string; joinedAt: string };

/** chain — joriy safardan keyin bajariladigan (zanjir) buyurtma taklifi */
export type Offer = { order: OrderOffer; distanceKm: number; expiresAt: number; total: number; chain?: boolean };

/** Safar bosqichlari: mijozga borish → kutish → yo'lda */
export type TripStage = 'toPickup' | 'waiting' | 'inride';
export type Trip = { order: OrderOffer; stage: TripStage; approach: LatLng[]; arrivedAt?: number; startedAt?: number; waitFee: number };

export type Earning = {
  id: string; at: string; price: number; waitFee?: number; fee?: number; tip: number; stars?: number; passengerStars?: number;
  km: number; min: number; from: string; to: string; payment: OrderOffer['payment']; tariffId?: string; surge?: number;
  /** mijoz chiqmadi — kutish uchun kompensatsiya */
  noShow?: boolean;
};
export type Payout = { id: string; at: string; amount: number; fee: number };
export type NavApp = 'yandex' | 'google';
export type GpsState = 'demo' | 'searching' | 'ok' | 'denied';

/** Safar tugagach ko'rsatiladigan hisob-kitob */
export type Summary = { earning: Earning; passenger: string };

export const COMMISSION = 0.1;
export const FREE_WAIT_SEC = 180;
export const WAIT_PER_MIN = 500;
/** Pullik kutish boshlangandan keyin «Mijoz chiqmadi» tugmasi chiqadi */
export const NO_SHOW_AFTER_SEC = FREE_WAIT_SEC + 120;
export const CHAIN_KM = 2;
export const HOME_USES_PER_DAY = 2;
export const ACTIVITY = { accept: 2, decline: -5, missed: -5, cancel: -10 };
export const feeOf = (e: Earning) => e.fee ?? Math.round((e.price + (e.waitFee ?? 0)) * COMMISSION);
export const waitFeeOf = (arrivedAt: number | undefined, now: number) =>
  arrivedAt ? Math.ceil(Math.max(0, (now - arrivedAt) / 1000 - FREE_WAIT_SEC) / 60) * WAIT_PER_MIN : 0;

type Ctx = {
  ready: boolean;
  profile: DriverProfile | null;
  register: (p: Omit<DriverProfile, 'id' | 'rating' | 'trips' | 'joinedAt'>) => void;
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
  /** Zanjirdagi keyingi buyurtma (joriy safar tugagach boshlanadi) */
  next: OrderOffer | null;
  /** Yo'ldagi safarda manzilgacha qolgan masofa */
  leftKm: number | null;
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
  payouts: Payout[];
  withdraw: (amount: number) => Payout | null;
  zones: DemandZone[];
  /** «Uyga» rejimi: buyurtmalar tanlangan manzil tomonga */
  homeDest: Place | null;
  homeUsesLeft: number;
  setHomeDest: (p: Place | null) => boolean;
  navApp: NavApp;
  setNavApp: (a: NavApp) => void;
  voice: boolean;
  setVoice: (v: boolean) => void;
  /** Demo harakat: mashina marshrut bo'ylab o'zi yuradi (GPS o'rniga) */
  autopilot: boolean;
  setAutopilot: (v: boolean) => void;
  conn: ConnState;
  live: boolean;
  lastRating: { stars: number; tip: number } | null;
  clearRating: () => void;
};

const DCtx = createContext<Ctx | null>(null);
export const useDriver = () => {
  const c = useContext(DCtx);
  if (!c) throw new Error('useDriver must be inside DriverProvider');
  return c;
};

const K = {
  profile: 'yd:profile', earnings: 'yd:earnings', autopilot: 'yd:autopilot', activity: 'yd:activity', payouts: 'yd:payouts',
  online: 'yd:onlineLog', home: 'yd:home', homeUses: 'yd:homeUses', navApp: 'yd:navApp', voice: 'yd:voice', session: 'yd:session',
};
/** Ilova qayta ochilganda safar davom etishi uchun saqlanadigan holat */
type Session = { trip: Trip | null; next: OrderOffer | null; summary: Summary | null; online: boolean; pos: LatLng; savedAt: number };
const SESSION_TTL = 6 * 3600000;

const persist = (k: string, v: unknown) => { AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}); };
const PASSENGERS = ['Aziza', 'Bekzod', 'Dilshod', 'Madina', 'Sherzod', 'Nigora', 'Javohir', 'Kamola'];
const COMMENTS = ['Podyezd oldida kutaman', "Bolalar o'rindig'i kerak emas", 'Yukim bor, bagaj kerak', "Tezroq bo'ling, iltimos"];
const APPROACH_KMH = 32;
const RIDE_KMH = 38;
const DEMO_SPEEDUP = 6; // demo: real vaqtdan tezroq — sinab ko'rish uchun
const OFFER_MS = 15000;
const dayKey = () => new Date().toDateString();
const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function DriverProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [activity, setActivity] = useState(100);
  const [online, setOnlineState] = useState(false);
  const [onlineLog, setOnlineLog] = useState<{ date: string; ms: number }>({ date: dayKey(), ms: 0 });
  const [onlineSince, setOnlineSince] = useState<number | null>(null);
  const [pos, setPos] = useState<LatLng>(DEFAULT_CENTER);
  const [heading, setHeading] = useState(0);
  const [gps, setGps] = useState<GpsState>('demo');
  const [gpsTry, setGpsTry] = useState(0);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [next, setNext] = useState<OrderOffer | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [homeDest, setHomeDestState] = useState<Place | null>(null);
  const [homeUses, setHomeUses] = useState<{ date: string; used: number }>({ date: dayKey(), used: 0 });
  const [navApp, setNavAppState] = useState<NavApp>('yandex');
  const [voice, setVoiceState] = useState(true);
  const [autopilot, setAutopilotState] = useState(Platform.OS === 'web');
  const [conn, setConn] = useState<ConnState>('off');
  const [client, setClient] = useState<DispatchClient | null>(null);
  const [lastRating, setLastRating] = useState<{ stars: number; tip: number } | null>(null);
  const [slot, setSlot] = useState(() => demandSlot());

  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const headingRef = useRef(heading);
  useEffect(() => { headingRef.current = heading; }, [heading]);
  const tripRef = useRef(trip);
  useEffect(() => { tripRef.current = trip; }, [trip]);
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);
  const offerRef = useRef(offer);
  useEffect(() => { offerRef.current = offer; }, [offer]);
  const summaryRef = useRef(summary);
  useEffect(() => { summaryRef.current = summary; }, [summary]);
  const sinceRef = useRef(onlineSince);
  useEffect(() => { sinceRef.current = onlineSince; }, [onlineSince]);
  /** Serverda tasdiqlanishi kutilayotgan «qabul qilish» */
  const pendingAccept = useRef<string | null>(null);
  /** Zanjir taklifi so'ralgan safarlar (demo) */
  const chainAsked = useRef(new Set<string>());

  useEffect(() => {
    (async () => {
      try {
        const e = Object.fromEntries((await AsyncStorage.multiGet(Object.values(K))).map(([k, v]) => [k, v ? JSON.parse(v) : undefined]));
        if (e[K.profile]) setProfile(e[K.profile]);
        if (e[K.earnings]) setEarnings(e[K.earnings]);
        if (e[K.payouts]) setPayouts(e[K.payouts]);
        if (typeof e[K.activity] === 'number') setActivity(e[K.activity]);
        if (typeof e[K.autopilot] === 'boolean') setAutopilotState(e[K.autopilot]);
        if (e[K.online]?.date === dayKey()) setOnlineLog(e[K.online]);
        if (e[K.home]) setHomeDestState(e[K.home]);
        if (e[K.homeUses]?.date === dayKey()) setHomeUses(e[K.homeUses]);
        if (e[K.navApp]) setNavAppState(e[K.navApp]);
        if (typeof e[K.voice] === 'boolean') { setVoiceState(e[K.voice]); setVoiceEnabled(e[K.voice]); }
        // to'xtab qolgan safar va liniyadagi holat tiklanadi
        const s: Session | undefined = e[K.session];
        if (e[K.profile] && s && Date.now() - s.savedAt < SESSION_TTL) {
          if (s.pos) setPos(s.pos);
          if (s.trip) setTrip(s.trip);
          if (s.next) setNext(s.next);
          if (s.summary) setSummary(s.summary);
          if (s.online || s.trip) { setOnlineState(true); setOnlineSince(Date.now()); }
        }
      } catch {
        // xotira mavjud emas
      }
      setReady(true);
    })();
  }, []);

  // Sessiyani saqlash: safar holati o'zgarganda darhol, joylashuv — har 5 soniyada
  const saveSession = useCallback(() => {
    persist(K.session, { trip: tripRef.current, next: nextRef.current, summary: summaryRef.current, online: sinceRef.current != null, pos: posRef.current, savedAt: Date.now() } satisfies Session);
  }, []);
  useEffect(() => { if (ready) saveSession(); }, [ready, trip, next, summary, onlineSince, saveSession]);
  useEffect(() => {
    if (!online) return;
    const iv = setInterval(saveSession, 5000);
    return () => clearInterval(iv);
  }, [online, saveSession]);

  // Liniyada yoki safarda ekran o'chmaydi
  const awake = online || !!trip;
  useEffect(() => {
    if (!awake) return;
    activateKeepAwakeAsync('yums-driver').catch(() => {});
    return () => { deactivateKeepAwake('yums-driver').catch(() => {}); };
  }, [awake]);

  // Talab xaritasi har 10 daqiqada yangilanadi
  useEffect(() => {
    const iv = setInterval(() => setSlot(demandSlot()), 60000);
    return () => clearInterval(iv);
  }, []);
  const zones = useMemo(() => demandZones(slot), [slot]);
  const zonesRef = useRef(zones);
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  const bumpActivity = useCallback((d: number) => {
    setActivity(a => { const n = clamp(a + d); persist(K.activity, n); return n; });
  }, []);

  /* ---------- Server ---------- */
  const driverId = profile?.id ?? null;
  useEffect(() => {
    if (!DISPATCH_URL || !driverId) return;
    const cl = new DispatchClient('driver', driverId);
    const off = cl.onState(setConn);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tashqi ulanish obyekti
    setClient(cl);
    return () => { off(); cl.close(); setClient(null); };
  }, [driverId]);
  const live = conn === 'online';

  /* ---------- Joylashuv: GPS yoki avtopilot ---------- */
  useEffect(() => {
    if (autopilot || !profile) return;
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
          setHeading(h => (loc.coords.heading != null && loc.coords.heading >= 0 && (loc.coords.speed ?? 0) > 1 ? loc.coords.heading : distanceKm(posRef.current, p) > 0.008 ? bearing(posRef.current, p) : h));
          setPos(p);
        });
        if (cancelled) sub.remove(); else stop = () => sub.remove();
      } catch {
        if (!cancelled) setGps('denied');
      }
    })();
    return () => { cancelled = true; stop?.(); };
  }, [autopilot, profile, gpsTry]);
  const gpsState: GpsState = autopilot ? 'demo' : gps;

  // Avtopilot: faol safar yo'li bo'ylab harakat
  useEffect(() => {
    if (!autopilot || !trip || trip.stage === 'waiting') return;
    const path = trip.stage === 'toPickup' ? trip.approach : trip.order.route.coords;
    if (path.length < 2) return;
    const kmh = (trip.stage === 'toPickup' ? APPROACH_KMH : RIDE_KMH) * DEMO_SPEEDUP;
    const total = pathLength(path);
    // tiklangan safarda mashina yo'lning qayerida bo'lsa, o'sha joydan davom etadi
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
  }, [autopilot, trip]);

  // Yo'ldagi safar: manzilgacha qolgan masofa (zanjir buyurtma uchun)
  const leftKm = useMemo(() => (trip?.stage === 'inride' ? nextManeuver(trip.order.route.coords, pos).leftKm : null), [trip, pos]);
  const chainReady = leftKm != null && leftKm < CHAIN_KM && !next;

  // Joylashuvni serverga yuborish
  useEffect(() => {
    if (!client || !online) return;
    const iv = setInterval(() => client.send({ t: 'pos', pos: posRef.current, heading: headingRef.current }), 2000);
    return () => clearInterval(iv);
  }, [client, online]);

  // Serverga zanjir buyurtmaga tayyorlikni bildirish
  useEffect(() => {
    if (!client || !live) return;
    const dest = tripRef.current?.order.destination;
    client.send({ t: 'chain', on: chainReady, from: chainReady && dest ? { latitude: dest.latitude, longitude: dest.longitude } : undefined });
  }, [client, live, chainReady]);

  /* ---------- Safarni boshlash ---------- */
  const startTrip = useCallback((order: OrderOffer, stage: TripStage = 'toPickup') => {
    const me = posRef.current;
    setTrip({ order, stage, approach: [me, order.pickup], waitFee: 0, arrivedAt: stage === 'waiting' ? Date.now() : undefined, startedAt: stage === 'inride' ? Date.now() : undefined });
    if (stage === 'toPickup') {
      fetchRoute(me, order.pickup).then(r => setTrip(t => (t?.order.id === order.id && t.stage === 'toPickup' ? { ...t, approach: r.coords } : t)));
    }
  }, []);

  /* ---------- Server xabarlari ---------- */
  useEffect(() => {
    if (!client) return;
    return client.on(m => {
      switch (m.t) {
        case 'offer': {
          const t = tripRef.current;
          // band haydovchiga faqat yo'ldagi safarda zanjir taklifi keladi
          if (offerRef.current || (t && !(m.chain && t.stage === 'inride' && !nextRef.current))) { client.send({ t: 'decline', orderId: m.order.id }); return; }
          notifyOffer(m.order);
          setOffer({ order: m.order, distanceKm: m.distanceKm, expiresAt: Date.now() + m.expiresIn, total: m.expiresIn, chain: m.chain });
          break;
        }
        case 'offerGone':
          setOffer(o => (o?.order.id === m.orderId ? null : o));
          // qabul qilgan edik, lekin server tasdiqlamadi (vaqt tugadi yoki boshqa haydovchi oldi)
          if (pendingAccept.current === m.orderId) {
            pendingAccept.current = null;
            if (tripRef.current?.order.id === m.orderId) setTrip(null);
            if (nextRef.current?.id === m.orderId) setNext(null);
            toast("Buyurtma boshqa haydovchiga o'tdi", 'alert-circle');
          }
          break;
        case 'assigned':
          if (pendingAccept.current === m.order.id) pendingAccept.current = null;
          setOffer(o => (o?.order.id === m.order.id ? null : o));
          if (m.chain) {
            if (!nextRef.current) setNext(m.order);
          } else if (tripRef.current?.order.id !== m.order.id) {
            startTrip(m.order, m.status === 'arrived' ? 'waiting' : m.status === 'started' ? 'inride' : 'toPickup');
          }
          break;
        case 'cancelled':
          if (tripRef.current?.order.id === m.orderId) {
            haptic.error();
            say("Yo'lovchi buyurtmani bekor qildi", true);
            toast("Yo'lovchi buyurtmani bekor qildi", 'close-circle');
            const nx = nextRef.current;
            setTrip(null);
            if (nx) { setNext(null); startTrip(nx); }
          } else if (nextRef.current?.id === m.orderId) {
            setNext(null);
            toast('Keyingi buyurtma bekor qilindi', 'close-circle');
          }
          break;
        case 'rated':
          setEarnings(es => {
            const n = es.map(e => (e.id === m.orderId ? { ...e, stars: m.stars || undefined, tip: m.tip } : e));
            persist(K.earnings, n);
            return n;
          });
          if (m.stars) setLastRating({ stars: m.stars, tip: m.tip });
          break;
      }
    });
  }, [client, startTrip]);

  // Server ulanganda liniyadagi holatni qayta e'lon qilish
  useEffect(() => {
    if (client && profile && online && conn === 'online') {
      client.send({ t: 'online', driver: profile, pos: posRef.current, heading: headingRef.current, tariffs: profile.tariffs });
    }
  }, [client, profile, online, conn]);

  /* ---------- Demo buyurtmalar (server yo'q) ---------- */
  const makeDemoOrder = useCallback(async (from: LatLng): Promise<{ order: OrderOffer; km: number } | null> => {
    if (!profile) return null;
    const pickupPt = nearbyPoint(from);
    const pickup = { ...pickupPt, title: nearestTitle(pickupPt), subtitle: 'Toshkent' };
    const near = homeDest ? PLACES.filter(p => distanceKm(p, homeDest) < 3) : [];
    const dest = homeDest ? (near.length && Math.random() < 0.5 ? near[Math.floor(Math.random() * near.length)] : homeDest) : PLACES[Math.floor(Math.random() * PLACES.length)];
    if (distanceKm(pickup, dest) < 1) return null;
    const route = await fetchRoute(pickup, dest);
    const tariffId = profile.tariffs[Math.floor(Math.random() * profile.tariffs.length)] ?? 'start';
    const tf = TARIFFS.find(x => x.id === tariffId) ?? TARIFFS[0];
    const surge = surgeAt(zonesRef.current, pickup);
    const order: OrderOffer = {
      id: 'd' + Date.now().toString(36), pickup, destination: dest,
      route: { km: route.km, min: route.min, coords: route.coords }, tariffId, price: priceFor(tf, route.km, route.min, surge), surge: surge > 1 ? surge : undefined,
      payment: Math.random() < 0.5 ? 'cash' : 'card', options: Math.random() < 0.3 ? ['ac'] : [], comment: Math.random() < 0.35 ? COMMENTS[Math.floor(Math.random() * COMMENTS.length)] : '',
      passenger: { name: PASSENGERS[Math.floor(Math.random() * PASSENGERS.length)], rating: 4.6 + Math.round(Math.random() * 4) / 10, phone: '+998 90 123 45 67' },
      createdAt: new Date().toISOString(),
    };
    return { order, km: Math.round(distanceKm(from, pickup) * 10) / 10 };
  }, [profile, homeDest]);

  useEffect(() => {
    if (live || !online || trip || offer || summary || !profile) return;
    const hot = surgeAt(zonesRef.current, posRef.current) > 1;
    // faollik past bo'lsa buyurtmalar kamroq, yuqori talab hududida — tezroq keladi
    const delay = (6000 + Math.random() * 6000) * (activity < 40 ? 1.8 : 1) * (hot ? 0.6 : 1);
    let alive = true;
    const t = setTimeout(async () => {
      const made = await makeDemoOrder(posRef.current);
      if (!made || !alive || offerRef.current || tripRef.current) return;
      notifyOffer(made.order);
      setOffer({ order: made.order, distanceKm: made.km, expiresAt: Date.now() + OFFER_MS, total: OFFER_MS });
    }, delay);
    return () => { alive = false; clearTimeout(t); };
  }, [live, online, trip, offer, summary, profile, activity, makeDemoOrder]);

  // Demo zanjir: safar oxiriga yaqinlashganda keyingi buyurtma manzil yaqinidan taklif qilinadi
  const tripId = trip?.order.id;
  useEffect(() => {
    if (live || !online || !chainReady || offer || !tripId || chainAsked.current.has(tripId)) return;
    chainAsked.current.add(tripId);
    let alive = true;
    const t = setTimeout(async () => {
      const cur = tripRef.current;
      if (!cur || cur.order.id !== tripId) return;
      const made = await makeDemoOrder(cur.order.destination);
      if (!made || !alive || offerRef.current || nextRef.current) return;
      notifyOffer(made.order, true);
      setOffer({ order: made.order, distanceKm: made.km, expiresAt: Date.now() + OFFER_MS, total: OFFER_MS, chain: true });
    }, 1500 + Math.random() * 2000);
    return () => { alive = false; clearTimeout(t); };
  }, [live, online, chainReady, offer, tripId, makeDemoOrder]);

  // Taklif muddati tugadi — o'tkazib yuborilgan hisoblanadi
  useEffect(() => {
    if (!offer) return;
    const t = setTimeout(() => {
      if (offerRef.current?.order.id !== offer.order.id) return;
      if (live) client?.send({ t: 'decline', orderId: offer.order.id });
      setOffer(null);
      bumpActivity(ACTIVITY.missed);
      toast(`Buyurtma o'tkazib yuborildi · faollik ${ACTIVITY.missed}`, 'time-outline');
    }, Math.max(0, offer.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [offer, live, client, bumpActivity]);

  /* ---------- Amallar ---------- */
  const accept = useCallback(() => {
    const o = offerRef.current;
    if (!o) return;
    haptic.success();
    setOffer(null);
    bumpActivity(ACTIVITY.accept);
    if (live) { pendingAccept.current = o.order.id; client?.send({ t: 'accept', orderId: o.order.id }); }
    if (o.chain) {
      setNext(o.order);
      say(`Keyingi buyurtma qabul qilindi. ${o.order.pickup.title}`);
    } else {
      startTrip(o.order);
      say(`Buyurtma qabul qilindi. Mijozga boring: ${o.order.pickup.title}`);
    }
  }, [live, client, startTrip, bumpActivity]);

  const decline = useCallback(() => {
    const o = offerRef.current;
    if (!o) return;
    haptic.tap();
    if (live) client?.send({ t: 'decline', orderId: o.order.id });
    setOffer(null);
    bumpActivity(ACTIVITY.decline);
    toast(`Buyurtma rad etildi · faollik ${ACTIVITY.decline}`, 'remove-circle-outline');
  }, [live, client, bumpActivity]);

  const arrived = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    haptic.success();
    if (autopilot) setPos(t.order.pickup);
    setTrip({ ...t, stage: 'waiting', arrivedAt: Date.now() });
    if (live) client?.send({ t: 'arrived', orderId: t.order.id });
    say('Mijozga yetib kelganingiz haqida xabar yuborildi');
  }, [live, client, autopilot]);

  const startRide = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    haptic.tap();
    const waitFee = waitFeeOf(t.arrivedAt, Date.now());
    setTrip({ ...t, stage: 'inride', startedAt: Date.now(), waitFee });
    if (live) client?.send({ t: 'started', orderId: t.order.id });
    say(`Safar boshlandi. Manzil: ${t.order.destination.title}`);
  }, [live, client]);

  /** Joriy safar yopilgach zanjirdagi buyurtmaga o'tish */
  const goNext = useCallback(() => {
    const nx = nextRef.current;
    setTrip(null);
    if (nx) { setNext(null); startTrip(nx); }
  }, [startTrip]);

  const addEarning = useCallback((e: Earning) => {
    setEarnings(es => { const n = [e, ...es].slice(0, 300); persist(K.earnings, n); return n; });
    setProfile(p => { if (!p) return p; const n = { ...p, trips: p.trips + 1 }; persist(K.profile, n); return n; });
  }, []);

  const finishRide = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    haptic.success();
    const total = t.order.price + t.waitFee;
    if (live) client?.send({ t: 'finished', orderId: t.order.id, price: total });
    const e: Earning = {
      id: t.order.id, at: new Date().toISOString(), price: t.order.price, waitFee: t.waitFee, fee: Math.round(total * COMMISSION), tip: 0,
      km: Math.round(t.order.route.km * 10) / 10,
      min: t.startedAt ? Math.max(1, Math.round((Date.now() - t.startedAt) / 60000)) : t.order.route.min,
      from: t.order.pickup.title, to: t.order.destination.title, payment: t.order.payment, tariffId: t.order.tariffId, surge: t.order.surge,
    };
    addEarning(e);
    if (autopilot) setPos(t.order.destination);
    setSummary({ earning: e, passenger: t.order.passenger.name });
    say(t.order.payment === 'cash' ? `Safar yakunlandi. Yo'lovchidan naqd ${spokenSom(total)} oling` : `Safar yakunlandi. ${spokenSom(total)} kartadan to'landi`);
    goNext();
    // demo: yo'lovchi baholaydi
    if (!live) setTimeout(() => {
      const stars = Math.random() < 0.8 ? 5 : 4;
      const tip = Math.random() < 0.35 ? [2000, 5000, 10000][Math.floor(Math.random() * 3)] : 0;
      setEarnings(es => { const n = es.map(x => (x.id === e.id ? { ...x, stars, tip } : x)); persist(K.earnings, n); return n; });
      setLastRating({ stars, tip });
    }, 2500);
  }, [live, client, autopilot, addEarning, goNext]);

  const closeSummary = useCallback((passengerStars?: number) => {
    const s = summaryRef.current;
    if (s && passengerStars) {
      setEarnings(es => { const n = es.map(x => (x.id === s.earning.id ? { ...x, passengerStars } : x)); persist(K.earnings, n); return n; });
    }
    setSummary(null);
  }, []);

  const cancelTrip = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    if (live) client?.send({ t: 'cancel', orderId: t.order.id });
    bumpActivity(ACTIVITY.cancel);
    toast(`Buyurtma bekor qilindi · faollik ${ACTIVITY.cancel}`, 'close-circle-outline');
    goNext();
  }, [live, client, bumpActivity, goNext]);

  // Mijoz chiqmadi: faollik kamaymaydi, pullik kutish uchun kompensatsiya yoziladi
  const noShow = useCallback(() => {
    const t = tripRef.current;
    if (!t || t.stage !== 'waiting') return;
    if (live) client?.send({ t: 'cancel', orderId: t.order.id, reason: 'noShow' });
    const fee = waitFeeOf(t.arrivedAt, Date.now());
    if (fee > 0) {
      addEarning({
        id: t.order.id, at: new Date().toISOString(), price: 0, waitFee: fee, fee: Math.round(fee * COMMISSION), tip: 0, km: 0, min: 0,
        from: t.order.pickup.title, to: 'Mijoz chiqmadi', payment: 'card', tariffId: t.order.tariffId, noShow: true,
      });
    }
    toast(fee > 0 ? `Mijoz chiqmadi · kompensatsiya ${fee.toLocaleString('ru-RU')} so'm` : 'Mijoz chiqmadi · buyurtma yopildi', 'person-remove');
    goNext();
  }, [live, client, addEarning, goNext]);

  const cancelNext = useCallback(() => {
    const nx = nextRef.current;
    if (!nx) return;
    if (live) client?.send({ t: 'cancel', orderId: nx.id });
    setNext(null);
    bumpActivity(ACTIVITY.cancel);
    toast(`Keyingi buyurtma bekor qilindi · faollik ${ACTIVITY.cancel}`, 'close-circle-outline');
  }, [live, client, bumpActivity]);

  const setOnline = useCallback((v: boolean) => {
    haptic.tap();
    setOnlineState(v);
    const now = Date.now();
    if (v) {
      setOnlineSince(now);
      say('Siz liniyadasiz. Buyurtmalar qidirilmoqda');
    } else {
      setOffer(null);
      client?.send({ t: 'offline' });
      const since = sinceRef.current;
      if (since) setOnlineLog(l => { const n = { date: dayKey(), ms: (l.date === dayKey() ? l.ms : 0) + (now - since) }; persist(K.online, n); return n; });
      setOnlineSince(null);
    }
  }, [client]);

  const onlineMsToday = useCallback((now: number) => (onlineLog.date === dayKey() ? onlineLog.ms : 0) + (onlineSince ? Math.max(0, now - onlineSince) : 0), [onlineLog, onlineSince]);

  const today = useMemo(() => {
    const d = dayKey();
    const list = earnings.filter(e => new Date(e.at).toDateString() === d);
    return { sum: list.reduce((s, e) => s + e.price + (e.waitFee ?? 0) + e.tip - feeOf(e), 0), count: list.filter(e => !e.noShow).length, km: list.reduce((s, e) => s + e.km, 0) };
  }, [earnings]);

  const rating = useMemo(() => {
    const st = earnings.filter(e => e.stars).slice(0, 50);
    return st.length ? st.reduce((s, e) => s + (e.stars ?? 0), 0) / st.length : profile?.rating ?? 5;
  }, [earnings, profile]);

  // Balans: kartadagi safarlar tushadi, naqd safarlar komissiyasi yechiladi, choy puli qo'shiladi
  const balance = useMemo(() =>
    earnings.reduce((s, e) => s + (e.payment === 'cash' ? 0 : e.price + (e.waitFee ?? 0)) - feeOf(e) + e.tip, 0) - payouts.reduce((s, p) => s + p.amount, 0),
  [earnings, payouts]);

  const withdraw = (amount: number) => {
    if (amount <= 0 || amount > balance) return null;
    const p: Payout = { id: 'p' + Date.now().toString(36), at: new Date().toISOString(), amount, fee: Math.max(1000, Math.round(amount * 0.01)) };
    setPayouts(ps => { const n = [p, ...ps]; persist(K.payouts, n); return n; });
    return p;
  };

  const homeUsesLeft = HOME_USES_PER_DAY - (homeUses.date === dayKey() ? homeUses.used : 0);
  const setHomeDest = (p: Place | null) => {
    if (p) {
      if (homeUsesLeft <= 0) return false;
      const n = { date: dayKey(), used: HOME_USES_PER_DAY - homeUsesLeft + 1 };
      setHomeUses(n); persist(K.homeUses, n);
    }
    setHomeDestState(p);
    persist(K.home, p);
    return true;
  };

  const value: Ctx = {
    ready, profile,
    register: p => {
      const np: DriverProfile = { ...p, id: 'drv' + Date.now().toString(36), rating: 5, trips: 0, joinedAt: new Date().toISOString() };
      setProfile(np); persist(K.profile, np);
    },
    updateProfile: p => setProfile(cur => { if (!cur) return cur; const n = { ...cur, ...p }; persist(K.profile, n); return n; }),
    logout: () => {
      if (online) setOnline(false);
      setOffer(null); setTrip(null); setNext(null); setSummary(null); setProfile(null);
      AsyncStorage.multiRemove([K.profile, K.session]).catch(() => {});
    },
    online, setOnline, pos, heading, gps: gpsState, retryGps: () => setGpsTry(n => n + 1),
    offer, accept, decline, trip, next, leftKm, arrived, startRide, finishRide, cancelTrip, noShow, cancelNext, summary, closeSummary,
    earnings, today, onlineMsToday, rating, activity, balance, payouts, withdraw, zones,
    homeDest, homeUsesLeft, setHomeDest,
    navApp, setNavApp: a => { setNavAppState(a); persist(K.navApp, a); },
    voice, setVoice: v => { setVoiceState(v); setVoiceEnabled(v); persist(K.voice, v); },
    autopilot, setAutopilot: v => { setAutopilotState(v); persist(K.autopilot, v); },
    conn, live, lastRating, clearRating: () => setLastRating(null),
  };
  return <DCtx.Provider value={value}>{children}</DCtx.Provider>;
}

/** Yangi taklif: tebranish, ovoz va haptik */
function notifyOffer(order: OrderOffer, chain = false) {
  haptic.success();
  if (Platform.OS !== 'web') Vibration.vibrate([0, 350, 180, 350]);
  say(`${chain ? 'Keyingi buyurtma' : 'Yangi buyurtma'}. ${spokenSom(order.price)}. ${order.pickup.title}`, true);
}

function nearestTitle(p: LatLng) {
  const n = PLACES.reduce((b, x) => (distanceKm(p, x) < distanceKm(p, b) ? x : b), PLACES[0]);
  return distanceKm(p, n) < 0.3 ? n.title : `${n.title} yaqinida`;
}
