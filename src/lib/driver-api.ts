// Haydovchi: backenddagi akkaunt, smena, takliflar, safar, hujjatlar, hamyon va tarix.
// Qoidalar serverda (hujjatlar, balans, faollik, kutish narxi); ilova ularni ko'rsatadi.
import { api, ApiError, refreshSession } from './api';
import type { LatLng, Place } from './data';

export type DocKindServer = 'LICENSE' | 'TECH_PASSPORT' | 'TAXI_LICENSE' | 'OSAGO';
type Method = 'CASH' | 'BALANCE' | 'CARD';
type PlaceDto = { id?: string; title: string; subtitle?: string; latitude: number; longitude: number };

/** Server tekshirgan tarif shartlari (qoidalar serverda, ilova ularni ko'rsatadi) */
export type TariffCheckServer = { check: 'DOCUMENTS' | 'CLASS' | 'YEAR' | 'SEATS' | 'RATING' | 'TRIPS' | 'ACTIVITY' | 'TERMS'; ok: boolean; required?: string; current?: string };
export type TariffStatusServer = { tariffId: string; eligible: boolean; enabled: boolean; checks: TariffCheckServer[] };

export type DriverAccount = {
  id: string;
  fullName: string;
  phone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  rating: number;
  trips: number;
  activity: number;
  documentsBlocking: DocKindServer[];
  home?: { title: string; latitude: number; longitude: number };
  homeUsesLeft: number;
  online: boolean;
  gender?: 'M' | 'F';
  city?: string;
  deliveryTermsAccepted: boolean;
  tariffs: TariffStatusServer[];
  balance: number;
  vehicle?: { brand: string; model: string; color: string; plate: string; seats: number; year?: number; tariffIds: string[] };
};

export type DriverWallet = { balance: number; minBalance: number; recommendedBalance: number; canWork: boolean };

export type DriverRegistration = {
  fullName: string;
  gender?: 'M' | 'F';
  city?: string;
  brand: string;
  model: string;
  color: string;
  plate: string;
  year?: number;
  tariffIds: string[];
};

/** Hali haydovchi bo'lmagan foydalanuvchi uchun null: u ro'yxatdan o'tishga yuboriladi */
export async function loadDriverAccount(): Promise<DriverAccount | null> {
  try {
    return await api<DriverAccount>('GET', '/driver/profile');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return null;
    throw error;
  }
}

export async function registerDriver(input: DriverRegistration): Promise<void> {
  const { fullName, tariffIds, gender, city, ...vehicle } = input;
  await api('PATCH', '/users/me', { fullName });
  await api('POST', '/driver/registration', { gender, city, vehicle, tariffIds });
  // Haydovchi roli faqat keyingi tokenda paydo bo'ladi
  await refreshSession();
}

/** Jinsi (standart rasm uchun) va shahar */
export const updateDriverPersonal = (p: { gender?: 'M' | 'F'; city?: string }) => api<DriverAccount>('PATCH', '/driver/profile', p);
/** Yetkazish qoidalarini qabul qilish (Yetkazish tarifi uchun) */
export const acceptDeliveryTerms = () => api<DriverAccount>('POST', '/driver/delivery-terms', {});

export const loadDriverWallet = () => api<DriverWallet>('GET', '/driver/wallet');

export const requestPayout = (amount: number) =>
  api<{ id: string; amount: number; createdAt: string }>('POST', '/driver/payouts', { amount });

export const listPayouts = () =>
  api<{ id: string; amount: number; status: string; createdAt: string }[]>('GET', '/driver/payouts?limit=50');

/* ---------- Smena va joylashuv ---------- */

export const setDriverOnline = (online: boolean) => api<{ online: boolean }>('PUT', '/driver/status', { online });

export const reportLocation = (p: LatLng, heading: number, speedKmh?: number) =>
  api<{ online: boolean }>('POST', '/driver/location', {
    latitude: Math.round(p.latitude * 1e6) / 1e6,
    longitude: Math.round(p.longitude * 1e6) / 1e6,
    bearing: Math.round(((heading % 360) + 360) % 360),
    speedKmh: speedKmh !== undefined && speedKmh >= 0 ? Math.round(speedKmh * 10) / 10 : undefined,
  });

/* ---------- Takliflar va safar ---------- */

export type OfferView = {
  id: string;
  /** Zanjir: joriy safar tugagach boshlanadigan keyingi buyurtma */
  chained: boolean;
  expiresAt: string;
  secondsLeft: number;
  pickupDistanceKm: number;
  pickupEtaMin: number;
  order: {
    id: string; orderNumber: string; tariffId: string; pickup: PlaceDto; destination: PlaceDto;
    distanceKm: number; durationMin: number; fare: number; earning: number; paymentMethod: Method; options: string[]; comment?: string;
    /** Olish nuqtasidan manzilgacha yo'l chizig'i (eski server bermasligi mumkin) */
    polyline?: string;
  };
};

export type DriverOrder = {
  id: string;
  orderNumber: string;
  status: 'SEARCHING' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  tariffId: string;
  pickup: PlaceDto;
  destination: PlaceDto;
  route: { distanceKm: number; durationMin: number; polyline: string };
  approachPolyline?: string;
  fare: number;
  waitFee: number;
  /** Keyingi buyurtma (zanjir): joriy safar tugaguncha kutadi */
  chained: boolean;
  earning: number;
  cashToCollect: number;
  paymentMethod: Method;
  options: string[];
  comment?: string;
  passenger: { firstName: string; rating: number };
  passengerRating?: number;
  etaMin?: number;
  arrivedAt?: string;
  freeWaitSec: number;
  createdAt: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
};

export const currentOffer = () => api<OfferView | null>('GET', '/driver/offers/current');
export const acceptOffer = (id: string) => api<DriverOrder>('POST', `/driver/offers/${id}/accept`, {});
export const declineOffer = (id: string) => api<void>('POST', `/driver/offers/${id}/decline`, {});
export const activeDriverOrder = () => api<DriverOrder | null>('GET', '/driver/orders/active');
/** Zanjirdagi keyingi buyurtma (joriy safar tugagach boshlanadi) */
export const nextDriverOrder = () => api<DriverOrder | null>('GET', '/driver/orders/next');
export const markArrived = (id: string) => api<DriverOrder>('POST', `/driver/orders/${id}/arrived`, {});
export const startTrip = (id: string) => api<DriverOrder>('POST', `/driver/orders/${id}/start`, {});
export const completeTrip = (id: string) => api<DriverOrder>('POST', `/driver/orders/${id}/complete`, {});
export const dropOrder = (id: string, reason?: string) => api<DriverOrder>('POST', `/driver/orders/${id}/cancel`, { reason });
export const closeNoShow = (id: string) => api<DriverOrder>('POST', `/driver/orders/${id}/no-show`, {});
export const ratePassenger = (id: string, stars: number) => api<DriverOrder>('POST', `/driver/orders/${id}/rate-passenger`, { stars });
/** Yo'lovchiga qisqa xabar: yo'lovchi raqami haydovchiga ko'rsatilmaydi */
export const messagePassenger = (id: string, text: string) => api<void>('POST', `/driver/orders/${id}/message`, { text });
export const driverSos = (id: string, at?: LatLng) => api<unknown>('POST', `/driver/orders/${id}/sos`, at ?? {});

export type DriverTrip = {
  id: string; orderNumber: string; at: string; tariffId: string; from: string; to: string; price: number; waitFee: number;
  commission: number; tip: number; distanceKm: number; durationMin: number; paymentMethod: Method; surge: number;
  stars?: number; passengerStars?: number; noShow: boolean;
};
export const driverTrips = () => api<DriverTrip[]>('GET', '/driver/orders?limit=100');

/* ---------- Hujjatlar ---------- */

export type ServerDocument = {
  kind: DocKindServer; number: string; issuedOn?: string; expiresOn?: string; categories?: string;
  frontImage: string; backImage?: string; status: 'REVIEW' | 'APPROVED' | 'REJECTED'; note?: string; submittedAt: string; checkedAt?: string;
};
export const listDocuments = () => api<ServerDocument[]>('GET', '/driver/documents');
export const submitDocument = (kind: DocKindServer, doc: { number: string; issuedOn?: string; expiresOn?: string; categories?: string; frontImage: string; backImage?: string }) =>
  api<ServerDocument>('PUT', `/driver/documents/${kind}`, doc);

/* ---------- Avtomobil, tariflar, «uyga», talab ---------- */

export const updateVehicle = (patch: { brand?: string; model?: string; color?: string; plate?: string; year?: number }) =>
  api<DriverAccount>('PATCH', '/driver/vehicle', patch);
export const setDriverTariffs = (tariffIds: string[]) => api<DriverAccount>('PUT', '/driver/tariffs', { tariffIds });
export const setHome = (p: Place) =>
  api<DriverAccount>('PUT', '/driver/home', { title: p.title, latitude: p.latitude, longitude: p.longitude });
export const clearHome = () => api<DriverAccount>('DELETE', '/driver/home');

/** LIVE — so'nggi daqiqalardagi buyurtmalar; USUAL — shu soatda odatda gavjum joylar (jonli talab kam bo'lganda) */
export type DemandCell = { id: string; kind?: 'LIVE' | 'USUAL'; title?: string; latitude: number; longitude: number; radiusKm: number; level: number; orders: number; surge: number };
export const demandAround = (p: LatLng) =>
  api<DemandCell[]>('GET', `/driver/demand?latitude=${p.latitude.toFixed(5)}&longitude=${p.longitude.toFixed(5)}`);

/* ---------- Navigator ---------- */

/** OSRM burilish ko'rsatmasi: manevr nuqtasi, ko'cha va keyingi manevrgacha masofa */
export type NavStepDto = {
  type: string; modifier: string | null; exit: number | null; name: string; ref: string | null;
  latitude: number; longitude: number; distanceM: number; durationSec: number;
};
export type NavigationDto = { distanceKm: number; durationMin: number; polyline: string; source: string; steps: NavStepDto[] };

/** Mashinadan nuqtagacha yo'l, burilishma-burilish (server OSRM orqali, tirbandlik koeffitsienti bilan) */
export const navigationRoute = (from: LatLng, to: LatLng) =>
  api<NavigationDto>('GET', `/driver/navigation?fromLat=${from.latitude.toFixed(6)}&fromLng=${from.longitude.toFixed(6)}&toLat=${to.latitude.toFixed(6)}&toLng=${to.longitude.toFixed(6)}`);
