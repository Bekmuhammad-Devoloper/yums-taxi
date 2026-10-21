export type LatLng = { latitude: number; longitude: number };

export type Place = LatLng & { id?: string; title: string; subtitle?: string };

export type Tariff = {
  id: string;
  name: string;
  emoji: string;
  seats: string;
  base: number; // so'm
  perKm: number;
  perMin: number;
  minFare: number;
  etaExtra: number; // daqiqa
  desc: string;
};

export type Driver = {
  id: string;
  name: string;
  rating: number;
  trips: number;
  car: string;
  color: string;
  plate: string;
  phone: string;
};

export type PaymentId = 'cash' | 'card' | 'balance';

export type Card = { id: string; brand: 'Uzcard' | 'Humo' | 'Visa'; last4: string };

export type Ride = {
  id: string;
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

export const PLACES: Place[] = [
  { id: 'airport', title: 'Toshkent xalqaro aeroporti', subtitle: 'Kushbegi ko\'chasi, Yakkasaroy', latitude: 41.2579, longitude: 69.2812 },
  { id: 'vokzal', title: 'Toshkent vokzali', subtitle: 'Turkiston ko\'chasi, Mirobod', latitude: 41.2925, longitude: 69.2875 },
  { id: 'tcity', title: 'Tashkent City', subtitle: 'Islom Karimov ko\'chasi', latitude: 41.3155, longitude: 69.2485 },
  { id: 'chorsu', title: 'Chorsu bozori', subtitle: 'Shayxontohur tumani', latitude: 41.3266, longitude: 69.2347 },
  { id: 'magic', title: 'Magic City', subtitle: 'Bobur ko\'chasi, Yakkasaroy', latitude: 41.3029, longitude: 69.2466 },
  { id: 'megaplanet', title: 'Mega Planet', subtitle: 'Yunusobod tumani', latitude: 41.3678, longitude: 69.2876 },
  { id: 'samarqanddarvoza', title: 'Samarqand Darvoza', subtitle: 'Qoratosh ko\'chasi', latitude: 41.3166, longitude: 69.2236 },
  { id: 'amirtemur', title: 'Amir Temur xiyoboni', subtitle: 'Markaz', latitude: 41.3111, longitude: 69.2797 },
  { id: 'minor', title: 'Minor masjidi', subtitle: 'Qorasuv ko\'chasi', latitude: 41.3343, longitude: 69.2852 },
  { id: 'hazratiimom', title: 'Hazrati Imom majmuasi', subtitle: 'Olmazor tumani', latitude: 41.3383, longitude: 69.241 },
  { id: 'chilonzor', title: 'Chilonzor metro', subtitle: 'Chilonzor tumani', latitude: 41.2756, longitude: 69.2034 },
  { id: 'inha', title: 'INHA universiteti', subtitle: 'Ziyolilar ko\'chasi', latitude: 41.3385, longitude: 69.3346 },
  { id: 'yunusobod', title: 'Yunusobod bozori', subtitle: 'Yunusobod tumani', latitude: 41.364, longitude: 69.289 },
  { id: 'nest', title: 'Next Mall', subtitle: 'Bobur ko\'chasi', latitude: 41.2975, longitude: 69.2475 },
];

export const TARIFFS: Tariff[] = [
  { id: 'start', name: 'Start', emoji: '🚕', seats: '4', base: 6000, perKm: 1700, perMin: 250, minFare: 9000, etaExtra: 0, desc: 'Arzon va tez' },
  { id: 'comfort', name: 'Komfort', emoji: '🚗', seats: '4', base: 9000, perKm: 2200, perMin: 300, minFare: 13000, etaExtra: 1, desc: 'Yangi mashinalar, konditsioner' },
  { id: 'business', name: 'Biznes', emoji: '🚘', seats: '4', base: 18000, perKm: 3600, perMin: 450, minFare: 28000, etaExtra: 3, desc: 'Premium avtomobillar' },
  { id: 'minivan', name: 'Miniven', emoji: '🚐', seats: '6–7', base: 14000, perKm: 2800, perMin: 350, minFare: 20000, etaExtra: 4, desc: 'Katta oila va yuklar uchun' },
  { id: 'delivery', name: 'Yetkazish', emoji: '📦', seats: '—', base: 7000, perKm: 1600, perMin: 200, minFare: 10000, etaExtra: 2, desc: 'Hujjat va posilkalar' },
];

export const DRIVERS: Driver[] = [
  { id: 'd1', name: 'Jasur', rating: 4.96, trips: 3420, car: 'Chevrolet Cobalt', color: 'Oq', plate: '01 A 777 BA', phone: '+998901234567' },
  { id: 'd2', name: 'Sardor', rating: 4.91, trips: 1875, car: 'Chevrolet Gentra', color: 'Kumush', plate: '01 R 452 KA', phone: '+998935554433' },
  { id: 'd3', name: 'Akmal', rating: 4.98, trips: 5210, car: 'BYD Chazor', color: 'Qora', plate: '01 Z 010 YM', phone: '+998977001122' },
  { id: 'd4', name: 'Bobur', rating: 4.88, trips: 960, car: 'Kia K5', color: "Ko'k", plate: '10 B 321 TA', phone: '+998946667788' },
];

export const RIDE_OPTIONS = [
  { id: 'child', label: "Bolalar o'rindig'i", icon: 'happy-outline' },
  { id: 'ac', label: 'Konditsioner', icon: 'snow-outline' },
  { id: 'pet', label: 'Uy hayvoni bilan', icon: 'paw-outline' },
  { id: 'luggage', label: 'Katta yuk', icon: 'briefcase-outline' },
  { id: 'quiet', label: 'Jim safar', icon: 'volume-mute-outline' },
] as const;

export const RATING_TAGS = ['Toza mashina', 'Xushmuomala', 'Xavfsiz haydash', 'Yaxshi musiqa', 'Yo\'lni yaxshi biladi', 'Vaqtida keldi'];

export const SEED_RIDES: Ride[] = [
  {
    id: 'r1', from: PLACES[7], to: PLACES[0], tariffId: 'comfort', price: 32500, distanceKm: 7.4, durationMin: 18,
    payment: 'card', driver: DRIVERS[2], status: 'done', createdAt: '2026-10-19T08:42:00', rating: 5,
  },
  {
    id: 'r2', from: PLACES[2], to: PLACES[3], tariffId: 'start', price: 14000, distanceKm: 2.6, durationMin: 9,
    payment: 'cash', driver: DRIVERS[0], status: 'done', createdAt: '2026-10-17T19:15:00', rating: 5,
  },
  {
    id: 'r3', from: PLACES[5], to: PLACES[4], tariffId: 'start', price: 0, distanceKm: 8.9, durationMin: 0,
    payment: 'cash', driver: DRIVERS[1], status: 'cancelled', createdAt: '2026-10-12T13:03:00',
  },
];
