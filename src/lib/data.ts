// Ekranda ko'rinadigan nomlar tx() bilan belgilangan — ular tr() orqali joriy tilda chiqariladi.
import { tx } from './i18n';

export type LatLng = { latitude: number; longitude: number };

export type Place = LatLng & { id?: string; title: string; subtitle?: string };

/** Tarif sinfi: nom va o'rinlar ekranda; narx va kelish vaqti serverdan (quote) */
export type Tariff = {
  id: string;
  name: string;
  seats: string;
  desc: string;
};

export type Gender = 'm' | 'f';

export type Driver = {
  id: string;
  name: string;
  /** Profil rasmi (data: URI); bo'lmasa jinsiga mos standart rasm ko'rsatiladi */
  photo?: string;
  gender?: Gender;
  rating: number;
  trips: number;
  car: string;
  color: string;
  plate: string;
  phone: string;
};

export type PaymentId = 'cash' | 'card' | 'balance';

export type Card = { id: string; brand: 'Uzcard' | 'Humo' | 'Visa'; last4: string; status: 'PENDING' | 'ACTIVE' };

export type Ride = {
  id: string;
  /** Chek va qo'llab-quvvatlash uchun qisqa raqam */
  number?: string;
  from: Place;
  to: Place;
  tariffId: string;
  price: number;
  distanceKm: number;
  durationMin: number;
  payment: PaymentId;
  driver: Driver;
  status: 'done' | 'cancelled';
  createdAt: string;
  rating?: number;
  tip?: number;
};

export const DEFAULT_CENTER: LatLng = { latitude: 41.3111, longitude: 69.2797 }; // Amir Temur xiyoboni

export const TARIFFS: Tariff[] = [
  { id: 'start', name: tx('Start'), seats: '4', desc: tx('Arzon va tez') },
  { id: 'comfort', name: tx('Komfort'), seats: '4', desc: tx('Yangi mashinalar, konditsioner') },
  { id: 'business', name: tx('Biznes'), seats: '4', desc: tx('Premium avtomobillar') },
  { id: 'minivan', name: tx('Miniven'), seats: '6–7', desc: tx('Katta oila va yuklar uchun') },
  { id: 'delivery', name: tx('Yetkazish'), seats: '—', desc: tx('Hujjat va posilkalar') },
];

export const RIDE_OPTIONS = [
  { id: 'child', label: tx("Bolalar o'rindig'i"), icon: 'happy-outline' },
  { id: 'ac', label: tx('Konditsioner'), icon: 'snow-outline' },
  { id: 'pet', label: tx('Uy hayvoni bilan'), icon: 'paw-outline' },
  { id: 'luggage', label: tx('Katta yuk'), icon: 'briefcase-outline' },
  { id: 'quiet', label: tx('Jim safar'), icon: 'volume-mute-outline' },
] as const;
