// YUMS Driver holati: profil, liniya, buyurtma takliflari, faol safar va daromad.
// Dispetcher serveri ulangan bo'lsa — haqiqiy yo'lovchi buyurtmalari, aks holda demo buyurtmalar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { DEFAULT_CENTER, PLACES, TARIFFS, type Driver, type LatLng } from '@/lib/data';
import { DispatchClient, DISPATCH_URL, type ConnState, type OrderOffer } from '@/lib/dispatch';
import { bearing, distanceKm, fetchRoute, nearbyPoint, pathLength, pointAt, priceFor } from '@/lib/geo';
import { haptic } from '@/lib/store';

export type DriverProfile = Driver & { tariffs: string[]; city: string; joinedAt: string };

export type Offer = { order: OrderOffer; distanceKm: number; expiresAt: number };

/** Safar bosqichlari: mijozga borish → kutish → yo'lda */
export type TripStage = 'toPickup' | 'waiting' | 'inride';
export type Trip = { order: OrderOffer; stage: TripStage; approach: LatLng[]; arrivedAt?: number; startedAt?: number };

export type Earning = { id: string; at: string; price: number; tip: number; stars?: number; km: number; min: number; from: string; to: string; payment: OrderOffer['payment'] };

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
  earnings: Earning[];
  today: { sum: number; count: number; hours: number };
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

const K = { profile: 'yd:profile', earnings: 'yd:earnings', autopilot: 'yd:autopilot' };
const persist = (k: string, v: unknown) => { AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}); };
const PASSENGERS = ['Aziza', 'Bekzod', 'Dilshod', 'Madina', 'Sherzod', 'Nigora', 'Javohir', 'Kamola'];
const APPROACH_KMH = 32;
const RIDE_KMH = 38;
const DEMO_SPEEDUP = 6; // demo: real vaqtdan tezroq — sinab ko'rish uchun

export function DriverProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [online, setOnlineState] = useState(false);
  const [pos, setPos] = useState<LatLng>(DEFAULT_CENTER);
  const [heading, setHeading] = useState(0);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [autopilot, setAutopilotState] = useState(Platform.OS === 'web');
  const [conn, setConn] = useState<ConnState>('off');
  const [client, setClient] = useState<DispatchClient | null>(null);
  const [lastRating, setLastRating] = useState<{ stars: number; tip: number } | null>(null);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const headingRef = useRef(heading);
  useEffect(() => { headingRef.current = heading; }, [heading]);
  const tripRef = useRef(trip);
  useEffect(() => { tripRef.current = trip; }, [trip]);
  const offerRef = useRef(offer);
  useEffect(() => { offerRef.current = offer; }, [offer]);

  useEffect(() => {
    (async () => {
      try {
        const e = Object.fromEntries((await AsyncStorage.multiGet(Object.values(K))).map(([k, v]) => [k, v ? JSON.parse(v) : undefined]));
        if (e[K.profile]) setProfile(e[K.profile]);
        if (e[K.earnings]) setEarnings(e[K.earnings]);
        if (typeof e[K.autopilot] === 'boolean') setAutopilotState(e[K.autopilot]);
      } catch {
        // xotira mavjud emas
      }
      setReady(true);
    })();
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

  /* ---------- Server xabarlari ---------- */
  useEffect(() => {
    if (!client) return;
    return client.on(m => {
      switch (m.t) {
        case 'offer':
          if (tripRef.current) { client.send({ t: 'decline', orderId: m.order.id }); return; }
          haptic.success();
          setOffer({ order: m.order, distanceKm: m.distanceKm, expiresAt: Date.now() + m.expiresIn });
          break;
        case 'offerGone':
          setOffer(o => (o?.order.id === m.orderId ? null : o));
          break;
        case 'assigned':
          setOffer(null);
          if (!tripRef.current || tripRef.current.order.id !== m.order.id) startTrip(m.order, m.status === 'arrived' ? 'waiting' : m.status === 'started' ? 'inride' : 'toPickup');
          break;
        case 'cancelled':
          if (tripRef.current?.order.id === m.orderId) { haptic.error(); setTrip(null); }
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
    // startTrip barqaror (faqat setState va fetchRoute ishlatadi)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  // Server ulanganda liniyadagi holatni qayta e'lon qilish
  useEffect(() => {
    if (client && profile && online && conn === 'online') {
      client.send({ t: 'online', driver: profile, pos: posRef.current, heading: headingRef.current, tariffs: profile.tariffs });
    }
  }, [client, profile, online, conn]);

  /* ---------- Demo buyurtmalar (server yo'q) ---------- */
  useEffect(() => {
    if (live || !online || trip || offer || !profile) return;
    const t = setTimeout(async () => {
      const me = posRef.current;
      const pickupPt = nearbyPoint(me);
      const pickup = { ...pickupPt, title: nearestTitle(pickupPt), subtitle: 'Toshkent' };
      const dest = PLACES[Math.floor(Math.random() * PLACES.length)];
      if (distanceKm(pickup, dest) < 1) return;
      const route = await fetchRoute(pickup, dest);
      const tariffId = profile.tariffs[Math.floor(Math.random() * profile.tariffs.length)] ?? 'start';
      const tf = TARIFFS.find(x => x.id === tariffId) ?? TARIFFS[0];
      const order: OrderOffer = {
        id: 'd' + Date.now().toString(36), pickup, destination: dest,
        route: { km: route.km, min: route.min, coords: route.coords }, tariffId, price: priceFor(tf, route.km, route.min),
        payment: Math.random() < 0.5 ? 'cash' : 'card', options: Math.random() < 0.3 ? ['ac'] : [], comment: Math.random() < 0.3 ? "Podyezd oldida kutaman" : '',
        passenger: { name: PASSENGERS[Math.floor(Math.random() * PASSENGERS.length)], rating: 4.6 + Math.round(Math.random() * 4) / 10, phone: '+998 90 123 45 67' },
        createdAt: new Date().toISOString(),
      };
      haptic.success();
      setOffer({ order, distanceKm: Math.round(distanceKm(me, pickup) * 10) / 10, expiresAt: Date.now() + 15000 });
    }, 6000 + Math.random() * 6000);
    return () => clearTimeout(t);
  }, [live, online, trip, offer, profile]);

  // Taklif muddati tugadi
  useEffect(() => {
    if (!offer) return;
    const t = setTimeout(() => {
      if (offerRef.current?.order.id !== offer.order.id) return;
      if (live) client?.send({ t: 'decline', orderId: offer.order.id });
      setOffer(null);
    }, Math.max(0, offer.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [offer, live, client]);

  /* ---------- Amallar ---------- */
  const startTrip = useCallback((order: OrderOffer, stage: TripStage = 'toPickup') => {
    const me = posRef.current;
    setTrip({ order, stage, approach: [me, order.pickup] });
    if (stage === 'toPickup') {
      fetchRoute(me, order.pickup).then(r => setTrip(t => (t?.order.id === order.id && t.stage === 'toPickup' ? { ...t, approach: r.coords } : t)));
    }
  }, []);

  const accept = useCallback(() => {
    const o = offerRef.current;
    if (!o) return;
    haptic.success();
    setOffer(null);
    if (live) client?.send({ t: 'accept', orderId: o.order.id });
    startTrip(o.order);
  }, [live, client, startTrip]);

  const decline = useCallback(() => {
    const o = offerRef.current;
    if (!o) return;
    haptic.tap();
    if (live) client?.send({ t: 'decline', orderId: o.order.id });
    setOffer(null);
  }, [live, client]);

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
    setTrip({ ...t, stage: 'inride', startedAt: Date.now() });
    if (live) client?.send({ t: 'started', orderId: t.order.id });
  }, [live, client]);

  const finishRide = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    haptic.success();
    const price = t.order.price;
    if (live) client?.send({ t: 'finished', orderId: t.order.id, price });
    const e: Earning = {
      id: t.order.id, at: new Date().toISOString(), price, tip: 0, km: Math.round(t.order.route.km * 10) / 10,
      min: t.startedAt ? Math.max(1, Math.round((Date.now() - t.startedAt) / 60000)) : t.order.route.min,
      from: t.order.pickup.title, to: t.order.destination.title, payment: t.order.payment,
    };
    setEarnings(es => { const n = [e, ...es].slice(0, 200); persist(K.earnings, n); return n; });
    setProfile(p => { if (!p) return p; const n = { ...p, trips: p.trips + 1 }; persist(K.profile, n); return n; });
    setPos(t.order.destination);
    setTrip(null);
    // demo: yo'lovchi baholaydi
    if (!live) setTimeout(() => {
      const stars = Math.random() < 0.8 ? 5 : 4;
      const tip = Math.random() < 0.35 ? [2000, 5000, 10000][Math.floor(Math.random() * 3)] : 0;
      setEarnings(es => { const n = es.map(x => (x.id === e.id ? { ...x, stars, tip } : x)); persist(K.earnings, n); return n; });
      setLastRating({ stars, tip });
    }, 1800);
  }, [live, client]);

  const cancelTrip = useCallback(() => {
    const t = tripRef.current;
    if (!t) return;
    if (live) client?.send({ t: 'cancel', orderId: t.order.id });
    setTrip(null);
  }, [live, client]);

  const setOnline = useCallback((v: boolean) => {
    haptic.tap();
    setOnlineState(v);
    if (!v) {
      setOffer(null);
      client?.send({ t: 'offline' });
    }
  }, [client]);

  const today = useMemo(() => {
    const d = new Date().toDateString();
    const list = earnings.filter(e => new Date(e.at).toDateString() === d);
    return { sum: list.reduce((s, e) => s + e.price + e.tip, 0), count: list.length, hours: Math.round(list.reduce((s, e) => s + e.min, 0) / 6) / 10 };
  }, [earnings]);

  const value: Ctx = {
    ready, profile,
    register: p => {
      const np: DriverProfile = { ...p, id: 'drv' + Date.now().toString(36), rating: 5, trips: 0, joinedAt: new Date().toISOString() };
      setProfile(np); persist(K.profile, np);
    },
    updateProfile: p => setProfile(cur => { if (!cur) return cur; const n = { ...cur, ...p }; persist(K.profile, n); return n; }),
    logout: () => { client?.send({ t: 'offline' }); setOnlineState(false); setOffer(null); setTrip(null); setProfile(null); AsyncStorage.removeItem(K.profile).catch(() => {}); },
    online, setOnline, pos, heading, offer, accept, decline, trip, arrived, startRide, finishRide, cancelTrip,
    earnings, today, autopilot,
    setAutopilot: v => { setAutopilotState(v); persist(K.autopilot, v); },
    conn, live, lastRating, clearRating: () => setLastRating(null),
  };
  return <DCtx.Provider value={value}>{children}</DCtx.Provider>;
}

function nearestTitle(p: LatLng) {
  const n = PLACES.reduce((b, x) => (distanceKm(p, x) < distanceKm(p, b) ? x : b), PLACES[0]);
  return distanceKm(p, n) < 0.3 ? n.title : `${n.title} yaqinida`;
}
