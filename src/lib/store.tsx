import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { DRIVERS, SEED_RIDES, TARIFFS, type Card, type Driver, type LatLng, type PaymentId, type Place, type Ride } from './data';
import { fetchRoute, nearbyPoint, pathLength, pointAt, priceFor, type RouteInfo } from './geo';
import { palette, type Colors } from './theme';

export type Phase = 'idle' | 'choosing' | 'searching' | 'accepted' | 'arrived' | 'inride' | 'done';
export type User = { name: string; phone: string; rating: number };
export type ThemePref = 'system' | 'light' | 'dark';
export type Saved = { home?: Place; work?: Place };
export type Promo = { code: string; percent: number };

export type Order = {
  phase: Phase;
  pickup: Place | null;
  destination: Place | null;
  route: RouteInfo | null;
  routeLoading: boolean;
  tariffId: string;
  options: string[];
  comment: string;
  driver?: Driver;
  driverPos?: LatLng;
  driverPath?: LatLng[];
  progress: number;
  etaMin: number;
  arrivedAt?: number;
};

const PROMOS: Record<string, number> = { YUMS20: 20, YANGI30: 30, TOSHKENT: 10 };
const APPROACH_MS = 24000; // demo: haydovchining kelishi
const WAIT_MS = 9000; // demo: kutish
const RIDE_MS = 36000; // demo: safar
const TICK = 400;

const emptyOrder = (pickup: Place | null = null): Order => ({
  phase: 'idle', pickup, destination: null, route: null, routeLoading: false,
  tariffId: 'start', options: [], comment: '', progress: 0, etaMin: 0,
});

export const surgeNow = () => {
  const h = new Date().getHours();
  return h >= 17 && h < 20 ? 1.2 : h >= 7 && h < 9 ? 1.1 : 1;
};

export const haptic = {
  tap: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  success: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
};

type Ctx = {
  ready: boolean;
  colors: Colors;
  dark: boolean;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  user: User | null;
  login: (u: Omit<User, 'rating'>) => void;
  logout: () => void;
  order: Order;
  setPickup: (p: Place) => void;
  setDestination: (p: Place | null) => void;
  setTariff: (id: string) => void;
  toggleOption: (id: string) => void;
  setComment: (s: string) => void;
  placeOrder: () => void;
  cancelOrder: () => void;
  finishRide: (rating: number, tip: number) => void;
  priceOf: (tariffId: string) => number;
  finalPrice: number;
  payment: PaymentId;
  cardId?: string;
  setPayment: (p: PaymentId, cardId?: string) => void;
  cards: Card[];
  addCard: (c: Card) => void;
  removeCard: (id: string) => void;
  balance: number;
  promo: Promo | null;
  applyPromo: (code: string) => boolean;
  clearPromo: () => void;
  rides: Ride[];
  saved: Saved;
  savePlace: (k: keyof Saved, p: Place | undefined) => void;
  recent: Place[];
  pushRecent: (p: Place) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore StoreProvider ichida ishlatilishi kerak');
  return c;
};
export const useColors = () => useStore().colors;

const K = { user: 'yt:user', rides: 'yt:rides', saved: 'yt:saved', cards: 'yt:cards', theme: 'yt:theme', payment: 'yt:payment', recent: 'yt:recent', balance: 'yt:balance' };
const persist = (k: string, v: unknown) => { AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}); };

export function StoreProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemePref>('system');
  const [user, setUser] = useState<User | null>(null);
  const [rides, setRides] = useState<Ride[]>(SEED_RIDES);
  const [saved, setSaved] = useState<Saved>({});
  const [cards, setCards] = useState<Card[]>([{ id: 'c1', brand: 'Uzcard', last4: '4417' }]);
  const [payment, setPaymentState] = useState<{ id: PaymentId; cardId?: string }>({ id: 'cash' });
  const [recent, setRecent] = useState<Place[]>([]);
  const [balance, setBalance] = useState(25000);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [order, setOrder] = useState<Order>(emptyOrder());

  const orderRef = useRef(order);
  useEffect(() => { orderRef.current = order; }, [order]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const routeReq = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet(Object.values(K));
        const m = Object.fromEntries(entries.map(([k, v]) => [k, v ? JSON.parse(v) : undefined]));
        if (m[K.user]) setUser(m[K.user]);
        if (m[K.rides]) setRides(m[K.rides]);
        if (m[K.saved]) setSaved(m[K.saved]);
        if (m[K.cards]) setCards(m[K.cards]);
        if (m[K.theme]) setThemeState(m[K.theme]);
        if (m[K.payment]) setPaymentState(m[K.payment]);
        if (m[K.recent]) setRecent(m[K.recent]);
        if (typeof m[K.balance] === 'number') setBalance(m[K.balance]);
      } catch {
        // xotira mavjud emas — standart qiymatlar bilan davom etamiz
      }
      setReady(true);
    })();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const dark = theme === 'system' ? scheme === 'dark' : theme === 'dark';
  const colors = dark ? palette.dark : palette.light;

  const clearTimers = () => { timers.current.forEach(t => { clearTimeout(t); clearInterval(t); }); timers.current = []; };

  /* ---------- Marshrut ---------- */
  const loadRoute = useCallback(async (from: Place, to: Place) => {
    const req = ++routeReq.current;
    setOrder(o => ({ ...o, routeLoading: true }));
    const route = await fetchRoute(from, to);
    if (req !== routeReq.current) return;
    setOrder(o => ({ ...o, route, routeLoading: false }));
  }, []);

  const setPickup = useCallback((p: Place) => {
    const o = orderRef.current;
    orderRef.current = { ...o, pickup: p };
    setOrder(x => ({ ...x, pickup: p }));
    if (o.destination && o.phase === 'choosing') loadRoute(p, o.destination);
  }, [loadRoute]);

  const setDestination = useCallback((p: Place | null) => {
    if (!p) { routeReq.current++; setOrder(o => ({ ...o, destination: null, route: null, routeLoading: false, phase: 'idle' })); return; }
    const o = orderRef.current;
    orderRef.current = { ...o, destination: p, phase: 'choosing' };
    setOrder(x => ({ ...x, destination: p, phase: 'choosing', route: null }));
    if (o.pickup) loadRoute(o.pickup, p);
  }, [loadRoute]);

  /* ---------- Narx ---------- */
  const priceOf = useCallback((tariffId: string) => {
    const t = TARIFFS.find(x => x.id === tariffId) ?? TARIFFS[0];
    const r = order.route;
    if (!r) return 0;
    return priceFor(t, r.km, r.min, surgeNow());
  }, [order.route]);

  const finalPrice = useMemo(() => {
    const p = priceOf(order.tariffId);
    return promo ? Math.ceil((p * (100 - promo.percent)) / 100 / 500) * 500 : p;
  }, [priceOf, order.tariffId, promo]);
  const finalPriceRef = useRef(finalPrice);
  useEffect(() => { finalPriceRef.current = finalPrice; }, [finalPrice]);

  /* ---------- Simulyatsiya ---------- */
  const animate = (path: LatLng[], ms: number, totalMin: number, onDone: () => void) => {
    const start = Date.now();
    const iv = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / ms);
      setOrder(o => ({ ...o, driverPos: pointAt(path, t), progress: t, etaMin: Math.max(1, Math.ceil((1 - t) * totalMin)) }));
      if (t >= 1) { clearInterval(iv); onDone(); }
    }, TICK);
    timers.current.push(iv);
  };

  const placeOrder = useCallback(() => {
    const o = orderRef.current;
    if (!o.pickup || !o.destination || !o.route) return;
    haptic.tap();
    clearTimers();
    setOrder(x => ({ ...x, phase: 'searching', progress: 0 }));
    timers.current.push(setTimeout(async () => {
      const driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
      const pickup = orderRef.current.pickup!;
      const approach = await fetchRoute(nearbyPoint(pickup), pickup);
      if (orderRef.current.phase !== 'searching') return;
      haptic.success();
      const approachMin = Math.max(2, Math.round(pathLength(approach.coords) / 0.45));
      setOrder(x => ({ ...x, phase: 'accepted', driver, driverPath: approach.coords, driverPos: approach.coords[0], etaMin: approachMin, progress: 0 }));
      animate(approach.coords, APPROACH_MS, approachMin, () => {
        haptic.success();
        setOrder(x => ({ ...x, phase: 'arrived', arrivedAt: Date.now(), driverPos: pickup }));
        timers.current.push(setTimeout(() => {
          const route = orderRef.current.route!;
          setOrder(x => ({ ...x, phase: 'inride', driverPath: route.coords, progress: 0, etaMin: route.min }));
          animate(route.coords, RIDE_MS, route.min, () => {
            haptic.success();
            setOrder(x => ({ ...x, phase: 'done' }));
          });
        }, WAIT_MS));
      });
    }, 3500));
  }, []);

  const cancelOrder = useCallback(() => {
    clearTimers();
    const o = orderRef.current;
    if (o.driver && o.pickup && o.destination && (o.phase === 'accepted' || o.phase === 'arrived')) {
      const r: Ride = {
        id: 'r' + Date.now(), from: o.pickup, to: o.destination, tariffId: o.tariffId, price: 0,
        distanceKm: o.route?.km ?? 0, durationMin: 0, payment: payment.id, driver: o.driver, status: 'cancelled', createdAt: new Date().toISOString(),
      };
      setRides(rs => { const n = [r, ...rs]; persist(K.rides, n); return n; });
    }
    setOrder(x => ({ ...x, phase: x.destination ? 'choosing' : 'idle', driver: undefined, driverPos: undefined, driverPath: undefined, progress: 0 }));
  }, [payment.id]);

  const finishRide = useCallback((rating: number, tip: number) => {
    const o = orderRef.current;
    if (o.driver && o.pickup && o.destination && o.route) {
      const price = finalPriceRef.current;
      const r: Ride = {
        id: 'r' + Date.now(), from: o.pickup, to: o.destination, tariffId: o.tariffId, price: price + tip,
        distanceKm: Math.round(o.route.km * 10) / 10, durationMin: o.route.min, payment: payment.id, driver: o.driver,
        status: 'done', createdAt: new Date().toISOString(), rating: rating || undefined, tip: tip || undefined,
      };
      setRides(rs => { const n = [r, ...rs]; persist(K.rides, n); return n; });
      if (payment.id === 'balance') setBalance(b => { const n = Math.max(0, b - price - tip); persist(K.balance, n); return n; });
      else setBalance(b => { const n = b + Math.round(price * 0.03); persist(K.balance, n); return n; }); // 3% keshbek
    }
    setPromo(null);
    clearTimers();
    setOrder(emptyOrder(o.destination));
  }, [payment.id]);

  const pushRecent = useCallback((p: Place) => {
    setRecent(rs => {
      const n = [p, ...rs.filter(x => x.title !== p.title)].slice(0, 6);
      persist(K.recent, n);
      return n;
    });
  }, []);

  const value: Ctx = {
    ready, colors, dark, theme,
    setTheme: t => { setThemeState(t); persist(K.theme, t); },
    user,
    login: u => { const nu = { ...u, rating: 4.9 }; setUser(nu); persist(K.user, nu); },
    logout: () => { setUser(null); AsyncStorage.removeItem(K.user).catch(() => {}); },
    order, setPickup, setDestination,
    setTariff: id => { haptic.tap(); setOrder(o => ({ ...o, tariffId: id })); },
    toggleOption: id => setOrder(o => ({ ...o, options: o.options.includes(id) ? o.options.filter(x => x !== id) : [...o.options, id] })),
    setComment: s => setOrder(o => ({ ...o, comment: s })),
    placeOrder, cancelOrder, finishRide, priceOf, finalPrice,
    payment: payment.id, cardId: payment.cardId,
    setPayment: (id, cardId) => { const p = { id, cardId }; setPaymentState(p); persist(K.payment, p); },
    cards,
    addCard: c => setCards(cs => { const n = [...cs, c]; persist(K.cards, n); return n; }),
    removeCard: id => {
      setCards(cs => { const n = cs.filter(c => c.id !== id); persist(K.cards, n); return n; });
      if (payment.cardId === id) { const p = { id: 'cash' as PaymentId }; setPaymentState(p); persist(K.payment, p); }
    },
    balance, promo,
    applyPromo: code => {
      const pct = PROMOS[code.trim().toUpperCase()];
      if (!pct) return false;
      setPromo({ code: code.trim().toUpperCase(), percent: pct });
      return true;
    },
    clearPromo: () => setPromo(null),
    rides, saved,
    savePlace: (k, p) => setSaved(s => { const n = { ...s, [k]: p }; persist(K.saved, n); return n; }),
    recent, pushRecent,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
