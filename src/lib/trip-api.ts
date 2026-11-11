// Yo'lovchi safari backendda: narx (quote), buyurtma, haydovchi, tarix, manzillar, promokod.
// Holatni server boshqaradi; ilova uni ko'rsatadi. Shartnoma: backend docs/MOBILE-INTEGRATION.md §4.
import { api } from './api';
import type { Driver, LatLng, PaymentId, Place, Ride } from './data';
import { decodePolyline } from './geo';

export type ServerStatus = 'SEARCHING' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type Method = 'CASH' | 'BALANCE' | 'CARD';
type Actor = 'PASSENGER' | 'DRIVER' | 'SYSTEM' | 'ADMIN';

type PlaceDto = { id?: string; title: string; subtitle?: string; latitude: number; longitude: number };
type DriverCardDto = { id: string; name: string; rating: number; trips: number; car: string; color: string; plate: string; phone: string };

export type ServerOrder = {
  id: string;
  orderNumber: string;
  status: ServerStatus;
  tariffId: string;
  pickup: PlaceDto;
  destination: PlaceDto;
  route: { distanceKm: number; durationMin: number; polyline: string };
  approachPolyline?: string;
  price: number;
  discount: number;
  finalPrice: number;
  waitFee: number;
  /** Haydovchi boshqa safarni tugatib kelyapti (etaMin shuni ham hisoblaydi) */
  chained: boolean;
  promoCode?: string;
  paymentMethod: Method;
  cardId?: string;
  options: string[];
  comment?: string;
  driver?: DriverCardDto;
  driverLocation?: { latitude: number; longitude: number; bearing: number };
  etaMin?: number;
  arrivedAt?: string;
  freeWaitSec: number;
  tip: number;
  rating?: number;
  ratingTags: string[];
  cancelledBy?: Actor;
  cancelReason?: string;
  createdAt: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
};

export type DriverLocation = { orderId: string; latitude: number; longitude: number; bearing: number; etaMin: number };

export type Quote = {
  id: string;
  expiresAt: string;
  surge: number;
  route: { km: number; min: number; coords: LatLng[] };
  prices: Record<string, { price: number; pickupEtaMin: number }>;
};

type QuoteDto = {
  id: string;
  expiresAt: string;
  surge: number;
  route: { distanceKm: number; durationMin: number; polyline: string };
  tariffs: { tariffId: string; price: number; pickupEtaMin: number }[];
};

export type NearbyCar = { id: string; pos: LatLng; heading: number };

const toPlaceDto = (p: Place): PlaceDto => ({
  title: p.title,
  subtitle: p.subtitle || undefined,
  latitude: Math.round(p.latitude * 1e6) / 1e6,
  longitude: Math.round(p.longitude * 1e6) / 1e6,
});
export const fromPlaceDto = (p: PlaceDto): Place => ({ id: p.id, title: p.title, subtitle: p.subtitle, latitude: p.latitude, longitude: p.longitude });

export const toDriver = (d: DriverCardDto): Driver => ({
  id: d.id, name: d.name, rating: d.rating, trips: d.trips, car: d.car, color: d.color, plate: d.plate, phone: d.phone,
});

const METHOD: Record<PaymentId, Method> = { cash: 'CASH', balance: 'BALANCE', card: 'CARD' };
const PAYMENT: Record<Method, PaymentId> = { CASH: 'cash', BALANCE: 'balance', CARD: 'card' };
export const paymentOf = (m: Method): PaymentId => PAYMENT[m];

export async function quote(pickup: Place, destination: Place): Promise<Quote> {
  const q = await api<QuoteDto>('POST', '/quotes', { pickup: toPlaceDto(pickup), destination: toPlaceDto(destination) });
  return {
    id: q.id,
    expiresAt: q.expiresAt,
    surge: q.surge,
    route: { km: q.route.distanceKm, min: q.route.durationMin, coords: decodePolyline(q.route.polyline) },
    prices: Object.fromEntries(q.tariffs.map(t => [t.tariffId, { price: t.price, pickupEtaMin: t.pickupEtaMin }])),
  };
}

export type OrderInput = {
  quoteId: string;
  tariffId: string;
  payment: PaymentId;
  cardId?: string;
  options: string[];
  comment: string;
  promoCode?: string;
};

export const placeOrder = (o: OrderInput) =>
  api<ServerOrder>('POST', '/orders', {
    quoteId: o.quoteId,
    tariffId: o.tariffId,
    paymentMethod: METHOD[o.payment],
    cardId: o.payment === 'card' ? o.cardId : undefined,
    options: o.options.length ? o.options : undefined,
    comment: o.comment.trim() || undefined,
    promoCode: o.promoCode,
  });

export const activeOrder = () => api<ServerOrder | null>('GET', '/orders/active');
export const cancelOrder = (id: string) => api<ServerOrder>('POST', `/orders/${id}/cancel`, {});
export const rateOrder = (id: string, stars: number, tip: number, tags: string[] = []) =>
  api<ServerOrder>('POST', `/orders/${id}/rate`, { stars, tip: tip || undefined, tags: tags.length ? tags : undefined });
/** Haydovchiga qisqa xabar (safar davomida) */
export const messageDriver = (id: string, text: string) => api<void>('POST', `/orders/${id}/message`, { text });
export const raiseSos = (id: string, at?: LatLng) => api<unknown>('POST', `/orders/${id}/sos`, at ?? {});

type SummaryDto = {
  id: string; orderNumber: string; status: ServerStatus; tariffId: string; pickup: PlaceDto; destination: PlaceDto;
  fare: number; tip: number; totalPaid: number; distanceKm: number; durationMin: number; paymentMethod: Method;
  driver?: DriverCardDto; rating?: number; createdAt: string;
};

const NO_DRIVER: Driver = { id: '', name: '—', rating: 0, trips: 0, car: '', color: '', plate: '', phone: '' };

/** Safarlar tarixi: tugagan safarlar va haydovchi topilgandan keyin bekor qilinganlari */
export async function rideHistory(): Promise<Ride[]> {
  const rows = await api<SummaryDto[]>('GET', '/orders?limit=100');
  return rows.map(r => ({
    id: r.id,
    number: r.orderNumber,
    from: fromPlaceDto(r.pickup),
    to: fromPlaceDto(r.destination),
    tariffId: r.tariffId,
    price: r.totalPaid,
    distanceKm: r.distanceKm,
    durationMin: r.durationMin,
    payment: paymentOf(r.paymentMethod),
    driver: r.driver ? toDriver(r.driver) : NO_DRIVER,
    status: r.status === 'COMPLETED' ? 'done' : 'cancelled',
    createdAt: r.createdAt,
    rating: r.rating,
    tip: r.tip || undefined,
  }));
}

export async function nearbyCars(at: LatLng, tariffId?: string): Promise<{ cars: NearbyCar[]; etaMin: number | null }> {
  const q = `lat=${at.latitude.toFixed(6)}&lng=${at.longitude.toFixed(6)}${tariffId ? `&tariffId=${tariffId}` : ''}`;
  const r = await api<{ cars: { id: string; latitude: number; longitude: number; bearing: number }[]; nearestEtaMin: number | null }>('GET', `/drivers/nearby?${q}`);
  return { cars: r.cars.map(c => ({ id: c.id, pos: { latitude: c.latitude, longitude: c.longitude }, heading: c.bearing })), etaMin: r.nearestEtaMin };
}

export const validatePromo = (code: string) => api<{ code: string; percent: number }>('POST', '/promos/validate', { code });

/* ---------- Manzillar ---------- */

export const reversePlace = async (p: LatLng): Promise<Place> =>
  fromPlaceDto(await api<PlaceDto>('GET', `/places/reverse?lat=${p.latitude.toFixed(6)}&lng=${p.longitude.toFixed(6)}`));

/** Xaritadagi nuqtaning manzili; server javob bermasa — shunchaki nuqta */
export const addressOf = (p: LatLng): Promise<Place> =>
  reversePlace(p).catch(() => ({ latitude: p.latitude, longitude: p.longitude, title: 'Xaritadagi nuqta' }));

export const searchPlaces = async (q: string, near?: LatLng): Promise<Place[]> => {
  const at = near ? `&lat=${near.latitude.toFixed(6)}&lng=${near.longitude.toFixed(6)}` : '';
  return (await api<PlaceDto[]>('GET', `/places/search?q=${encodeURIComponent(q)}${at}`)).map(fromPlaceDto);
};

export const popularPlaces = async (near?: LatLng): Promise<Place[]> => {
  const at = near ? `?lat=${near.latitude.toFixed(6)}&lng=${near.longitude.toFixed(6)}` : '';
  return (await api<PlaceDto[]>('GET', `/places/popular${at}`)).map(fromPlaceDto);
};

export async function myPlaces(): Promise<{ home?: Place; work?: Place; recent: Place[] }> {
  const r = await api<{ home: PlaceDto | null; work: PlaceDto | null; recent: PlaceDto[] }>('GET', '/users/me/places');
  return { home: r.home ? fromPlaceDto(r.home) : undefined, work: r.work ? fromPlaceDto(r.work) : undefined, recent: r.recent.map(fromPlaceDto) };
}

export const savePlace = (slot: 'home' | 'work', p: Place | undefined) =>
  p ? api<unknown>('PUT', `/users/me/places/${slot}`, toPlaceDto(p)) : api<void>('DELETE', `/users/me/places/${slot}`);

export const rememberPlace = (p: Place) => api<void>('POST', '/users/me/places/recent', toPlaceDto(p));

/* ---------- Katalog va sozlamalar ---------- */

export type PublicSettings = {
  freeWaitSec: number; cashbackPercent: number; signupBonus: number; tipOptions: number[]; otpLength: number;
  otpResendSec: number; recentPlacesMax: number; nearbyMaxCars: number; priceRoundTo: number; supportPhone: string; supportTelegramUrl: string;
  waitPerMin: number; noShowAfterSec: number; activityAcceptBonus: number; activityDeclinePenalty: number; activityMissPenalty: number;
  activityCancelPenalty: number; homeUsesPerDay: number; chainRadiusKm: number;
  /** Kirish kodini Telegram orqali ham olish mumkin (kod shlyuzi ulangan) */
  telegramLogin?: boolean;
};
export const publicSettings = () => api<PublicSettings>('GET', '/settings/public');

export type RatingTag = { id: string; label: string; polarity: 'POSITIVE' | 'NEGATIVE' };
export const ratingTags = () => api<RatingTag[]>('GET', '/rating-tags');
