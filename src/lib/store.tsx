import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { toast } from '@/components/toast';

import { deleteAccount as closeAccount, signOut } from './account-api';
import { hasSession, setSessionLostHandler } from './api';
import { DRIVERS, SEED_RIDES, type Card, type Driver, type LatLng, type PaymentId, type Place, type Ride } from './data';
import { DispatchClient, DISPATCH_URL, type ConnState, type FleetCar } from './dispatch';
import { distanceKm, fetchRoute, nearbyPoint, pathLength, pointAt, priceFor, type RouteInfo } from './geo';
import { tariffOf, zoneSurgeAt, type RemoteConfig } from './remote-config';
import { deviceLang, isLang, reloadForDirection, setAppLang, t as translate, tr, type Lang } from './i18n';
import { pinflGender } from './registry';
import { palette, type Colors } from './theme';
import { loadWallet } from './wallet-api';

export type Phase = 'idle' | 'choosing' | 'searching' | 'accepted' | 'arrived' | 'inride' | 'done';
export type Role = 'user' | 'moderator' | 'admin';
export type AccountKind = 'person' | 'company';
export type User = {
  name: string;
  phone: string;
  rating: number;
  id?: string;
  email?: string;
  kind?: AccountKind;
  company?: string;
  country?: string;
  bio?: string;
  role?: Role;
  joinedAt?: string;
  /** Shu qurilmada oxirgi marta kirgan vaqti — «Hisobni tanlang» ro'yxati uchun */
  lastLoginAt?: string;
  /** Profil rasmi (data: URI, 400×400 JPEG) */
  avatar?: string;
  /** STIR (INN) — kompaniya yoki YaTT */
  stir?: string;
  /** JShShIR (PINFL) — shaxsiy identifikatsiya raqami */
  pinfl?: string;
  /** STIR, kompaniya nomi va rahbar reyestr bilan mos kelgan */
  registryVerified?: boolean;
};
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
  /** Jonli buyurtma (dispetcher serveri orqali haqiqiy haydovchi) — id; bo'lmasa demo simulyatsiya */
  liveId?: string;
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
  error: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
};

type Ctx = {
  ready: boolean;
  colors: Colors;
  dark: boolean;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  user: User | null;
  /** Yangi hisob yaratib kirish (ro'yxatdan o'tish) */
  /** Mavjud hisob bilan kirish */
  signIn: (u: User) => void;
  /** Telefon yoki email bo'yicha ro'yxatdan o'tgan hisobni topish */
  /** Shu qurilmada avval kirgan hisoblar (oxirgisi birinchi) */
  savedAccounts: User[];
  /** Hisobni «Hisobni tanlang» ro'yxatidan olib tashlash (hisob o'chmaydi) */
  forgetAccount: (id: string) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
  /** Hisobni butunlay o'chirish (ro'yxatdan ham olib tashlanadi) */
  deleteAccount: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Tarjima (til almashganda yangi funksiya — komponentlar qayta chiziladi) */
  t: typeof translate;
  order: Order;
  setPickup: (p: Place) => void;
  setDestination: (p: Place | null) => void;
  setTariff: (id: string) => void;
  toggleOption: (id: string) => void;
  setComment: (s: string) => void;
  /** Dispetcher serveriga ulanish holati va liniyadagi haydovchilar */
  dispatchState: ConnState;
  fleet: FleetCar[];
  placeOrder: () => void;
  cancelOrder: () => void;
  finishRide: (rating: number, tip: number) => void;
  priceOf: (tariffId: string) => number;
  finalPrice: number;
  /** Joriy narx koeffitsienti (server ulangan bo'lsa — admin belgilagan hudud bo'yicha) */
  surge: number;
  payment: PaymentId;
  cardId?: string;
  setPayment: (p: PaymentId, cardId?: string) => void;
  cards: Card[];
  /** Balans va kartalarni serverdan qayta o'qiydi */
  refreshWallet: () => Promise<void>;
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
export const useT = () => useStore().t;

const K = { user: 'yt:user', rides: 'yt:rides', saved: 'yt:saved', theme: 'yt:theme', payment: 'yt:payment', recent: 'yt:recent', lang: 'yt:lang', accounts: 'yt:accounts' };

const upsert = (list: User[], u: User) => [u, ...list.filter(x => x.id !== u.id)];
const persist = (k: string, v: unknown) => { AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}); };

export function StoreProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemePref>('system');
  const [lang, setLangState] = useState<Lang>('uz');
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [rides, setRides] = useState<Ride[]>(SEED_RIDES);
  const [saved, setSaved] = useState<Saved>({});
  const [cards, setCards] = useState<Card[]>([]);
  const [payment, setPaymentState] = useState<{ id: PaymentId; cardId?: string }>({ id: 'cash' });
  const [recent, setRecent] = useState<Place[]>([]);
  const [balance, setBalance] = useState(0);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [order, setOrder] = useState<Order>(emptyOrder());

  const orderRef = useRef(order);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const paymentRef = useRef(payment.id);
  useEffect(() => { paymentRef.current = payment.id; }, [payment.id]);
  useEffect(() => { orderRef.current = order; }, [order]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const routeReq = useRef(0);

  /* ---------- Dispetcher (jonli rejim) ---------- */
  const [client, setClient] = useState<DispatchClient | null>(null);
  const [dispatchState, setDispatchState] = useState<ConnState>('off');
  const [fleet, setFleet] = useState<FleetCar[]>([]);
  /** Admin panel narx sozlamalari (server ulanganda keladi) */
  const [remote, setRemote] = useState<RemoteConfig | null>(null);
  const fleetRef = useRef<FleetCar[]>([]);
  useEffect(() => { fleetRef.current = fleet; }, [fleet]);
  const passengerId = user?.id ?? null;
  useEffect(() => {
    if (!DISPATCH_URL || !passengerId) return;
    const cl = new DispatchClient('passenger', passengerId);
    const offState = cl.onState(setDispatchState);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tashqi ulanish obyekti
    setClient(cl);
    return () => { offState(); cl.close(); setClient(null); setFleet([]); };
  }, [passengerId]);

  const dropSession = useCallback(() => {
    setUser(null);
    setBalance(0);
    setCards([]);
    AsyncStorage.removeItem(K.user).catch(() => {});
  }, []);
  useEffect(() => { setSessionLostHandler(dropSession); }, [dropSession]);

  /* ---------- Hamyon: balans va kartalar faqat serverda ---------- */
  const refreshWallet = useCallback(async () => {
    const wallet = await loadWallet();
    setBalance(wallet.balance);
    setCards(wallet.cards);
    setPaymentState(p => (p.cardId && !wallet.cards.some(c => c.id === p.cardId) ? { id: 'cash' } : p));
  }, []);
  const walletOwner = user?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- server javobi kelgach yangilanadi
    if (walletOwner) refreshWallet().catch(() => {});
  }, [walletOwner, refreshWallet]);

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet(Object.values(K));
        const m = Object.fromEntries(entries.map(([k, v]) => [k, v ? JSON.parse(v) : undefined]));
        // Sessiyasi yo'q saqlangan foydalanuvchi (eski demo hisob ham) qaytadan kiradi
        if (m[K.user] && (await hasSession())) setUser(m[K.user]);
        else AsyncStorage.removeItem(K.user).catch(() => {});
        const saved: User[] = (m[K.accounts] ?? []).filter((a: User) => a.id !== 'demo');
        setAccounts(saved);
        if (m[K.rides]) setRides(m[K.rides]);
        if (m[K.saved]) setSaved(m[K.saved]);
        if (m[K.theme]) setThemeState(m[K.theme]);
        // Til: saqlangani, bo'lmasa qurilma tili. Telefonda yozuv yo'nalishi mos kelmasa (arab tili) — bir marta qayta yuklanadi
        const l: Lang = isLang(m[K.lang]) ? m[K.lang] : deviceLang();
        if (setAppLang(l)) reloadForDirection();
        setLangState(l);
        if (m[K.payment]) setPaymentState(m[K.payment]);
        if (m[K.recent]) setRecent(m[K.recent]);
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
  // Server ulangan bo'lsa — admin narxlari va olish nuqtasidagi yuqori talab hududi, aks holda kun vaqtiga qarab
  const surge = remote ? zoneSurgeAt(remote.zones, order.pickup) : surgeNow();
  const surgeRef = useRef(surge);
  useEffect(() => { surgeRef.current = surge; }, [surge]);
  const priceOf = useCallback((tariffId: string) => {
    const r = order.route;
    if (!r) return 0;
    return priceFor(tariffOf(tariffId, remote), r.km, r.min, surge);
  }, [order.route, remote, surge]);

  const finalPrice = useMemo(() => {
    const p = priceOf(order.tariffId);
    return promo ? Math.ceil((p * (100 - promo.percent)) / 100 / 500) * 500 : p;
  }, [priceOf, order.tariffId, promo]);
  const finalPriceRef = useRef(finalPrice);
  useEffect(() => { finalPriceRef.current = finalPrice; }, [finalPrice]);

  /* ---------- Jonli buyurtma: server xabarlari ---------- */
  useEffect(() => {
    if (!client) return;
    return client.on(m => {
      const o = orderRef.current;
      if (m.t === 'fleet') { setFleet(m.drivers); return; }
      if (m.t === 'config') { setRemote(m.config); return; }
      if (!('orderId' in m) || m.orderId !== o.liveId) return;
      switch (m.t) {
        case 'accepted': {
          haptic.success();
          if (m.chain) toast(tr("Haydovchi joriy safarini yakunlab, sizga yo'l oladi"), 'car');
          const pos = m.pos ?? o.pickup!;
          setOrder(x => ({ ...x, phase: 'accepted', driver: m.driver, driverPos: pos, driverPath: undefined, progress: 0, etaMin: Math.max(1, Math.round(distanceKm(pos, x.pickup!) / 0.45)) }));
          // haydovchining olib ketish nuqtasigacha yo'li (xaritada punktir)
          fetchRoute(pos, o.pickup!).then(r => setOrder(x => (x.liveId === o.liveId && x.phase === 'accepted' ? { ...x, driverPath: r.coords } : x)));
          break;
        }
        case 'driverPos':
          setOrder(x => {
            if (x.phase === 'accepted' && x.pickup) return { ...x, driverPos: m.pos, etaMin: Math.max(1, Math.round(distanceKm(m.pos, x.pickup) / 0.45)) };
            if (x.phase === 'inride' && x.route) {
              const left = distanceKm(m.pos, x.destination!);
              const t = Math.min(1, Math.max(0, 1 - left / Math.max(0.1, x.route.km)));
              return { ...x, driverPos: m.pos, progress: t, etaMin: Math.max(1, Math.ceil((1 - t) * x.route.min)) };
            }
            return { ...x, driverPos: m.pos };
          });
          break;
        case 'arrived':
          haptic.success();
          setOrder(x => ({ ...x, phase: 'arrived', arrivedAt: Date.now() }));
          break;
        case 'started':
          setOrder(x => ({ ...x, phase: 'inride', driverPath: x.route?.coords, progress: 0, etaMin: x.route?.min ?? 0 }));
          break;
        case 'finished':
          haptic.success();
          setOrder(x => ({ ...x, phase: 'done', progress: 1 }));
          break;
        case 'driverCancelled':
          haptic.error();
          toast(tr('Haydovchi bekor qildi — yangi haydovchi qidirilmoqda'), 'refresh-circle');
          setOrder(x => ({ ...x, phase: 'searching', driver: undefined, driverPos: undefined, driverPath: undefined, progress: 0 }));
          break;
        case 'noDriver':
          haptic.error();
          toast(tr("Hozir bo'sh haydovchi topilmadi — birozdan so'ng urinib ko'ring"), 'alert-circle');
          setOrder(x => ({ ...x, phase: 'choosing', liveId: undefined }));
          break;
        case 'noShow':
          // haydovchi kutdi, yo'lovchi chiqmadi — buyurtma yopildi
          haptic.error();
          toast(tr('Haydovchi sizni kutdi, lekin chiqmadingiz — buyurtma yopildi'), 'person-remove');
          setOrder(x => ({ ...x, phase: x.destination ? 'choosing' : 'idle', driver: undefined, driverPos: undefined, driverPath: undefined, progress: 0, liveId: undefined }));
          break;
        case 'adminCancelled':
          haptic.error();
          toast(tr("Buyurtma operator tomonidan bekor qilindi — qo'llab-quvvatlash xizmatiga yozishingiz mumkin"), 'information-circle');
          setOrder(x => ({ ...x, phase: x.destination ? 'choosing' : 'idle', driver: undefined, driverPos: undefined, driverPath: undefined, progress: 0, liveId: undefined }));
          break;
      }
    });
  }, [client]);

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
    // Server ulangan va liniyada haydovchi bor — buyurtma haqiqiy haydovchiga ketadi
    // (band haydovchi ham safari tugashiga yaqin uni zanjir buyurtma sifatida olishi mumkin)
    if (client?.state === 'online' && fleetRef.current.length > 0) {
      const id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const u = userRef.current;
      client.send({ t: 'order', order: {
        id, pickup: o.pickup, destination: o.destination,
        route: { km: o.route.km, min: o.route.min, coords: o.route.coords.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 120)) === 0 || i === a.length - 1) },
        tariffId: o.tariffId, price: finalPriceRef.current, surge: surgeRef.current > 1 ? surgeRef.current : undefined, payment: paymentRef.current, options: o.options, comment: o.comment,
        passenger: { name: u?.name ?? tr("Yo'lovchi"), phone: u?.phone, rating: u?.rating ?? 5, photo: u?.avatar, gender: pinflGender(u?.pinfl) }, createdAt: new Date().toISOString(),
      } });
      setOrder(x => ({ ...x, phase: 'searching', progress: 0, liveId: id }));
      return;
    }
    setOrder(x => ({ ...x, phase: 'searching', progress: 0, liveId: undefined }));
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
  }, [client]);

  const cancelOrder = useCallback(() => {
    clearTimers();
    const o = orderRef.current;
    if (o.liveId) client?.send({ t: 'cancel', orderId: o.liveId });
    if (o.driver && o.pickup && o.destination && (o.phase === 'accepted' || o.phase === 'arrived')) {
      const r: Ride = {
        id: 'r' + Date.now(), from: o.pickup, to: o.destination, tariffId: o.tariffId, price: 0,
        distanceKm: o.route?.km ?? 0, durationMin: 0, payment: payment.id, driver: o.driver, status: 'cancelled', createdAt: new Date().toISOString(),
      };
      setRides(rs => { const n = [r, ...rs]; persist(K.rides, n); return n; });
    }
    setOrder(x => ({ ...x, phase: x.destination ? 'choosing' : 'idle', driver: undefined, driverPos: undefined, driverPath: undefined, progress: 0, liveId: undefined }));
  }, [payment.id, client]);

  const finishRide = useCallback((rating: number, tip: number) => {
    const o = orderRef.current;
    if (o.liveId) client?.send({ t: 'rate', orderId: o.liveId, stars: rating, tip });
    if (o.driver && o.pickup && o.destination && o.route) {
      const price = finalPriceRef.current;
      const r: Ride = {
        id: 'r' + Date.now(), from: o.pickup, to: o.destination, tariffId: o.tariffId, price: price + tip,
        distanceKm: Math.round(o.route.km * 10) / 10, durationMin: o.route.min, payment: payment.id, driver: o.driver,
        status: 'done', createdAt: new Date().toISOString(), rating: rating || undefined, tip: tip || undefined,
      };
      setRides(rs => { const n = [r, ...rs]; persist(K.rides, n); return n; });
    }
    setPromo(null);
    clearTimers();
    setOrder(emptyOrder(o.destination));
  }, [payment.id, client]);

  const pushRecent = useCallback((p: Place) => {
    setRecent(rs => {
      const n = [p, ...rs.filter(x => x.title !== p.title)].slice(0, 6);
      persist(K.recent, n);
      return n;
    });
  }, []);

  const value: Ctx = {
    ready, colors, dark, theme, dispatchState, fleet,
    setTheme: t => { setThemeState(t); persist(K.theme, t); },
    user,
    signIn: u => {
      const nu = { ...u, lastLoginAt: new Date().toISOString() };
      setUser(nu); persist(K.user, nu);
      setAccounts(as => { const n = upsert(as, nu); persist(K.accounts, n); return n; });
    },
    savedAccounts: accounts.filter(a => a.lastLoginAt).sort((a, b) => (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? '')),
    forgetAccount: id => setAccounts(as => { const n = as.map(a => (a.id === id ? { ...a, lastLoginAt: undefined } : a)); persist(K.accounts, n); return n; }),
    updateUser: patch => setUser(cur => {
      if (!cur) return cur;
      const nu = { ...cur, ...patch };
      persist(K.user, nu);
      setAccounts(as => { const n = upsert(as, nu); persist(K.accounts, n); return n; });
      return nu;
    }),
    logout: () => { signOut(); dropSession(); },
    deleteAccount: () => {
      const id = user?.id;
      closeAccount().catch(() => {});
      setAccounts(as => { const n = as.filter(a => a.id !== id); persist(K.accounts, n); return n; });
      setUser(null); AsyncStorage.removeItem(K.user).catch(() => {});
    },
    lang,
    setLang: l => {
      const reload = setAppLang(l, true);
      setLangState(l);
      // yo'nalish o'zgarsa (arab tili) — til saqlangach ilova qayta yuklanadi
      AsyncStorage.setItem(K.lang, JSON.stringify(l)).catch(() => {}).finally(() => { if (reload) reloadForDirection(); });
    },
    t: (k, vars) => translate(k, vars),
    order, setPickup, setDestination,
    setTariff: id => { haptic.tap(); setOrder(o => ({ ...o, tariffId: id })); },
    toggleOption: id => setOrder(o => ({ ...o, options: o.options.includes(id) ? o.options.filter(x => x !== id) : [...o.options, id] })),
    setComment: s => setOrder(o => ({ ...o, comment: s })),
    placeOrder, cancelOrder, finishRide, priceOf, finalPrice, surge,
    payment: payment.id, cardId: payment.cardId,
    setPayment: (id, cardId) => { const p = { id, cardId }; setPaymentState(p); persist(K.payment, p); },
    cards,
    refreshWallet,
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
