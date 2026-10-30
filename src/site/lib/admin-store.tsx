// Admin panel holati: kirish, server (yoki demo simulyatsiya) bilan ulanish, holatni yangilash, buyruqlar
// va har 2 soniyada qayta hisoblanadigan tahlil (ko'rsatkichlar, prognoz, tavsiyalar).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { toast } from '@/components/toast';
import { DispatchClient, DISPATCH_URL, type ConnState } from '@/lib/dispatch';

import type { Ack, AdminClientMsg, AdminCmd, AdminServerMsg, AdminState, OrderRec } from './admin-types';
import { adminLogin, EMPTY_CONFIG, LIVE } from './api';
import { DemoSim } from './demo-sim';
import { docQueue, health, hotspots, hourly, insights, kpis, summary, type Health, type Hotspot, type Hourly, type Insight, type Kpis } from './insights';

type Source = {
  on: (f: (m: AdminServerMsg) => void) => () => void;
  onState: (f: (s: ConnState) => void) => () => void;
  send: (m: AdminClientMsg) => void;
  close: () => void;
};

type Derived = { insights: Insight[]; kpis: Kpis; health: Health; summary: string; hourly: Hourly; spots: Hotspot[]; pendingDocs: number; at: number };

type Ctx = {
  mode: 'live' | 'demo';
  authed: boolean | null;
  login: (password: string) => Promise<string | null>;
  logout: () => void;
  conn: ConnState;
  state: AdminState;
  /** buyurtmalar vaqt bo'yicha (eskisi birinchi) */
  list: OrderRec[];
  run: (cmd: AdminCmd) => Promise<Ack>;
  derived: Derived | null;
};

const TOKEN_KEY = 'yums:admin:token';
const EMPTY: AdminState = { ready: false, at: '', drivers: {}, photos: {}, live: {}, orders: {}, leads: [], config: EMPTY_CONFIG, content: {}, log: [], rev: 0 };

function apply(s: AdminState, m: AdminServerMsg): AdminState {
  switch (m.t) {
    case 'admin:init':
      return {
        ready: true, at: m.at,
        drivers: Object.fromEntries(m.drivers.map(d => [d.id, d])), photos: m.photos ?? {},
        live: Object.fromEntries(m.live.map(l => [l.id, l])), orders: Object.fromEntries(m.orders.map(o => [o.id, o])),
        leads: m.leads, config: { ...EMPTY_CONFIG, ...m.config }, content: m.content ?? {}, log: m.log, rev: s.rev + 1,
      };
    case 'admin:live':
      return { ...s, at: m.at, live: Object.fromEntries(m.live.map(l => [l.id, l])), rev: s.rev + 1 };
    case 'admin:driver':
      return { ...s, drivers: { ...s.drivers, [m.driver.id]: m.driver }, rev: s.rev + 1 };
    case 'admin:photo': {
      const photos = { ...s.photos };
      if (m.photo) photos[m.id] = m.photo; else delete photos[m.id];
      return { ...s, photos, rev: s.rev + 1 };
    }
    case 'admin:order':
      return { ...s, orders: { ...s.orders, [m.order.id]: m.order }, rev: s.rev + 1 };
    case 'admin:lead': {
      const i = s.leads.findIndex(l => l.id === m.lead.id);
      const leads = i >= 0 ? s.leads.map(l => (l.id === m.lead.id ? m.lead : l)) : [...s.leads, m.lead];
      return { ...s, leads, rev: s.rev + 1 };
    }
    case 'admin:log':
      return { ...s, log: [...s.log.slice(-499), m.entry], rev: s.rev + 1 };
    case 'admin:config':
      return { ...s, config: { ...EMPTY_CONFIG, ...m.config }, rev: s.rev + 1 };
    case 'admin:content':
      return { ...s, content: m.content ?? {}, rev: s.rev + 1 };
    default:
      return s;
  }
}

const ACtx = createContext<Ctx | null>(null);
export const useAdmin = () => {
  const c = useContext(ACtx);
  if (!c) throw new Error('useAdmin must be inside AdminProvider');
  return c;
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<AdminState>(EMPTY);
  const [conn, setConn] = useState<ConnState>('off');
  const [source, setSource] = useState<Source | null>(null);
  const [derived, setDerived] = useState<Derived | null>(null);
  const pending = useRef(new Map<number, (a: Ack) => void>());
  const refSeq = useRef(0);

  // saqlangan kirish (12 soat amal qiladi)
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(v => {
      const t = v ? (JSON.parse(v) as { token: string; exp: number }) : null;
      setToken(t && t.exp > Date.now() && (LIVE ? t.token !== 'demo' : t.token === 'demo') ? t.token : null);
    }).catch(() => setToken(null));
  }, []);

  const logout = useCallback(() => {
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    setToken(null);
    setState(EMPTY);
    setDerived(null);
  }, []);

  // ulanish: server (token bilan) yoki demo simulyatsiya
  useEffect(() => {
    if (!token) return;
    const src: Source = LIVE
      ? new DispatchClient<AdminServerMsg, AdminClientMsg>('admin', 'panel', DISPATCH_URL, { token })
      : new DemoSim();
    const offMsg = src.on(m => {
      if (m.t === 'admin:ack') { pending.current.get(m.ref)?.(m); pending.current.delete(m.ref); return; }
      if (m.t === 'admin:denied') { toast('Sessiya tugadi — qayta kiring', 'lock-closed'); logout(); return; }
      setState(s => apply(s, m));
    });
    const offState = src.onState(setConn);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tashqi ulanish obyekti
    setSource(src);
    return () => { offMsg(); offState(); src.close(); setSource(null); };
  }, [token, logout]);

  const login = useCallback(async (password: string) => {
    const r = await adminLogin(password);
    if ('error' in r) return r.error;
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(r)).catch(() => {});
    setToken(r.token);
    return null;
  }, []);

  const run = useCallback((cmd: AdminCmd) => new Promise<Ack>(resolve => {
    if (!source) { resolve({ t: 'admin:ack', ref: -1, ok: false, error: "Server bilan aloqa yo'q" }); return; }
    const ref = ++refSeq.current;
    const timer = setTimeout(() => { pending.current.delete(ref); resolve({ t: 'admin:ack', ref, ok: false, error: 'Server javob bermadi' }); }, 8000);
    pending.current.set(ref, a => { clearTimeout(timer); resolve(a); });
    source.send({ t: 'admin', ref, ...cmd } as AdminClientMsg);
  }), [source]);

  const list = useMemo(() => Object.values(state.orders).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)), [state.orders]);

  // tahlil har 2 soniyada (har bir hodisada emas) qayta hisoblanadi
  const latest = useRef({ state, list });
  useEffect(() => { latest.current = { state, list }; }, [state, list]);
  const ready = state.ready;
  useEffect(() => {
    if (!ready) return;
    const compute = () => {
      const { state: s, list: l } = latest.current;
      const now = Date.now();
      const k = kpis(s, l, now);
      const pendingDocs = docQueue(s, new Date(now)).pending.length;
      setDerived({ insights: insights(s, l, now), kpis: k, health: health(s, k, pendingDocs), summary: summary(s, l, now), hourly: hourly(l, now), spots: hotspots(s, now), pendingDocs, at: now });
    };
    compute();
    const iv = setInterval(compute, 2000);
    return () => clearInterval(iv);
  }, [ready]);

  const value: Ctx = {
    mode: LIVE ? 'live' : 'demo', authed: token === undefined ? null : !!token, login, logout,
    conn: LIVE ? conn : 'online', state, list, run, derived,
  };
  return <ACtx.Provider value={value}>{children}</ACtx.Provider>;
}

/** Buyruqni bajarib, natijani qisqa xabar bilan ko'rsatish */
export function useRun() {
  const { run } = useAdmin();
  return useCallback(async (cmd: AdminCmd | AdminCmd[], done?: string) => {
    const list = Array.isArray(cmd) ? cmd : [cmd];
    let sent = 0;
    for (const c of list) {
      const a = await run(c);
      if (!a.ok) { toast(a.error ?? 'Bajarilmadi', 'alert-circle'); return false; }
      sent += a.sent ?? 0;
    }
    if (done) toast(list.some(c => c.cmd === 'notice') ? `${done} · ${sent} ta haydovchiga` : done, 'checkmark-circle');
    return true;
  }, [run]);
}
