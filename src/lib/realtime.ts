// Backend bilan jonli aloqa (Socket.IO, /realtime). Server tokeni tugaganda ulanishni yopadi —
// shunda token yangilanib, qayta ulanamiz. Socket — faqat signal: holatning o'zi REST'dan o'qiladi.
import { io, type Socket } from 'socket.io-client';

import { API_URL, accessToken, refreshSession } from './api';

type Handler = (payload: unknown) => void;

const ORIGIN = API_URL.replace(/\/api\/v\d+$/, '');
const RECONNECT_MS = 2000;

let socket: Socket | null = null;
let wanted = false;
let timer: ReturnType<typeof setTimeout> | null = null;
/** Server 'ready' yubordi va ulanish hali ochiq */
let ready = false;
const handlers = new Map<string, Set<Handler>>();
const connectListeners = new Set<() => void>();

function attach(s: Socket) {
  for (const [event, set] of handlers) for (const h of set) s.on(event, h);
}

async function open() {
  if (!wanted || socket) return;
  const token = await accessToken();
  if (!token || !wanted) return;
  const s = io(`${ORIGIN}/realtime`, { auth: { token }, transports: ['websocket'], reconnection: false });
  socket = s;
  attach(s);
  s.on('ready', () => { ready = true; connectListeners.forEach(fn => fn()); });
  // Token eskirgan yoki yaroqsiz — bir marta yangilab, qayta ulanamiz
  s.on('error', () => { refreshSession().catch(() => false); });
  s.on('disconnect', () => {
    ready = false;
    socket = null;
    s.removeAllListeners();
    if (!wanted) return;
    timer = setTimeout(() => { timer = null; open().catch(() => {}); }, RECONNECT_MS);
  });
  s.on('connect_error', () => {
    ready = false;
    socket = null;
    s.removeAllListeners();
    if (wanted) timer = setTimeout(() => { timer = null; open().catch(() => {}); }, RECONNECT_MS * 2);
  });
}

/** Kirgan foydalanuvchi uchun ulanishni boshlaydi (takroriy chaqiruv xavfsiz) */
export function startRealtime() {
  wanted = true;
  open().catch(() => {});
}

export function stopRealtime() {
  wanted = false;
  if (timer) clearTimeout(timer);
  timer = null;
  ready = false;
  socket?.disconnect();
  socket = null;
}

/** Hodisaga obuna; qaytgan funksiya obunani bekor qiladi */
export function onRealtime<T>(event: string, handler: (payload: T) => void): () => void {
  const h = handler as Handler;
  const set = handlers.get(event) ?? new Set<Handler>();
  set.add(h);
  handlers.set(event, set);
  socket?.on(event, h);
  return () => {
    set.delete(h);
    socket?.off(event, h);
  };
}

/**
 * Har bir (qayta) ulanishda — o'tkazib yuborilgan holatni REST'dan qayta o'qish uchun.
 * Ulanish allaqachon tayyor bo'lsa (uni boshqa provider ochgan), fn darhol bir marta chaqiriladi.
 */
export function onRealtimeReady(fn: () => void): () => void {
  connectListeners.add(fn);
  if (ready) queueMicrotask(() => { if (ready && connectListeners.has(fn)) fn(); });
  return () => { connectListeners.delete(fn); };
}
