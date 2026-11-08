// YUMS platformasi holati. Katalog, loyihalar, market, chat, moderatsiya, tariflar va xavfsizlik —
// backendda (platform-api.ts); bu yerda ekranlar uchun nusxa va jonli yangilanishlar.
// Faqat savat qurilmada turadi: u buyurtma emas, sotuvchiga yuboriladigan so'rov qoralamasi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { toast } from '@/components/toast';
import { exportMyData, securityEvents, setTwoFactor as saveTwoFactor, type SecurityEvent as ServerSecurityEvent } from '@/lib/account-api';
import { errorText } from '@/lib/api';
import { fmtDay } from '@/lib/format';
import { groupDigits } from '@/lib/geo';
import { tr, tx } from '@/lib/i18n';
import { onRealtime, startRealtime } from '@/lib/realtime';

import * as papi from './platform-api';
import type { MyPlan, PlanInfo } from './platform-api';
import {
  BANNED_WORDS, COUNTRIES, SECTORS,
  type Attachment, type Company, type Conversation, type Investor, type MarketItem, type Meeting, type Message, type Notice, type PeerKind,
  type Plan, type Project, type Report, type ReportTarget, type SecurityEvent, type Specialist, type Verification,
} from './platform-data';
import { useStore } from './store';

/* ---------- Yordamchi formatlar ---------- */

export const usd = (n: number) => {
  if (n < 10 && n % 1) return `$${n.toFixed(2)}`;
  return `$${groupDigits(n)}`;
};

export const short = (n: number) =>
  n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K` : String(n);

export const budget = (a: number, b: number) => `$${short(a)} – $${short(b)}`;

export const countryOf = (code: string) => COUNTRIES.find(c => c.code === code) ?? { code, name: code, flag: '🌐', region: 'Osiyo' as const };
export const sectorOf = (id: string) => SECTORS.find(s => s.id === id) ?? SECTORS[0];

export const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return tr('hozir');
  if (m < 60) return tr('{n} daq oldin', { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return tr('{n} soat oldin', { n: h });
  const dd = Math.round(h / 24);
  return dd < 30 ? tr('{n} kun oldin', { n: dd }) : fmtDay(iso);
};

export const fileSize = (b?: number) => (!b ? '' : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/** Matnda taqiqlangan iboralar bormi — joylashdan oldin ogohlantirish (yakuniy qarorni server beradi) */
export const flagged = (...texts: string[]) => {
  const t = texts.join(' ').toLowerCase();
  return BANNED_WORDS.filter(w => t.includes(w));
};

/* ---------- Turlar ---------- */

export type CartLine = { id: string; qty: number };

/** Reklama kampaniyasi; banner — 2:1 rasm (data: URI) */
export type Ad = { id: string; title: string; budget: number; status: 'review' | 'active' | 'rejected'; image?: string };

export type ProjectInput = papi.ProjectInputApi;
export type MarketInput = papi.MarketInputApi;
export type PeerInfo = { peerId: string; peerName: string; peerKind: PeerKind; peerVerified: boolean };

type Ctx = {
  ready: boolean;
  companies: Company[];
  specialists: Specialist[];
  investors: Investor[];
  /** Katalogdagi loyihalar va mening loyihalarim (ekranlar id bo'yicha shu ro'yxatdan topadi) */
  projects: Project[];
  market: MarketItem[];
  publicProjects: Project[];
  publicMarket: MarketItem[];
  myProjects: Project[];
  myMarket: MarketItem[];
  conversations: Conversation[];
  meetings: Meeting[];
  reports: Report[];
  verifications: Verification[];
  /** Moderator uchun: tekshiruvdagi reklama kampaniyalari */
  reviewAds: papi.AdDto[];
  notices: Notice[];
  security: SecurityEvent[];
  favorites: string[];
  blocked: string[];
  plan: Plan;
  planUntil?: string;
  boostCredits: number;
  /** Tariflar narxi (USD va so'm) va TOP narxi */
  planList: PlanInfo[];
  pricing: MyPlan | null;
  twoFactor: boolean;
  ads: Ad[];
  cart: CartLine[];
  myVerification?: Verification;
  isVerified: boolean;
  unread: number;
  unreadNotices: number;
  isBlocked: (kind: ReportTarget, id: string) => boolean;
  /** Katalog profiliga javob beradigan akkaunt (o'z profilimmi — shu bilan bilinadi) */
  ownerOf: (profileId: string) => string | undefined;
  /** Ekran ochilganda ma'lumotlarni qayta o'qish */
  refresh: () => Promise<void>;
  /** Bitta loyihani (ilovalari bilan) yuklash */
  loadProject: (id: string) => Promise<Project | null>;

  saveProject: (input: ProjectInput, opts: { id?: string; submit: boolean }) => Promise<string | null>;
  deleteProject: (id: string) => void;
  /** Egasi faol loyihani vaqtincha yashiradi (Nofaol) yoki qayta yoqadi */
  setProjectActive: (id: string, active: boolean) => void;
  submitProject: (id: string) => void;
  boostProject: (id: string) => Promise<'credit' | 'paid' | null>;
  viewProject: (id: string) => void;
  addMarketItem: (input: MarketInput) => Promise<string | null>;
  deleteMarketItem: (id: string) => void;
  moderate: (kind: 'project' | 'market' | 'ad', id: string, approve: boolean, reason?: string) => void;

  /** Savat */
  cartItems: { item: MarketItem; qty: number }[];
  cartCount: number;
  cartQty: (id: string) => number;
  setCartQty: (id: string, qty: number) => void;
  clearCart: () => void;
  isFav: (key: string) => boolean;
  toggleFav: (key: string) => boolean;

  report: (r: Pick<Report, 'targetKind' | 'targetId' | 'targetTitle' | 'reason' | 'note'>) => void;
  resolveReport: (id: string, action: 'dismiss' | 'block') => void;

  requestVerification: (files: { name: string; uri: string; mime?: string }[]) => Promise<boolean>;
  decideVerification: (id: string, approve: boolean, reason?: string) => void;

  openChat: (peer: PeerInfo, opts?: { subject?: string; request?: boolean; text?: string }) => Promise<string | null>;
  /** Suhbat xabarlarini serverdan yuklash */
  loadMessages: (cid: string) => Promise<void>;
  sendMessage: (cid: string, text: string, file?: Attachment) => void;
  markRead: (cid: string) => void;
  respondRequest: (cid: string, accept: boolean) => void;
  toggleBlockChat: (cid: string) => void;
  scheduleMeeting: (cid: string, at: Date, title: string, durationMin: number) => void;
  cancelMeeting: (id: string) => void;

  markNoticesRead: () => void;
  setPlan: (p: Plan, yearly: boolean) => Promise<boolean>;
  setTwoFactor: (on: boolean) => Promise<boolean>;
  createAd: (title: string, budget: number, image?: string) => Promise<boolean>;
  exportData: () => Promise<string | null>;
  resetPlatform: () => void;
};

const PCtx = createContext<Ctx | null>(null);

export const usePlatform = () => {
  const c = useContext(PCtx);
  if (!c) throw new Error('usePlatform PlatformProvider ichida ishlatilishi kerak');
  return c;
};

const CART_KEY = 'yp:cart';
const REFRESH_MS = 60_000;
const EVENT_TEXT: Record<ServerSecurityEvent['event'], string> = {
  SIGN_IN: tx('Tizimga kirish'), SIGN_IN_FAILED: tx("Kirish urinishi (noto'g'ri kod)"), SIGN_OUT: tx('Tizimdan chiqish'),
  TWO_FACTOR_ON: tx('2FA yoqildi'), TWO_FACTOR_OFF: tx("2FA o'chirildi"), DATA_EXPORTED: tx("Ma'lumotlar nusxasi eksport qilindi"),
};
const fail = (error: unknown) => toast(errorText(error), 'alert-circle');
const byId = <T extends { id: string }>(list: T[]) => new Map(list.map(x => [x.id, x]));

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { user, adoptUser } = useStore();
  const [ready, setReady] = useState(false);
  const [directory, setDirectory] = useState<papi.Directory>({ companies: [], specialists: [], investors: [], owners: {} });
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [opened, setOpened] = useState<Record<string, Project>>({});
  const [publicMarket, setPublicMarket] = useState<MarketItem[]>([]);
  const [myMarket, setMyMarket] = useState<MarketItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [queue, setQueue] = useState<papi.ModerationQueue | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [security, setSecurity] = useState<SecurityEvent[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [pricing, setPricing] = useState<MyPlan | null>(null);
  const [planList, setPlanList] = useState<PlanInfo[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [myVerification, setMyVerification] = useState<Verification | undefined>(undefined);
  const convRef = useRef(conversations);
  useEffect(() => { convRef.current = conversations; }, [conversations]);

  const me = user?.id;
  const moderator = user?.role === 'moderator' || user?.role === 'admin';

  /* ---------- Yuklash ---------- */
  const loadChats = useCallback(async () => {
    const rows = await papi.conversations();
    setConversations(cur => {
      const known = byId(cur);
      // ochilgan suhbatlarning xabarlari saqlanadi, ro'yxat ma'lumoti yangilanadi
      return rows.map(r => {
        const prev = known.get(r.id);
        const next = papi.toConversation(r);
        return prev && prev.messages.length > 1 ? { ...next, messages: prev.messages } : next;
      });
    });
  }, []);

  const loadListings = useCallback(async () => {
    const [pp, mp, pm, mm, fav] = await Promise.all([papi.publishedProjects(), papi.myProjects(), papi.publishedMarket(), papi.myMarket(), papi.favorites()]);
    setPublicProjects(pp); setMyProjects(mp); setPublicMarket(pm); setMyMarket(mm); setFavorites(fav);
  }, []);

  const loadAccount = useCallback(async () => {
    const [n, plan, plist, adList, verification, log, meet] = await Promise.all([
      papi.inbox(), papi.myPlan(), papi.plans(), papi.myAds(), papi.myVerification(), securityEvents(), papi.meetings(),
    ]);
    setNotices(n);
    setPricing(plan);
    setPlanList(plist);
    setAds(adList.map(a => ({ id: a.id, title: a.title, budget: a.budgetUsd, image: a.image, status: a.status === 'ACTIVE' ? 'active' : a.status === 'REJECTED' ? 'rejected' : 'review' })));
    setMyVerification(verification);
    setSecurity(log.map(e => ({ id: e.id, at: e.at, event: tr(EVENT_TEXT[e.event]), device: e.device ?? '—', ok: e.ok })));
    setMeetings(meet);
  }, []);

  const loadQueue = useCallback(async () => {
    if (!moderator) { setQueue(null); return; }
    setQueue(await papi.moderationQueue());
  }, [moderator]);

  const refresh = useCallback(async () => {
    await Promise.all([
      papi.loadDirectory().then(setDirectory),
      loadListings(),
      loadChats(),
      loadAccount(),
      loadQueue(),
    ].map(p => p.catch(() => {})));
    setReady(true);
  }, [loadListings, loadChats, loadAccount, loadQueue]);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then(v => { if (v) setCart(JSON.parse(v)); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    startRealtime();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- server javobi kelgach yangilanadi
    refresh().catch(() => {});
    const iv = setInterval(() => { loadAccount().catch(() => {}); loadQueue().catch(() => {}); }, REFRESH_MS);
    const offs = [
      onRealtime<{ id: string; conversationId: string; from: 'ME' | 'THEM' | 'SYSTEM'; text: string; createdAt: string; meetingId?: string; file?: { name: string; data?: string } }>('chat.message', m => {
        const msg = papi.toMessage(m);
        const known = convRef.current.some(c => c.id === m.conversationId);
        if (!known) { loadChats().catch(() => {}); return; }
        setConversations(cs => cs.map(c => (c.id === m.conversationId ? { ...c, unread: c.unread + 1, messages: [...c.messages.filter(x => x.id !== msg.id), msg] } : c)));
      }),
      onRealtime<{ conversationId: string }>('chat.updated', () => {
        loadChats().catch(() => {});
        papi.meetings().then(setMeetings).catch(() => {});
      }),
    ];
    return () => { clearInterval(iv); offs.forEach(off => off()); };
  }, [me, refresh, loadAccount, loadQueue, loadChats]);

  /* ---------- Hosilalar ---------- */
  const projects = useMemo(() => {
    const all = byId(publicProjects);
    // moderator navbatidagi (boshqalarning) loyihalar ham id bo'yicha ochiladi
    for (const p of queue?.projects ?? []) all.set(p.id, p);
    for (const p of myProjects) all.set(p.id, p);
    for (const p of Object.values(opened)) all.set(p.id, { ...all.get(p.id), ...p });
    return [...all.values()];
  }, [publicProjects, myProjects, opened, queue]);
  const market = useMemo(() => {
    const all = byId(publicMarket);
    for (const m of queue?.market ?? []) all.set(m.id, m);
    for (const m of myMarket) all.set(m.id, m);
    return [...all.values()];
  }, [publicMarket, myMarket, queue]);
  const cartItems = useMemo(() => cart.flatMap(l => {
    const item = market.find(m => m.id === l.id && m.status === 'published');
    return item ? [{ item, qty: l.qty }] : [];
  }), [cart, market]);

  const saveCart = (next: CartLine[]) => { setCart(next); AsyncStorage.setItem(CART_KEY, JSON.stringify(next)).catch(() => {}); };
  const upsertMine = (p: Project) => {
    setMyProjects(list => [p, ...list.filter(x => x.id !== p.id)]);
    setOpened(o => ({ ...o, [p.id]: p }));
    if (p.status === 'published') setPublicProjects(list => [p, ...list.filter(x => x.id !== p.id)]);
    else setPublicProjects(list => list.filter(x => x.id !== p.id));
  };

  const plan: Plan = (pricing?.plan as Plan | undefined) ?? 'free';

  const ctxValue: Ctx = {
    ready,
    companies: directory.companies,
    specialists: directory.specialists,
    investors: directory.investors,
    projects, market, publicProjects, publicMarket, myProjects, myMarket,
    conversations, meetings,
    reports: queue?.reports ?? [],
    verifications: queue?.verifications ?? [],
    reviewAds: queue?.ads ?? [],
    notices, security, favorites,
    blocked: [],
    plan, planUntil: pricing?.until, boostCredits: pricing?.boostCredits ?? 0, planList, pricing,
    twoFactor: !!user?.twoFactor,
    ads, cart, myVerification,
    isVerified: !!user?.registryVerified,
    unread: conversations.reduce((n, c) => n + (c.blocked ? 0 : c.unread), 0),
    unreadNotices: notices.filter(n => !n.read).length,
    isBlocked: () => false,
    ownerOf: id => directory.owners[id],
    refresh,
    loadProject: async id => {
      try {
        const p = await papi.projectById(id);
        setOpened(o => ({ ...o, [id]: p }));
        return p;
      } catch {
        return null;
      }
    },

    saveProject: async (input, { id, submit }) => {
      try {
        const p = id ? await papi.updateProject(id, input, submit) : await papi.createProject(input, submit);
        upsertMine(p);
        return p.id;
      } catch (error) {
        fail(error);
        return null;
      }
    },
    deleteProject: id => {
      papi.deleteProject(id)
        .then(() => {
          setMyProjects(l => l.filter(x => x.id !== id));
          setPublicProjects(l => l.filter(x => x.id !== id));
          setFavorites(f => f.filter(k => k !== `project:${id}`));
        })
        .catch(fail);
    },
    setProjectActive: (id, active) => { papi.setProjectActive(id, active).then(upsertMine).catch(fail); },
    submitProject: id => { papi.submitProject(id).then(upsertMine).catch(fail); },
    boostProject: async id => {
      try {
        const r = await papi.boostProject(id);
        upsertMine(r.project);
        papi.myPlan().then(setPricing).catch(() => {});
        return r.paidWith === 'CREDIT' ? 'credit' : 'paid';
      } catch (error) {
        fail(error);
        return null;
      }
    },
    viewProject: id => { papi.viewProject(id).catch(() => {}); },
    addMarketItem: async input => {
      try {
        const m = await papi.createMarketItem(input);
        setMyMarket(l => [m, ...l]);
        if (m.status === 'published') setPublicMarket(l => [m, ...l]);
        return m.id;
      } catch (error) {
        fail(error);
        return null;
      }
    },
    deleteMarketItem: id => {
      papi.deleteMarketItem(id).then(() => { setMyMarket(l => l.filter(x => x.id !== id)); setPublicMarket(l => l.filter(x => x.id !== id)); }).catch(fail);
    },
    moderate: (kind, id, approve, reason) => {
      papi.decide(kind === 'project' ? 'projects' : kind === 'market' ? 'market' : 'ads', id, approve, reason)
        .then(() => Promise.all([loadQueue(), kind === 'ad' ? loadAccount() : loadListings()]))
        .catch(fail);
    },

    cartItems,
    cartCount: cartItems.reduce((n, x) => n + x.qty, 0),
    cartQty: id => cart.find(x => x.id === id)?.qty ?? 0,
    setCartQty: (id, qty) => {
      const rest = cart.filter(l => l.id !== id);
      if (qty <= 0) { saveCart(rest); return; }
      const line = { id, qty: Math.min(999, Math.round(qty)) };
      saveCart(cart.some(l => l.id === id) ? cart.map(l => (l.id === id ? line : l)) : [...cart, line]);
    },
    clearCart: () => saveCart([]),
    isFav: key => favorites.includes(key),
    toggleFav: key => {
      const on = !favorites.includes(key);
      setFavorites(f => (on ? [key, ...f] : f.filter(x => x !== key)));
      papi.setFavorite(key, on).catch(error => { fail(error); setFavorites(f => (on ? f.filter(x => x !== key) : [key, ...f])); });
      return on;
    },

    report: r => { papi.report(r).then(() => loadQueue().catch(() => {})).catch(fail); },
    resolveReport: (id, action) => { papi.resolveReport(id, action).then(() => Promise.all([loadQueue(), loadListings(), papi.loadDirectory().then(setDirectory)])).catch(fail); },

    requestVerification: async files => {
      try {
        setMyVerification(await papi.requestVerification(files));
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
    decideVerification: (id, approve, reason) => {
      papi.decide('verifications', id, approve, approve ? undefined : reason ?? tr("Hujjatlar aniq ko'rinmadi yoki ma'lumotlar mos kelmadi")).then(() => loadQueue()).catch(fail);
    },

    openChat: async (peer, opts = {}) => {
      // katalog profili bo'lsa — profil egasi bilan, aks holda foydalanuvchining o'zi bilan
      const target = directory.owners[peer.peerId] ? { profileId: peer.peerId } : { userId: peer.peerId };
      try {
        const c = await papi.openConversation(target, opts);
        const conv = papi.toConversation(c);
        setConversations(cs => [conv, ...cs.filter(x => x.id !== conv.id)]);
        return conv.id;
      } catch (error) {
        fail(error);
        return null;
      }
    },
    loadMessages: async cid => {
      try {
        const list = await papi.messages(cid);
        setConversations(cs => cs.map(c => (c.id === cid ? { ...c, messages: list } : c)));
      } catch (error) {
        fail(error);
      }
    },
    sendMessage: (cid, text, file) => {
      if (file?.size && file.size > papi.FILE_LIMIT) { toast(tr('Fayl juda katta — 1 MB gacha yuboring'), 'alert-circle'); return; }
      papi.sendMessage(cid, text, file)
        .then((m: Message) => setConversations(cs => cs.map(c => (c.id === cid ? { ...c, messages: [...c.messages, m] } : c))))
        .catch(fail);
    },
    markRead: cid => {
      if (!convRef.current.find(c => c.id === cid)?.unread) return;
      setConversations(cs => cs.map(c => (c.id === cid ? { ...c, unread: 0 } : c)));
      papi.markRead(cid).catch(() => {});
    },
    respondRequest: (cid, accept) => {
      papi.respond(cid, accept).then(() => Promise.all([loadChats(), papi.messages(cid).then(list => setConversations(cs => cs.map(c => (c.id === cid ? { ...c, messages: list } : c))))])).catch(fail);
    },
    toggleBlockChat: cid => {
      const c = convRef.current.find(x => x.id === cid);
      if (!c) return;
      papi.setBlocked(cid, !c.blocked).then(() => loadChats()).catch(fail);
    },
    scheduleMeeting: (cid, at, title, durationMin) => {
      papi.scheduleMeeting(cid, at, title, durationMin)
        .then(m => { setMeetings(ms => [...ms, m].sort((a, b) => a.at.localeCompare(b.at))); return papi.messages(cid); })
        .then(list => setConversations(cs => cs.map(c => (c.id === cid ? { ...c, messages: list } : c))))
        .catch(fail);
    },
    cancelMeeting: id => { papi.cancelMeeting(id).then(m => setMeetings(ms => ms.map(x => (x.id === id ? m : x)))).catch(fail); },

    markNoticesRead: () => {
      if (!notices.some(n => !n.read)) return;
      setNotices(ns => ns.map(n => ({ ...n, read: true })));
      papi.markInboxRead().catch(() => {});
    },
    setPlan: async (p, yearly) => {
      try {
        setPricing(await papi.subscribe(p, yearly));
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
    setTwoFactor: async on => {
      try {
        adoptUser(await saveTwoFactor(on));
        securityEvents().then(log => setSecurity(log.map(e => ({ id: e.id, at: e.at, event: tr(EVENT_TEXT[e.event]), device: e.device ?? '—', ok: e.ok })))).catch(() => {});
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
    createAd: async (title, budgetUsd, image) => {
      try {
        const a = await papi.createAd(title, budgetUsd, image);
        setAds(l => [{ id: a.id, title: a.title, budget: a.budgetUsd, image: a.image, status: 'review' }, ...l]);
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
    exportData: async () => {
      try {
        return JSON.stringify(await exportMyData(), null, 2);
      } catch (error) {
        fail(error);
        return null;
      }
    },
    resetPlatform: () => {
      setPublicProjects([]); setMyProjects([]); setPublicMarket([]); setMyMarket([]); setConversations([]); setMeetings([]);
      setQueue(null); setNotices([]); setSecurity([]); setFavorites([]); setPricing(null); setAds([]); saveCart([]); setMyVerification(undefined);
    },
  };

  return <PCtx.Provider value={ctxValue}>{children}</PCtx.Provider>;
}
