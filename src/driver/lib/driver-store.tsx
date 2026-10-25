// YUMS Driver holati: profil, liniya, buyurtma takliflari, faol safar, faollik, balans va daromad.
// Dispetcher serveri ulangan bo'lsa — haqiqiy yo'lovchi buyurtmalari, aks holda demo buyurtmalar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { toast } from '@/components/toast';
import { DEFAULT_CENTER, PLACES, TARIFFS, type Driver, type LatLng, type Place } from '@/lib/data';
import { DispatchClient, DISPATCH_URL, type ConnState, type OrderOffer } from '@/lib/dispatch';
import { bearing, distanceKm, fetchRoute, nearbyPoint, pathLength, pointAt, priceFor } from '@/lib/geo';
import { haptic } from '@/lib/store';

import { demandSlot, demandZones, surgeAt, type DemandZone } from './demand';

export type DriverProfile = Driver & { tariffs: string[]; city: string; joinedAt: string };

export type Offer = { order: OrderOffer; distanceKm: number; expiresAt: number; total: number };

/** Safar bosqichlari: mijozga borish → kutish → yo'lda */
export type TripStage = 'toPickup' | 'waiting' | 'inride';
export type Trip = { order: OrderOffer; stage: TripStage; approach: LatLng[]; arrivedAt?: number; startedAt?: number; waitFee: number };

export type Earning = {
  id: string; at: string; price: number; waitFee?: number; fee?: number; tip: number; stars?: number; passengerStars?: number;
  km: number; min: number; from: string; to: string; payment: OrderOffer['payment']; tariffId?: string; surge?: number;
};
export type Payout = { id: string; at: string; amount: number; fee: number };
export type NavApp = 'yandex' | 'google';

/** Safar tugagach ko'rsatiladigan hisob-kitob */
export type Summary = { earning: Earning; passenger: string };

export const COMMISSION = 0.1;
export const FREE_WAIT_SEC = 180;
export const WAIT_PER_MIN = 500;
export const HOME_USES_PER_DAY = 2;
export const ACTIVITY = { accept: 2, decline: -5, missed: -5, cancel: -10 };
export const feeOf = (e: Earning) => e.fee ?? Math.round((e.price + (e.waitFee ?? 0)) * COMMISSION);

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
  offer: Offer | null;
  accept: () => void;
  decline: () => void;
  trip: Trip | null;
  arrived: () => void;
  startRide: () => void;
  finishRide: () => void;
  cancelTrip: () => void;
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
  online: 'yd:onlineLog', home: 'yd:home', homeUses: 'yd:homeUses', navApp: 'yd:navApp',
};
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
  const [offer, setOffer] = useState<Offer | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [homeDest, setHomeDestState] = useState<Place | null>(null);
  const [homeUses, setHomeUses] = useState<{ date: string; used: number }>({ date: dayKey(), used: 0 });
  const [navApp, setNavAppState] = useState<NavApp>('yandex');
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
  const offerRef = useRef(offer);
  useEffect(() => { offerRef.current = offer; }, [offer]);
  const summaryRef = useRef(summary);
  useEffect(() => { summaryRef.current = summary; }, [summary]);
  const sinceRef = useRef(onlineSince);
  useEffect(() => { sinceRef.current = onlineSince; }, [onlineSince]);

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
      } catch {
        // xotira mavjud emas
      }
      setReady(true);
    })();
  }, []);

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
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 }, loc => {
          const p = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setHeading(h => (loc.coords.heading != null && loc.coords.heading >= 0 ? loc.coords.heading : distanceKm(posRef.current, p) > 0.005 ? bearing(posRef.current, p) : h));
          setPos(p);
        });
        stop = () => sub.remove();
      } catch {
        // GPS mavjud emas — standart nuqtada qolamiz
      }
    })();
    return () => stop?.();
  }, [autopilot, profile]);

  // Avtopilot: faol safar yo'li bo'ylab harakat
  useEffect(() => {
    if (!autopilot || !trip || trip.stage === 'waiting') return;
    const path = trip.stage === 'toPickup' ? trip.approach : trip.order.route.coords;
    if (path.length < 2) return;
    const kmh = (trip.stage === 'toPickup' ? APPROACH_KMH : RIDE_KMH) * DEMO_SPEEDUP;
    const total = pathLength(path);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const t = Math.min(1, ((Date.now() - t0) / 3600000) * kmh / Math.max(0.05, total));
      const p = pointAt(path, t);
      const next = pointAt(path, Math.min(1, t + 0.02));
      if (distanceKm(p, next) > 0.002) setHeading(bearing(p, next));
      setPos(p);
      if (t >= 1) clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, [autopilot, trip]);

  // Joylashuvni serverga yuborish
  useEffect(() => {
    if (!client || !online) return;
    const iv = setInterval(() => client.send({ t: 'pos', pos: posRef.current, heading: headingRef.current }), 2000);
    return () => clearInterval(iv);
  }, [client, online]);

  // Qabul qilingan buyurtma bo'yicha safarni boshlash (mijozga yo'l marshruti bilan)
  const startTrip = useCallback((order: OrderOffer, stage: TripStage = 'toPickup') => {
    const me = posRef.current;
    setTrip({ order, stage, approach: [me, order.pickup], waitFee: 0 });
    if (stage === 'toPickup') {
      fetchRoute(me, order.pickup).then(r => setTrip(t => (t?.order.id === order.id && t.stage === 'toPickup' ? { ...t, approach: r.coords } : t)));
    }
  }, []);

  /* ---------- Server xabarlari ---------- */
  useEffect(() => {
    if (!client) return;
    return client.on(m => {
      switch (m.t) {
        case 'offer':
          if (tripRef.current) { client.send({ t: 'decline', orderId: m.order.id }); return; }
          haptic.success();
          setOffer({ order: m.order, distanceKm: m.distanceKm, expiresAt: Date.now() + m.expiresIn, total: m.expiresIn });
          break;
        case 'offerGone':
          setOffer(o => (o?.order.id === m.orderId ? null : o));
          break;
        case 'assigned':
          setOffer(null);
          if (!tripRef.current || tripRef.current.order.id !== m.order.id) startTrip(m.order, m.status === 'arrived' ? 'waiting' : m.status === 'started' ? 'inride' : 'toPickup');
          break;
        case 'cancelled':
          if (tripRef.current?.order.id === m.orderId) {
            haptic.error();
            setTrip(null);
            toast("Yo'lovchi buyurtmani bekor qildi", 'close-circle');
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
  useEffect(() => {
    if (live || !online || trip || offer || summary || !profile) return;
    const me = posRef.current;
    const hot = surgeAt(zonesRef.current, me) > 1;
    // faollik past bo'lsa buyurtmalar kamroq, yuqori talab hududida — tezroq keladi
    const delay = (6000 + Math.random() * 6000) * (activity < 40 ? 1.8 : 1) * (hot ? 0.6 : 1);
    const t = setTimeout(async () => {
      const pickupPt = nearbyPoint(posRef.current);
      const pickup = { ...pickupPt, title: nearestTitle(pickupPt), subtitle: 'Toshkent' };
      const near = homeDest ? PLACES.filter(p => distanceKm(p, homeDest) < 3) : [];
      const dest = homeDest ? (near.length && Math.random() < 0.5 ? near[Math.floor(Math.random() * near.length)] : homeDest) : PLACES[Math.floor(Math.random() * PLACES.length)];
      if (distanceKm(pickup, dest) < 1) return;
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
      haptic.success();
      setOffer({ order, distanceKm: Math.round(distanceKm(posRef.current, pickup) * 10) / 10, expiresAt: Date.now() + OFFER_MS, total: OFFER_MS });
    }, delay);
    return () => clearTimeout(t);
  }, [live, online, trip, offer, summary, profile, homeDest, activity]);

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
    if (live) client?.send({ t: 'accept', orderId: o.order.id });
    startTrip(o.order);
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
    setPos(t.order.pickup);
    setTrip({ ...t, stage: 'waiting', arrivedAt: Date.now() });
    if (live) client?.send({ t: 'arrived', orderId: t.order.id });
  }, [live, client]);

  const startRide = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    haptic.tap();
    const waited = t.arrivedAt ? (Date.now() - t.arrivedAt) / 1000 : 0;
    const waitFee = Math.ceil(Math.max(0, waited - FREE_WAIT_SEC) / 60) * WAIT_PER_MIN;
    setTrip({ ...t, stage: 'inride', startedAt: Date.now(), waitFee });
    if (live) client?.send({ t: 'started', orderId: t.order.id });
  }, [live, client]);

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
    setEarnings(es => { const n = [e, ...es].slice(0, 300); persist(K.earnings, n); return n; });
    setProfile(p => { if (!p) return p; const n = { ...p, trips: p.trips + 1 }; persist(K.profile, n); return n; });
    setPos(t.order.destination);
    setTrip(null);
    setSummary({ earning: e, passenger: t.order.passenger.name });
    // demo: yo'lovchi baholaydi
    if (!live) setTimeout(() => {
      const stars = Math.random() < 0.8 ? 5 : 4;
      const tip = Math.random() < 0.35 ? [2000, 5000, 10000][Math.floor(Math.random() * 3)] : 0;
      setEarnings(es => { const n = es.map(x => (x.id === e.id ? { ...x, stars, tip } : x)); persist(K.earnings, n); return n; });
      setLastRating({ stars, tip });
    }, 2500);
  }, [live, client]);

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
    setTrip(null);
    bumpActivity(ACTIVITY.cancel);
    toast(`Buyurtma bekor qilindi · faollik ${ACTIVITY.cancel}`, 'close-circle-outline');
  }, [live, client, bumpActivity]);

  const setOnline = useCallback((v: boolean) => {
    haptic.tap();
    setOnlineState(v);
    const now = Date.now();
    if (v) {
      setOnlineSince(now);
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
    return { sum: list.reduce((s, e) => s + e.price + (e.waitFee ?? 0) + e.tip - feeOf(e), 0), count: list.length, km: list.reduce((s, e) => s + e.km, 0) };
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
      setOffer(null); setTrip(null); setSummary(null); setProfile(null);
      AsyncStorage.removeItem(K.profile).catch(() => {});
    },
    online, setOnline, pos, heading, offer, accept, decline, trip, arrived, startRide, finishRide, cancelTrip, summary, closeSummary,
    earnings, today, onlineMsToday, rating, activity, balance, payouts, withdraw, zones,
    homeDest, homeUsesLeft, setHomeDest,
    navApp, setNavApp: a => { setNavAppState(a); persist(K.navApp, a); },
    autopilot, setAutopilot: v => { setAutopilotState(v); persist(K.autopilot, v); },
    conn, live, lastRating, clearRating: () => setLastRating(null),
  };
  return <DCtx.Provider value={value}>{children}</DCtx.Provider>;
}

function nearestTitle(p: LatLng) {
  const n = PLACES.reduce((b, x) => (distanceKm(p, x) < distanceKm(p, b) ? x : b), PLACES[0]);
  return distanceKm(p, n) < 0.3 ? n.title : `${n.title} yaqinida`;
}
