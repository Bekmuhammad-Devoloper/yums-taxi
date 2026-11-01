import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import {
  BANNED_WORDS, COUNTRIES, SECTORS, SEED_COMPANIES, SEED_CONVERSATIONS, SEED_INVESTORS, SEED_MARKET, SEED_NOTICES, SEED_PROJECTS,
  SEED_REPORTS, SEED_SPECIALISTS, SEED_VERIFICATIONS,
  type Attachment, type Conversation, type MarketItem, type Meeting, type Message, type Notice, type PeerKind, type Plan, type Project,
  type Report, type ReportTarget, type SecurityEvent, type Verification,
} from './platform-data';
import { useStore } from './store';
import { tr, tx } from '@/lib/i18n';
import { fmtDay } from '@/lib/format';
import { groupDigits } from '@/lib/geo';

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

/** Matnda taqiqlangan iboralar bormi — avtomatik moderatsiya uchun */
export const flagged = (...texts: string[]) => {
  const t = texts.join(' ').toLowerCase();
  return BANNED_WORDS.filter(w => t.includes(w));
};

/* ---------- Holat ---------- */

type State = {
  v: 1;
  projects: Project[];
  market: MarketItem[];
  conversations: Conversation[];
  meetings: Meeting[];
  reports: Report[];
  verifications: Verification[];
  notices: Notice[];
  security: SecurityEvent[];
  favorites: string[];
  blocked: string[];
  plan: Plan;
  planUntil?: string;
  boostCredits: number;
  twoFactor: boolean;
  ads: Ad[];
  /** Savat: e'lon va miqdor */
  cart: CartLine[];
};

export type CartLine = { id: string; qty: number };

/** Reklama kampaniyasi; banner — 2:1 rasm (data: URI) */
export type Ad = { id: string; title: string; budget: number; status: 'review' | 'active'; image?: string };

const device = () => (Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : tr('Veb-brauzer'));

const initial = (): State => ({
  v: 1,
  projects: SEED_PROJECTS,
  market: SEED_MARKET,
  conversations: SEED_CONVERSATIONS,
  meetings: [],
  reports: SEED_REPORTS,
  verifications: SEED_VERIFICATIONS,
  notices: SEED_NOTICES,
  security: [],
  favorites: ['project:p3'],
  blocked: [],
  plan: 'free',
  boostCredits: 0,
  twoFactor: false,
  ads: [],
  cart: [],
});

const KEY = 'yp:state';
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const now = () => new Date().toISOString();

export type ProjectInput = Omit<Project, 'id' | 'ownerId' | 'ownerName' | 'ownerKind' | 'ownerVerified' | 'status' | 'views' | 'saves' | 'createdAt' | 'rejectReason' | 'boosted'>;
export type MarketInput = Omit<MarketItem, 'id' | 'sellerId' | 'sellerName' | 'sellerVerified' | 'status' | 'createdAt'>;
export type PeerInfo = { peerId: string; peerName: string; peerKind: PeerKind; peerVerified: boolean };

type Ctx = State & {
  companies: typeof SEED_COMPANIES;
  specialists: typeof SEED_SPECIALISTS;
  investors: typeof SEED_INVESTORS;
  /** Katalogda ko'rinadigan (tasdiqlangan, bloklanmagan) loyihalar */
  publicProjects: Project[];
  publicMarket: MarketItem[];
  myProjects: Project[];
  myMarket: MarketItem[];
  myVerification?: Verification;
  isVerified: boolean;
  unread: number;
  unreadNotices: number;
  isBlocked: (kind: ReportTarget, id: string) => boolean;

  saveProject: (input: ProjectInput, opts: { id?: string; submit: boolean }) => string;
  deleteProject: (id: string) => void;
  /** Egasi faol loyihani vaqtincha yashiradi (Nofaol) yoki qayta yoqadi */
  setProjectActive: (id: string, active: boolean) => void;
  submitProject: (id: string) => void;
  boostProject: (id: string) => 'credit' | 'paid';
  viewProject: (id: string) => void;
  addMarketItem: (input: MarketInput) => string;
  deleteMarketItem: (id: string) => void;
  moderate: (kind: 'project' | 'market', id: string, approve: boolean, reason?: string) => void;

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

  requestVerification: (docs: string[]) => void;
  decideVerification: (id: string, approve: boolean) => void;

  openChat: (peer: PeerInfo, opts?: { subject?: string; request?: boolean; text?: string }) => string;
  sendMessage: (cid: string, text: string, file?: Attachment) => void;
  markRead: (cid: string) => void;
  respondRequest: (cid: string, accept: boolean) => void;
  toggleBlockChat: (cid: string) => void;
  scheduleMeeting: (cid: string, at: Date, title: string, durationMin: number) => void;
  cancelMeeting: (id: string) => void;

  markNoticesRead: () => void;
  logEvent: (event: string, ok?: boolean) => void;
  setPlan: (p: Plan, yearly: boolean) => void;
  setTwoFactor: (on: boolean) => void;
  createAd: (title: string, budget: number, image?: string) => void;
  exportData: () => string;
  resetPlatform: () => void;
};

const PCtx = createContext<Ctx | null>(null);

export const usePlatform = () => {
  const c = useContext(PCtx);
  if (!c) throw new Error('usePlatform PlatformProvider ichida ishlatilishi kerak');
  return c;
};

// demo suhbatdosh javoblari (yuborilgan paytda joriy tilda)
const AUTO_REPLIES = [
  tx('Rahmat, xabaringizni oldim! Tez orada batafsil javob beraman.'),
  tx("Qiziq taklif. Qo'shimcha ma'lumot yoki taqdimot yubora olasizmi?"),
  tx("Kelishdik. Qulay vaqtda onlayn uchrashuv belgilasak bo'ladi."),
  tx("Hujjatlarni ko'rib chiqib, ertaga qaytaman."),
];

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { user } = useStore();
  const [s, setS] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(v => {
        const saved = v ? (JSON.parse(v) as State) : null;
        if (saved?.v === 1) setS({ ...initial(), ...saved });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, [s, loaded]);

  const me = user?.id ?? 'me';
  const meName = user?.kind === 'company' && user.company ? user.company : user?.name ?? tr('Siz');

  const notice = (n: Omit<Notice, 'id' | 'at' | 'read'>) =>
    setS(x => ({ ...x, notices: [{ ...n, id: uid('n'), at: now(), read: false }, ...x.notices].slice(0, 40) }));

  const myVerification = s.verifications.find(v => v.isMe);
  const isVerified = myVerification?.status === 'approved';

  /* ---------- Avtomatik moderatsiya (demo) ----------
     Taqiqlangan iboralar bo'lmasa, e'lon bir necha soniyada tasdiqlanadi.
     Shubhali e'lonlar moderator paneliga tushadi va qo'lda ko'rib chiqiladi. */
  const autoReview = (kind: 'project' | 'market', id: string, texts: string[]) => {
    if (flagged(...texts).length) return;
    later(() => {
      let title = '';
      setS(x => {
        if (kind === 'project') {
          const p = x.projects.find(y => y.id === id);
          if (!p || p.status !== 'review') return x;
          title = p.title;
          return { ...x, projects: x.projects.map(y => (y.id === id ? { ...y, status: 'published' } : y)) };
        }
        const m = x.market.find(y => y.id === id);
        if (!m || m.status !== 'review') return x;
        title = m.title;
        return { ...x, market: x.market.map(y => (y.id === id ? { ...y, status: 'published' } : y)) };
      });
      later(() => title && notice({ icon: 'checkmark-circle', title: tr("Moderatsiyadan o'tdi"), text: tr("«{title}» katalogda e'lon qilindi", { title }), href: kind === 'project' ? `/project/${id}` : `/market/${id}` }), 50);
    }, 7000);
  };

  const saveProject: Ctx['saveProject'] = (input, { id, submit }) => {
    const pid = id ?? uid('p');
    // E'lon qilingan loyiha o'zgartirilsa — qayta moderatsiyadan o'tadi
    const review = submit || s.projects.find(p => p.id === pid)?.status === 'published';
    setS(x => {
      const prev = x.projects.find(p => p.id === pid);
      const p: Project = {
        ...input,
        id: pid,
        ownerId: me,
        ownerName: meName,
        ownerKind: user?.kind ?? 'person',
        ownerVerified: isVerified,
        status: review ? 'review' : 'draft',
        views: prev?.views ?? 0,
        saves: prev?.saves ?? 0,
        boosted: prev?.boosted,
        createdAt: prev?.createdAt ?? now(),
      };
      return { ...x, projects: prev ? x.projects.map(y => (y.id === pid ? p : y)) : [p, ...x.projects] };
    });
    if (review) autoReview('project', pid, [input.title, input.summary, input.description, input.goal]);
    return pid;
  };

  const submitProject = (id: string) => {
    const p = s.projects.find(x => x.id === id);
    if (!p) return;
    setS(x => ({ ...x, projects: x.projects.map(y => (y.id === id ? { ...y, status: 'review', rejectReason: undefined } : y)) }));
    autoReview('project', id, [p.title, p.summary, p.description, p.goal]);
  };

  const addMarketItem: Ctx['addMarketItem'] = input => {
    const id = uid('m');
    const item: MarketItem = { ...input, id, sellerId: me, sellerName: meName, sellerVerified: isVerified, status: 'review', createdAt: now() };
    setS(x => ({ ...x, market: [item, ...x.market] }));
    autoReview('market', id, [input.title, input.desc]);
    return id;
  };

  /** Xabar yuborilgandan keyingi demo javob: oddiy chatda — avto-javob, chiquvchi so'rovda — qabul qilinishi */
  const afterSend = (cid: string, c: Pick<Conversation, 'kind' | 'incoming' | 'requestStatus' | 'blocked' | 'peerName'>, firstMine: boolean) => {
    if (c.blocked) return;
    if (c.kind === 'request' && !c.incoming && c.requestStatus !== 'accepted') {
      if (!firstMine || c.requestStatus === 'declined') return;
      later(() => {
        setS(x => ({
          ...x,
          conversations: x.conversations.map(y => y.id === cid ? {
            ...y, requestStatus: 'accepted', unread: y.unread + 1,
            messages: [...y.messages, { id: uid('x'), from: 'system', text: tr("{peerName} hamkorlik so'rovingizni qabul qildi", { peerName: c.peerName }), at: now() }, { id: uid('x'), from: 'them', text: AUTO_REPLIES[1], at: now() }],
          } : y),
        }));
        notice({ icon: 'people', title: tr("So'rov qabul qilindi"), text: tr("{peerName} siz bilan bog'lanishga rozi", { peerName: c.peerName }), href: `/chat/${cid}` });
      }, 5000);
      return;
    }
    later(() => {
      setS(x => ({
        ...x,
        conversations: x.conversations.map(y => y.id === cid && !y.blocked
          ? { ...y, unread: y.unread + 1, messages: [...y.messages, { id: uid('x'), from: 'them', text: y.peerKind === 'support' ? tr('Murojaatingiz qabul qilindi. Operator 5 daqiqa ichida javob beradi.') : tr(AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]), at: now() }] }
          : y),
      }));
    }, 2600);
  };

  const openChat: Ctx['openChat'] = (peer, opts = {}) => {
    const existing = s.conversations.find(c => c.peerId === peer.peerId);
    const cid = existing?.id ?? uid('cv');
    const conv: Conversation = existing ?? {
      ...peer, id: cid, kind: opts.request ? 'request' : 'chat', incoming: false,
      requestStatus: opts.request ? 'pending' : undefined, subject: opts.subject, messages: [], unread: 0,
    };
    const first: Message[] = opts.text ? [{ id: uid('x'), from: 'me', text: opts.text, at: now() }] : [];
    setS(x => {
      const cur = x.conversations.find(c => c.id === cid) ?? conv;
      return { ...x, conversations: [{ ...cur, messages: [...cur.messages, ...first] }, ...x.conversations.filter(c => c.id !== cid)] };
    });
    if (opts.text) afterSend(cid, conv, !conv.messages.some(m => m.from === 'me'));
    return cid;
  };

  const sendMessage: Ctx['sendMessage'] = (cid, text, file) => {
    setS(x => ({
      ...x,
      conversations: x.conversations.map(c => (c.id === cid ? { ...c, messages: [...c.messages, { id: uid('x'), from: 'me', text, at: now(), file }] } : c)),
    }));
    const c = s.conversations.find(y => y.id === cid);
    if (c) afterSend(cid, c, !c.messages.some(m => m.from === 'me'));
  };

  const publicProjects = useMemo(() => s.projects.filter(p => p.status === 'published' && !s.blocked.includes('project:' + p.id)), [s.projects, s.blocked]);
  const publicMarket = useMemo(() => s.market.filter(p => p.status === 'published' && !s.blocked.includes('market:' + p.id)), [s.market, s.blocked]);
  // Savatdagi e'lonlar: o'chirilgan yoki yashirilganlari chiqarib tashlanadi
  const cartItems = useMemo(() => s.cart.flatMap(l => {
    const item = s.market.find(m => m.id === l.id && m.status === 'published' && !s.blocked.includes('market:' + m.id));
    return item ? [{ item, qty: l.qty }] : [];
  }), [s.cart, s.market, s.blocked]);
  const myProjects = useMemo(() => s.projects.filter(p => p.ownerId === me), [s.projects, me]);
  const myMarket = useMemo(() => s.market.filter(p => p.sellerId === me), [s.market, me]);
  const isBlocked = useCallback((kind: ReportTarget, id: string) => s.blocked.includes(`${kind}:${id}`), [s.blocked]);

  const ctxValue: Ctx = {
    ...s,
    companies: SEED_COMPANIES,
    specialists: SEED_SPECIALISTS,
    investors: SEED_INVESTORS,
    publicProjects,
    publicMarket,
    myProjects,
    myMarket,
    myVerification,
    isVerified,
    unread: s.conversations.reduce((n, c) => n + (c.blocked ? 0 : c.unread), 0),
    unreadNotices: s.notices.filter(n => !n.read).length,
    isBlocked,

    saveProject,
    setProjectActive: (id, active) => setS(x => ({
      ...x,
      projects: x.projects.map(p => (p.id === id && (p.status === 'published' || p.status === 'paused') ? { ...p, status: active ? 'published' : 'paused' } : p)),
    })),
    deleteProject: id => setS(x => ({ ...x, projects: x.projects.filter(p => p.id !== id), favorites: x.favorites.filter(f => f !== 'project:' + id) })),
    submitProject,
    boostProject: id => {
      const credit = s.boostCredits > 0;
      setS(x => ({ ...x, boostCredits: credit ? x.boostCredits - 1 : x.boostCredits, projects: x.projects.map(p => (p.id === id ? { ...p, boosted: true } : p)) }));
      return credit ? 'credit' : 'paid';
    },
    viewProject: id => setS(x => ({ ...x, projects: x.projects.map(p => (p.id === id && p.ownerId !== me ? { ...p, views: p.views + 1 } : p)) })),
    addMarketItem,
    deleteMarketItem: id => setS(x => ({ ...x, market: x.market.filter(m => m.id !== id) })),
    moderate: (kind, id, approve, reason) => {
      setS(x => kind === 'project'
        ? { ...x, projects: x.projects.map(p => (p.id === id ? { ...p, status: approve ? 'published' : 'rejected', rejectReason: approve ? undefined : reason } : p)) }
        : { ...x, market: x.market.map(m => (m.id === id ? { ...m, status: approve ? 'published' : 'rejected' } : m)) });
    },

    cartItems,
    cartCount: cartItems.reduce((n, x) => n + x.qty, 0),
    cartQty: id => s.cart.find(x => x.id === id)?.qty ?? 0,
    setCartQty: (id, qty) => setS(x => {
      const rest = x.cart.filter(l => l.id !== id);
      if (qty <= 0) return { ...x, cart: rest };
      const at = x.cart.findIndex(l => l.id === id);
      const line = { id, qty: Math.min(999, Math.round(qty)) };
      return { ...x, cart: at < 0 ? [...x.cart, line] : x.cart.map(l => (l.id === id ? line : l)) };
    }),
    clearCart: () => setS(x => ({ ...x, cart: [] })),
    isFav: key => s.favorites.includes(key),
    toggleFav: key => {
      const on = !s.favorites.includes(key);
      setS(x => ({ ...x, favorites: on ? [key, ...x.favorites] : x.favorites.filter(f => f !== key) }));
      return on;
    },

    report: r => setS(x => ({ ...x, reports: [{ ...r, id: uid('rp'), by: meName, status: 'open', createdAt: now() }, ...x.reports] })),
    resolveReport: (id, action) => setS(x => {
      const r = x.reports.find(y => y.id === id);
      if (!r) return x;
      const key = `${r.targetKind}:${r.targetId}`;
      const block = action === 'block';
      return {
        ...x,
        reports: x.reports.map(y => (y.targetKind === r.targetKind && y.targetId === r.targetId && y.status === 'open') || y.id === id
          ? { ...y, status: block ? 'resolved' : 'dismissed', action: block ? tr('Kontent bloklandi') : tr('Asos topilmadi') } : y),
        blocked: block && !x.blocked.includes(key) ? [...x.blocked, key] : x.blocked,
        projects: block && r.targetKind === 'project' ? x.projects.map(p => (p.id === r.targetId ? { ...p, status: 'blocked' } : p)) : x.projects,
        market: block && r.targetKind === 'market' ? x.market.map(m => (m.id === r.targetId ? { ...m, status: 'blocked' } : m)) : x.market,
      };
    }),

    requestVerification: docs => {
      setS(x => ({
        ...x,
        verifications: [
          { id: uid('v'), name: meName, kind: user?.kind ?? 'person', country: user?.country ?? 'UZ', docs, status: 'pending', isMe: true, createdAt: now() },
          ...x.verifications.filter(v => !v.isMe),
        ],
      }));
    },
    decideVerification: (id, approve) => {
      const v = s.verifications.find(x => x.id === id);
      setS(x => ({
        ...x,
        verifications: x.verifications.map(y => (y.id === id ? { ...y, status: approve ? 'approved' : 'rejected' } : y)),
        projects: v?.isMe && approve ? x.projects.map(p => (p.ownerId === me ? { ...p, ownerVerified: true } : p)) : x.projects,
      }));
      if (v?.isMe) notice({ icon: approve ? 'shield-checkmark' : 'alert-circle', title: approve ? tr('Profil tasdiqlandi') : tr('Tasdiqlash rad etildi'), text: approve ? tr("Profilingizda «Tasdiqlangan» belgisi paydo bo'ldi") : tr("Hujjatlar aniq ko'rinmadi — qayta yuboring"), href: '/verify' });
    },

    openChat,
    sendMessage,
    markRead: cid => setS(x => (x.conversations.some(c => c.id === cid && c.unread) ? { ...x, conversations: x.conversations.map(c => (c.id === cid ? { ...c, unread: 0 } : c)) } : x)),
    respondRequest: (cid, accept) => setS(x => ({
      ...x,
      conversations: x.conversations.map(c => (c.id === cid ? {
        ...c, requestStatus: accept ? 'accepted' : 'declined',
        messages: [...c.messages, { id: uid('x'), from: 'system', text: accept ? tr("Siz so'rovni qabul qildingiz — endi yozishishingiz mumkin") : tr("So'rov rad etildi"), at: now() }],
      } : c)),
    })),
    toggleBlockChat: cid => setS(x => ({ ...x, conversations: x.conversations.map(c => (c.id === cid ? { ...c, blocked: !c.blocked } : c)) })),
    scheduleMeeting: (cid, at, title, durationMin) => {
      const c = s.conversations.find(y => y.id === cid);
      const id = uid('mt');
      const meeting: Meeting = { id, convId: cid, title, with: c?.peerName ?? '', at: at.toISOString(), durationMin, link: `https://meet.yums.example/${id}`, status: 'scheduled' };
      setS(x => ({
        ...x,
        meetings: [...x.meetings, meeting].sort((a, b) => a.at.localeCompare(b.at)),
        conversations: x.conversations.map(y => (y.id === cid ? { ...y, messages: [...y.messages, { id: uid('x'), from: 'me', text: title, at: now(), meetingId: id }] } : y)),
      }));
    },
    cancelMeeting: id => setS(x => ({ ...x, meetings: x.meetings.map(m => (m.id === id ? { ...m, status: 'cancelled' } : m)) })),

    markNoticesRead: () => setS(x => ({ ...x, notices: x.notices.map(n => ({ ...n, read: true })) })),
    logEvent: (event, ok = true) => setS(x => ({ ...x, security: [{ id: uid('se'), at: now(), event, device: device(), ok }, ...x.security].slice(0, 30) })),
    setPlan: (plan, yearly) => {
      const until = new Date();
      until.setMonth(until.getMonth() + (yearly ? 12 : 1));
      setS(x => ({ ...x, plan, planUntil: plan === 'free' ? undefined : until.toISOString(), boostCredits: plan === 'free' ? 0 : plan === 'pro' ? 2 : 5 }));
    },
    setTwoFactor: on => setS(x => ({ ...x, twoFactor: on })),
    createAd: (title, b, image) => {
      const id = uid('ad');
      setS(x => ({ ...x, ads: [{ id, title, budget: b, status: 'review', image }, ...x.ads] }));
      later(() => setS(x => ({ ...x, ads: x.ads.map(a => (a.id === id ? { ...a, status: 'active' } : a)) })), 6000);
    },
    exportData: () => JSON.stringify({
      exportedAt: now(),
      account: user,
      projects: s.projects.filter(p => p.ownerId === me),
      market: s.market.filter(m => m.sellerId === me),
      favorites: s.favorites,
      conversations: s.conversations.map(c => ({ with: c.peerName, messages: c.messages.length })),
      meetings: s.meetings,
      plan: s.plan,
      security: s.security,
    }, null, 2),
    resetPlatform: () => { timers.current.forEach(clearTimeout); setS(initial()); },
  };

  return <PCtx.Provider value={ctxValue}>{children}</PCtx.Provider>;
}
