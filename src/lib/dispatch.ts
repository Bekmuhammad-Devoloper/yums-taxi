// YUMS Taxi dispetcher protokoli va WebSocket klienti — yo'lovchi va haydovchi ilovalari uchun umumiy.
// Server manzili: EXPO_PUBLIC_DISPATCH_URL (masalan ws://192.168.1.10:8787). Berilmasa ilovalar demo rejimda ishlaydi.
import { useEffect, useState } from 'react';

import type { Driver, LatLng, PaymentId, Place } from './data';

export const DISPATCH_URL = process.env.EXPO_PUBLIC_DISPATCH_URL;

/** Haydovchiga taklif qilinadigan buyurtma */
export type OrderOffer = {
  id: string;
  passenger: { id?: string; name: string; phone?: string; rating: number };
  pickup: Place;
  destination: Place;
  route: { km: number; min: number; coords: LatLng[] };
  tariffId: string;
  price: number;
  /** Yuqori talab koeffitsienti (×1.4 va h.k.), narxga allaqachon qo'shilgan */
  surge?: number;
  payment: PaymentId;
  options: string[];
  comment: string;
  createdAt: string;
};

export type FleetCar = { id: string; pos: LatLng; heading: number; busy: boolean; tariffs: string[] };

/** Serverdan keladigan xabarlar */
export type ServerMsg =
  | { t: 'welcome'; role: 'driver' | 'passenger' }
  | { t: 'fleet'; drivers: FleetCar[] }
  // yo'lovchiga
  | { t: 'accepted'; orderId: string; driver: Driver; pos?: LatLng }
  | { t: 'driverPos'; orderId: string; pos: LatLng; heading?: number }
  | { t: 'arrived' | 'started' | 'finished'; orderId: string; price?: number }
  | { t: 'noDriver' | 'driverCancelled'; orderId: string }
  // haydovchiga
  | { t: 'offer'; order: OrderOffer; expiresIn: number; distanceKm: number }
  | { t: 'offerGone' | 'cancelled'; orderId: string }
  | { t: 'assigned'; order: OrderOffer; status?: string }
  | { t: 'rated'; orderId: string; stars: number; tip: number };

export type ClientMsg =
  | { t: 'online'; driver: Driver; pos?: LatLng; heading?: number; tariffs: string[] }
  | { t: 'offline' }
  | { t: 'pos'; pos: LatLng; heading?: number }
  | { t: 'accept' | 'decline' | 'arrived' | 'started' | 'cancel'; orderId: string }
  | { t: 'finished'; orderId: string; price: number }
  | { t: 'order'; order: OrderOffer }
  | { t: 'rate'; orderId: string; stars: number; tip: number };

export type ConnState = 'off' | 'connecting' | 'online';

/** Qayta ulanadigan WebSocket klienti */
export class DispatchClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<(m: ServerMsg) => void>();
  private stateListeners = new Set<(s: ConnState) => void>();
  private queue: ClientMsg[] = [];
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  state: ConnState = 'off';

  constructor(private role: 'driver' | 'passenger', private id: string, private url = DISPATCH_URL) {
    if (this.url) this.open();
  }

  get enabled() { return !!this.url; }

  private setState(s: ConnState) {
    this.state = s;
    this.stateListeners.forEach(f => f(s));
  }

  private open() {
    if (this.closed || !this.url) return;
    this.setState('connecting');
    let ws: WebSocket;
    try { ws = new WebSocket(this.url); } catch { this.reconnect(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ t: 'hello', role: this.role, id: this.id }));
      this.setState('online');
      const q = this.queue.splice(0);
      q.forEach(m => ws.send(JSON.stringify(m)));
    };
    ws.onmessage = e => {
      try {
        const m = JSON.parse(String(e.data)) as ServerMsg;
        this.listeners.forEach(f => f(m));
      } catch {
        // noto'g'ri xabar — e'tiborsiz
      }
    };
    ws.onclose = () => { this.ws = null; this.reconnect(); };
    ws.onerror = () => ws.close();
  }

  private reconnect() {
    if (this.closed) return;
    this.setState('connecting');
    const wait = Math.min(15000, 1000 * 2 ** this.retry++);
    this.timer = setTimeout(() => this.open(), wait);
  }

  send(m: ClientMsg) {
    if (!this.url) return;
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m));
    else if (m.t !== 'pos') this.queue.push(m); // joylashuvni navbatga qo'ymaymiz — eskiradi
  }

  on(f: (m: ServerMsg) => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  onState(f: (s: ConnState) => void) { this.stateListeners.add(f); return () => { this.stateListeners.delete(f); }; }

  close() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.setState('off');
  }
}

/** Ulanish holatini kuzatish */
export function useConnState(client: DispatchClient | null) {
  const [s, setS] = useState<ConnState>(client?.state ?? 'off');
  useEffect(() => {
    if (!client) return;
    return client.onState(setS);
  }, [client]);
  return client ? s : 'off';
}
