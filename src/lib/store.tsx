// Yo'lovchi ilovasi holati. Safar, narx, haydovchi, tarix va manzillar — backendda; bu yerda faqat
// ko'rsatish uchun nusxa. Jonli o'zgarishlar socket orqali keladi, ishonchli holat — REST.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { toast } from '@/components/toast';

import { deleteAccount as closeAccount, signOut, updateProfile, type ProfilePatch } from './account-api';
import { ApiError, errorText, hasSession, setSessionLostHandler } from './api';
import type { Card, Driver, LatLng, PaymentId, Place, Ride } from './data';
import { decodePolyline, distanceKm, type RouteInfo } from './geo';
import { deviceLang, isLang, reloadForDirection, setAppLang, t as translate, tr, type Lang } from './i18n';
import { registerThisDevice } from './push';
import { onRealtime, onRealtimeReady, startRealtime, stopRealtime } from './realtime';
import { palette, type Colors } from './theme';
import * as trips from './trip-api';
import type { DriverLocation, NearbyCar, PublicSettings, Quote, RatingTag, ServerOrder } from './trip-api';
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
  /** Serverdagi rollar asosida: moderator paneli faqat moderator va admin uchun */
  role?: Role;
  roles?: string[];
  joinedAt?: string;
  /** Shu qurilmada oxirgi marta kirgan vaqti — «Hisobni tanlang» ro'yxati uchun */
  lastLoginAt?: string;
  /** Profil rasmi (data: URI, 400×400 JPEG) */
  avatar?: string;
  /** STIR (INN) — kompaniya yoki YaTT */
  stir?: string;
  /** JShShIR (PINFL) — shaxsiy identifikatsiya raqami */
  pinfl?: string;
  /** STIR, kompaniya nomi va rahbar reyestr bilan mos kelgan (yoki moderator tasdiqlagan) */
  registryVerified?: boolean;
  notifyTrip?: boolean;
  notifyPromo?: boolean;
  /** Kirishda ikkinchi kod ham so'raladi */
  twoFactor?: boolean;
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
  /** Server narx/marshrutni rad etgan sabab (manzil juda yaqin, xizmat hududidan tashqari va h.k.) */
  routeError?: string;
  tariffId: string;
  options: string[];
  comment: string;
  driver?: Driver;
  driverPos?: LatLng;
  driverPath?: LatLng[];
  progress: number;
  etaMin: number;
  arrivedAt?: number;
  /** Serverdagi buyurtma */
  liveId?: string;
  number?: string;
  /** Safar narxi (chegirma va pullik kutish bilan) */
  fare?: number;
  waitFee?: number;
  /** Haydovchi oldingi safarini tugatib keladi */
  chained?: boolean;
};

const ACTIVE_POLL_MS = 6000;
const NEARBY_POLL_MS = 8000;
const SKIPPED_KEY = 'yt:ratingSkipped';

const emptyOrder = (pickup: Place | null = null): Order => ({
  phase: 'idle', pickup, destination: null, route: null, routeLoading: false,
  tariffId: 'start', options: [], comment: '', progress: 0, etaMin: 0,
});

export const haptic = {
  tap: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  success: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  error: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
};

const PHASE: Record<trips.ServerStatus, Phase> = {
  SEARCHING: 'searching', DRIVER_ASSIGNED: 'accepted', DRIVER_ARRIVED: 'arrived', IN_PROGRESS: 'inride', COMPLETED: 'done', CANCELLED: 'idle',
};

type Ctx = {
  ready: boolean;
  colors: Colors;
  dark: boolean;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  user: User | null;
  /** Kirish (OTP tasdiqlangandan keyin) */
  signIn: (u: User) => void;
  /** Shu qurilmada avval kirgan hisoblar (oxirgisi birinchi) */
  savedAccounts: User[];
  /** Hisobni «Hisobni tanlang» ro'yxatidan olib tashlash (hisob o'chmaydi) */
  forgetAccount: (id: string) => void;
  /** Profilni serverda yangilaydi; xato bo'lsa xabar ko'rsatib, false qaytaradi */
  updateUser: (patch: Partial<User>) => Promise<boolean>;
  /** Server qaytargan profilni qabul qilish (kontakt almashtirish, 2FA) */
  adoptUser: (u: User) => void;
  logout: () => void;
  /** Hisobni butunlay o'chirish; serverda o'chmasa xato qaytaradi */
  deleteAccount: () => Promise<void>;
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
  /** Yaqindagi bo'sh mashinalar va eng yaqinining kelish vaqti */
  fleet: NearbyCar[];
  pickupEta: number | null;
  placeOrder: () => void;
  cancelOrder: () => void;
  finishRide: (rating: number, tip: number, tags?: string[]) => Promise<void>;
  /** SOS: operator va xavfsizlik xizmatiga signal */
  sos: (at?: LatLng) => Promise<boolean>;
  priceOf: (tariffId: string) => number;
  etaOf: (tariffId: string) => number | null;
  finalPrice: number;
  /** Narxga kiritilgan talab koeffitsienti */
  surge: number;
  payment: PaymentId;
  cardId?: string;
  setPayment: (p: PaymentId, cardId?: string) => void;
  cards: Card[];
  /** Balans va kartalarni serverdan qayta o'qiydi */
  refreshWallet: () => Promise<void>;
  balance: number;
  promo: Promo | null;
  applyPromo: (code: string) => Promise<boolean>;
  clearPromo: () => void;
  rides: Ride[];
  refreshRides: () => Promise<void>;
  saved: Saved;
  savePlace: (k: keyof Saved, p: Place | undefined) => void;
  recent: Place[];
  pushRecent: (p: Place) => void;
  settings: PublicSettings | null;
  ratingTagList: RatingTag[];
};

const StoreCtx = createContext<Ctx | null>(null);

export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore StoreProvider ichida ishlatilishi kerak');
  return c;
};
export const useColors = () => useStore().colors;
export const useT = () => useStore().t;

const K = { user: 'yt:user', theme: 'yt:theme', payment: 'yt:payment', lang: 'yt:lang', accounts: 'yt:accounts' };

const upsert = (list: User[], u: User) => [u, ...list.filter(x => x.id !== u.id)];
const persist = (k: string, v: unknown) => { AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}); };

/** Ilovadagi profil maydonlari → server PATCH /users/me */
function toPatch(p: Partial<User>): ProfilePatch {
  const out: ProfilePatch = {};
  if ('name' in p && p.name !== undefined) out.fullName = p.name;
  if ('kind' in p && p.kind) out.kind = p.kind;
  if ('company' in p) out.company = p.company ?? null;
  if ('country' in p && p.country) out.country = p.country;
  if ('bio' in p) out.bio = p.bio ?? null;
  if ('avatar' in p) out.avatar = p.avatar ?? null;
  if ('notifyTrip' in p && p.notifyTrip !== undefined) out.notifyTrip = p.notifyTrip;
  if ('notifyPromo' in p && p.notifyPromo !== undefined) out.notifyPromo = p.notifyPromo;
  return out;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemePref>('system');
  const [lang, setLangState] = useState<Lang>('uz');
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [saved, setSaved] = useState<Saved>({});
  const [cards, setCards] = useState<Card[]>([]);
  const [payment, setPaymentState] = useState<{ id: PaymentId; cardId?: string }>({ id: 'cash' });
  const [recent, setRecent] = useState<Place[]>([]);
  const [balance, setBalance] = useState(0);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [order, setOrder] = useState<Order>(emptyOrder());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [fleet, setFleet] = useState<NearbyCar[]>([]);
  const [pickupEta, setPickupEta] = useState<number | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [ratingTagList, setRatingTagList] = useState<RatingTag[]>([]);

  const orderRef = useRef(order);
  useEffect(() => { orderRef.current = order; }, [order]);
  const quoteRef = useRef(quote);
  useEffect(() => { quoteRef.current = quote; }, [quote]);
  const promoRef = useRef(promo);
  useEffect(() => { promoRef.current = promo; }, [promo]);
  const paymentRef = useRef(payment);
  useEffect(() => { paymentRef.current = payment; }, [payment]);
  const quoteReq = useRef(0);
  const skipped = useRef(new Set<string>());

  /* ---------- Katalog (kirishsiz ham) ---------- */
  useEffect(() => {
    trips.publicSettings().then(setSettings).catch(() => {});
    trips.ratingTags().then(setRatingTagList).catch(() => {});
  }, []);

  const dropSession = useCallback(() => {
    stopRealtime();
    setUser(null);
    setBalance(0);
    setCards([]);
    setRides([]);
    setSaved({});
    setRecent([]);
    setOrder(o => emptyOrder(o.pickup));
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

  const refreshRides = useCallback(async () => {
    setRides(await trips.rideHistory());
  }, []);

  const loadPlaces = useCallback(async () => {
    const mine = await trips.myPlaces();
    setSaved({ home: mine.home, work: mine.work });
    setRecent(mine.recent);
  }, []);

  /* ---------- Serverdagi buyurtmani ekranga o'tkazish ---------- */
  const applyServerOrder = useCallback((o: ServerOrder | null) => {
    const cur = orderRef.current;
    if (!o) {
      // Faol buyurtma yo'q: ekranda jonli safar qolgan bo'lsa — tozalaymiz
      if (cur.liveId) setOrder(x => ({ ...emptyOrder(x.pickup), destination: x.destination, phase: x.destination ? 'choosing' : 'idle' }));
      return;
    }
    if (cur.liveId && cur.liveId !== o.id) return;
    if (o.status === 'COMPLETED' && (o.rating !== undefined || skipped.current.has(o.id))) {
      if (cur.liveId === o.id) setOrder(x => emptyOrder(x.destination ?? x.pickup));
      return;
    }
    if (o.status === 'CANCELLED') {
      if (cur.liveId === o.id && cur.phase !== 'idle') {
        haptic.error();
        if (o.cancelledBy === 'SYSTEM') toast(tr("Hozir bo'sh haydovchi topilmadi — birozdan so'ng urinib ko'ring"), 'alert-circle');
        else if (o.cancelledBy === 'DRIVER' && o.cancelReason === 'NO_SHOW') toast(tr('Haydovchi sizni kutdi, lekin chiqmadingiz — buyurtma yopildi'), 'person-remove');
        else if (o.cancelledBy === 'ADMIN') toast(tr("Buyurtma operator tomonidan bekor qilindi — qo'llab-quvvatlash xizmatiga yozishingiz mumkin"), 'information-circle');
        setOrder(x => ({ ...emptyOrder(x.pickup), destination: x.destination, tariffId: x.tariffId, phase: x.destination ? 'choosing' : 'idle' }));
        trips.rideHistory().then(setRides).catch(() => {});
      }
      return;
    }
    const phase = PHASE[o.status];
    // Haydovchi buyurtmadan voz kechdi — qidiruv qayta boshlandi
    if (phase === 'searching' && (cur.phase === 'accepted' || cur.phase === 'arrived')) {
      haptic.error();
      toast(tr('Haydovchi bekor qildi — yangi haydovchi qidirilmoqda'), 'refresh-circle');
    }
    if (phase === 'accepted' && cur.phase === 'searching') haptic.success();
    if (phase === 'arrived' && cur.phase === 'accepted') haptic.success();
    const routeCoords = decodePolyline(o.route.polyline);
    const loc = o.driverLocation ? { latitude: o.driverLocation.latitude, longitude: o.driverLocation.longitude } : undefined;
    const destination = trips.fromPlaceDto(o.destination);
    const progress = phase === 'inride' && loc ? Math.min(1, Math.max(0, 1 - distanceKm(loc, destination) / Math.max(0.1, o.route.distanceKm))) : phase === 'done' ? 1 : 0;
    setOrder(x => ({
      ...x,
      phase,
      liveId: o.id,
      number: o.orderNumber,
      pickup: trips.fromPlaceDto(o.pickup),
      destination,
      tariffId: o.tariffId,
      options: o.options,
      comment: o.comment ?? '',
      route: { coords: routeCoords, km: o.route.distanceKm, min: o.route.durationMin },
      routeLoading: false,
      driver: o.driver ? trips.toDriver(o.driver) : undefined,
      driverPos: loc ?? (phase === 'searching' ? undefined : x.driverPos),
      driverPath: phase === 'accepted' && o.approachPolyline ? decodePolyline(o.approachPolyline) : phase === 'inride' ? routeCoords : undefined,
      etaMin: o.etaMin ?? x.etaMin,
      arrivedAt: o.arrivedAt ? new Date(o.arrivedAt).getTime() : undefined,
      progress,
      fare: o.finalPrice + o.waitFee,
      waitFee: o.waitFee,
      chained: o.chained,
    }));
  }, []);

  const syncActive = useCallback(async () => {
    try {
      applyServerOrder(await trips.activeOrder());
    } catch {
      // tarmoq yo'q — keyingi urinishda
    }
  }, [applyServerOrder]);

  /* ---------- Kirgandan keyin: server holatini yuklash va jonli aloqa ---------- */
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    startRealtime();
    registerThisDevice().catch(() => {});
    refreshWallet().catch(() => {});
    refreshRides().catch(() => {});
    loadPlaces().catch(() => {});
    syncActive().catch(() => {});
    const offs = [
      onRealtime<ServerOrder>('order.updated', o => applyServerOrder(o)),
      onRealtime<DriverLocation>('driver.location', l => {
        const cur = orderRef.current;
        if (cur.liveId !== l.orderId) return;
        const pos = { latitude: l.latitude, longitude: l.longitude };
        setOrder(x => {
          const progress = x.phase === 'inride' && x.destination && x.route ? Math.min(1, Math.max(0, 1 - distanceKm(pos, x.destination) / Math.max(0.1, x.route.km))) : x.progress;
          return { ...x, driverPos: pos, etaMin: l.etaMin, progress };
        });
      }),
      onRealtime<{ orderId: string; name: string; text: string }>('order.message', m => {
        if (orderRef.current.liveId !== m.orderId) return;
        haptic.success();
        toast(`${m.name}: ${m.text}`, 'chatbubble-ellipses');
      }),
      onRealtime<{ orderId: string; kind: string }>('order.alert', a => {
        if (orderRef.current.liveId === a.orderId) toast(tr("Haydovchi marshrutdan chetga chiqdi — xavfsizlik xizmati xabardor qilindi"), 'warning');
      }),
      onRealtimeReady(() => { syncActive().catch(() => {}); }),
    ];
    return () => offs.forEach(off => off());
  }, [userId, refreshWallet, refreshRides, loadPlaces, syncActive, applyServerOrder]);

  // Socket — signal; jonli safar paytida holat REST orqali ham tekshirib turiladi
  const live = !!order.liveId && order.phase !== 'done';
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => { syncActive().catch(() => {}); }, ACTIVE_POLL_MS);
    return () => clearInterval(iv);
  }, [live, syncActive]);

  /* ---------- Saqlangan sozlamalar va sessiya ---------- */
  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([...Object.values(K), SKIPPED_KEY]);
        const m = Object.fromEntries(entries.map(([k, v]) => [k, v ? JSON.parse(v) : undefined]));
        if (m[K.user] && (await hasSession())) setUser(m[K.user]);
        else AsyncStorage.removeItem(K.user).catch(() => {});
        setAccounts((m[K.accounts] ?? []).filter((a: User) => a.id !== 'demo'));
        if (m[K.theme]) setThemeState(m[K.theme]);
        // Til: saqlangani, bo'lmasa qurilma tili. Telefonda yozuv yo'nalishi mos kelmasa (arab tili) — bir marta qayta yuklanadi
        const l: Lang = isLang(m[K.lang]) ? m[K.lang] : deviceLang();
        if (setAppLang(l)) reloadForDirection();
        setLangState(l);
        if (m[K.payment]) setPaymentState(m[K.payment]);
        if (Array.isArray(m[SKIPPED_KEY])) skipped.current = new Set(m[SKIPPED_KEY]);
      } catch {
        // xotira mavjud emas — standart qiymatlar bilan davom etamiz
      }
      setReady(true);
    })();
  }, []);

  const dark = theme === 'system' ? scheme === 'dark' : theme === 'dark';
  const colors = dark ? palette.dark : palette.light;

  /* ---------- Narx: tanlangan yo'nalish uchun serverdan (muddati cheklangan) ---------- */
  const requote = useCallback(async (from: Place, to: Place): Promise<Quote | null> => {
    const req = ++quoteReq.current;
    setOrder(o => ({ ...o, routeLoading: true, routeError: undefined }));
    try {
      const q = await trips.quote(from, to);
      if (req !== quoteReq.current) return null;
      setQuote(q);
      setOrder(o => ({ ...o, route: q.route, routeLoading: false }));
      return q;
    } catch (error) {
      if (req !== quoteReq.current) return null;
      setQuote(null);
      setOrder(o => ({ ...o, route: null, routeLoading: false, routeError: errorText(error) }));
      return null;
    }
  }, []);

  const setPickup = useCallback((p: Place) => {
    const o = orderRef.current;
    if (o.liveId) return;
    orderRef.current = { ...o, pickup: p };
    setOrder(x => ({ ...x, pickup: p }));
    if (o.destination && o.phase === 'choosing') requote(p, o.destination).catch(() => {});
  }, [requote]);

  const setDestination = useCallback((p: Place | null) => {
    const o = orderRef.current;
    if (o.liveId) return;
    if (!p) { quoteReq.current++; setQuote(null); setOrder(x => ({ ...x, destination: null, route: null, routeLoading: false, routeError: undefined, phase: 'idle' })); return; }
    orderRef.current = { ...o, destination: p, phase: 'choosing' };
    setOrder(x => ({ ...x, destination: p, phase: 'choosing', route: null }));
    if (o.pickup) requote(o.pickup, p).catch(() => {});
  }, [requote]);

  /* ---------- Yaqindagi bo'sh mashinalar ---------- */
  const nearbyAt = order.pickup;
  const showFleet = !!userId && (order.phase === 'idle' || order.phase === 'choosing' || order.phase === 'searching');
  const fleetTariff = order.phase === 'idle' ? undefined : order.tariffId;
  useEffect(() => {
    if (!showFleet || !nearbyAt) return;
    let alive = true;
    const load = () => trips.nearbyCars(nearbyAt, fleetTariff).then(r => { if (alive) { setFleet(r.cars); setPickupEta(r.etaMin); } }).catch(() => {});
    load();
    const iv = setInterval(load, NEARBY_POLL_MS);
    return () => { alive = false; clearInterval(iv); };
  }, [showFleet, nearbyAt, fleetTariff]);

  const priceOf = useCallback((tariffId: string) => quote?.prices[tariffId]?.price ?? 0, [quote]);
  const etaOf = useCallback((tariffId: string) => quote?.prices[tariffId]?.pickupEtaMin ?? null, [quote]);
  const surge = quote?.surge ?? 1;

  const finalPrice = useMemo(() => {
    if (order.liveId && order.fare !== undefined) return order.fare;
    const p = priceOf(order.tariffId);
    return promo ? Math.ceil((p * (100 - promo.percent)) / 100 / 500) * 500 : p;
  }, [priceOf, order.tariffId, order.liveId, order.fare, promo]);

  /* ---------- Buyurtma ---------- */
  const placeOrder = useCallback(() => {
    const o = orderRef.current;
    if (!o.pickup || !o.destination || o.liveId) return;
    haptic.tap();
    const send = async (q: Quote) => trips.placeOrder({
      quoteId: q.id, tariffId: o.tariffId, payment: paymentRef.current.id, cardId: paymentRef.current.cardId,
      options: o.options, comment: o.comment, promoCode: promoRef.current?.code,
    });
    (async () => {
      setOrder(x => ({ ...x, phase: 'searching', progress: 0 }));
      let q = quoteRef.current;
      if (!q || new Date(q.expiresAt).getTime() < Date.now() + 5000) q = await requote(o.pickup!, o.destination!);
      if (!q) { setOrder(x => ({ ...x, phase: 'choosing' })); return; }
      try {
        applyServerOrder(await send(q));
      } catch (error) {
        if (error instanceof ApiError && error.code === 'QUOTE_EXPIRED') {
          const fresh = await requote(o.pickup!, o.destination!);
          if (fresh) {
            try { applyServerOrder(await send(fresh)); return; } catch (again) { error = again; }
          }
        }
        if (error instanceof ApiError && error.code === 'ACTIVE_ORDER_EXISTS') { await syncActive(); return; }
        haptic.error();
        toast(errorText(error), 'alert-circle');
        setOrder(x => ({ ...x, phase: 'choosing' }));
      }
    })().catch(() => {});
  }, [requote, applyServerOrder, syncActive]);

  const cancelOrder = useCallback(() => {
    const o = orderRef.current;
    if (!o.liveId) { setOrder(x => ({ ...x, phase: x.destination ? 'choosing' : 'idle' })); return; }
    trips.cancelOrder(o.liveId)
      .then(() => {
        setOrder(x => ({ ...emptyOrder(x.pickup), destination: x.destination, tariffId: x.tariffId, phase: x.destination ? 'choosing' : 'idle' }));
        if (o.destination && o.pickup) requote(o.pickup, o.destination).catch(() => {});
        trips.rideHistory().then(setRides).catch(() => {});
      })
      .catch(error => toast(errorText(error), 'alert-circle'));
  }, [requote]);

  const finishRide = useCallback(async (rating: number, tip: number, tags: string[] = []) => {
    const o = orderRef.current;
    if (o.liveId) {
      if (rating > 0) {
        try {
          await trips.rateOrder(o.liveId, rating, tip, tags);
        } catch (error) {
          toast(errorText(error), 'alert-circle');
          if (error instanceof ApiError && error.status === 402) return;
        }
      } else {
        skipped.current.add(o.liveId);
        persist(SKIPPED_KEY, [...skipped.current].slice(-50));
      }
    }
    setPromo(null);
    setQuote(null);
    setOrder(emptyOrder(o.destination ?? o.pickup));
    refreshWallet().catch(() => {});
    refreshRides().catch(() => {});
  }, [refreshWallet, refreshRides]);

  const sos = useCallback(async (at?: LatLng) => {
    const id = orderRef.current.liveId;
    if (!id) return false;
    try {
      await trips.raiseSos(id, at);
      return true;
    } catch (error) {
      toast(errorText(error), 'alert-circle');
      return false;
    }
  }, []);

  const pushRecent = useCallback((p: Place) => {
    setRecent(rs => [p, ...rs.filter(x => x.title !== p.title)].slice(0, settings?.recentPlacesMax ?? 6));
    trips.rememberPlace(p).catch(() => {});
  }, [settings]);

  const adoptUser = useCallback((u: User) => {
    setUser(cur => {
      const nu = { ...cur, ...u, lastLoginAt: cur?.lastLoginAt ?? new Date().toISOString() };
      persist(K.user, nu);
      setAccounts(as => { const n = upsert(as, nu); persist(K.accounts, n); return n; });
      return nu;
    });
  }, []);

  const value: Ctx = {
    ready, colors, dark, theme,
    setTheme: t => { setThemeState(t); persist(K.theme, t); },
    user,
    signIn: u => {
      const nu = { ...u, lastLoginAt: new Date().toISOString() };
      setUser(nu); persist(K.user, nu);
      setAccounts(as => { const n = upsert(as, nu); persist(K.accounts, n); return n; });
    },
    savedAccounts: accounts.filter(a => a.lastLoginAt).sort((a, b) => (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? '')),
    forgetAccount: id => setAccounts(as => { const n = as.map(a => (a.id === id ? { ...a, lastLoginAt: undefined } : a)); persist(K.accounts, n); return n; }),
    updateUser: async patch => {
      try {
        adoptUser(await updateProfile(toPatch(patch)));
        return true;
      } catch (error) {
        toast(errorText(error), 'alert-circle');
        return false;
      }
    },
    adoptUser,
    logout: () => { signOut().catch(() => {}); dropSession(); },
    deleteAccount: async () => {
      const id = user?.id;
      await closeAccount();
      setAccounts(as => { const n = as.filter(a => a.id !== id); persist(K.accounts, n); return n; });
      dropSession();
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
    setTariff: id => { haptic.tap(); setOrder(o => (o.liveId ? o : { ...o, tariffId: id })); },
    toggleOption: id => setOrder(o => (o.liveId ? o : { ...o, options: o.options.includes(id) ? o.options.filter(x => x !== id) : [...o.options, id] })),
    setComment: s => setOrder(o => (o.liveId ? o : { ...o, comment: s })),
    fleet, pickupEta,
    placeOrder, cancelOrder, finishRide, sos, priceOf, etaOf, finalPrice, surge,
    payment: payment.id, cardId: payment.cardId,
    setPayment: (id, cardId) => { const p = { id, cardId }; setPaymentState(p); persist(K.payment, p); },
    cards,
    refreshWallet,
    balance, promo,
    applyPromo: async code => {
      try {
        const p = await trips.validatePromo(code.trim());
        setPromo({ code: p.code, percent: p.percent });
        return true;
      } catch (error) {
        toast(errorText(error), 'alert-circle');
        return false;
      }
    },
    clearPromo: () => setPromo(null),
    rides, refreshRides, saved,
    savePlace: (k, p) => {
      setSaved(s => ({ ...s, [k]: p }));
      trips.savePlace(k, p).catch(error => { toast(errorText(error), 'alert-circle'); loadPlaces().catch(() => {}); });
    },
    recent, pushRecent,
    settings, ratingTagList,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
