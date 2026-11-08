import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import { tr, tx, type TKey } from './i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

/* ================= Turlar ================= */

export type Stage = 'idea' | 'prototype' | 'mvp' | 'growth' | 'scale';
export type Seek = 'investment' | 'partner' | 'specialist' | 'client' | 'supplier';
export type ListingStatus = 'draft' | 'review' | 'published' | 'paused' | 'rejected' | 'blocked';
export type ContactMethod = 'chat' | 'email' | 'phone';
export type Plan = 'free' | 'pro' | 'business';

export type Attachment = { id: string; name: string; size?: number; mime?: string; uri?: string };

export type Project = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerKind: 'person' | 'company';
  ownerVerified: boolean;
  title: string;
  summary: string;
  description: string;
  goal: string;
  sector: string;
  country: string;
  city: string;
  languages: string[];
  stage: Stage;
  budgetMin: number; // USD
  budgetMax: number; // USD
  durationMonths: number;
  contact: ContactMethod;
  contactValue?: string;
  seeking: Seek[];
  attachments: Attachment[];
  /** Muqova rasmi (16:9, data: URI) */
  cover?: string;
  status: ListingStatus;
  rejectReason?: string;
  views: number;
  saves: number;
  boosted?: boolean;
  team: number;
  createdAt: string;
};

export type Company = {
  id: string;
  name: string;
  color: string;
  country: string;
  city: string;
  sector: string;
  about: string;
  services: { title: string; price?: string }[];
  offers: { id: string; title: string; desc: string }[];
  verified: boolean;
  plan: Plan;
  employees: string;
  founded: number;
  rating: number;
  languages: string[];
  website?: string;
};

export type Investor = {
  id: string;
  name: string;
  kind: 'angel' | 'fund' | 'corporate' | 'accelerator';
  country: string;
  about: string;
  ticketMin: number;
  ticketMax: number;
  sectors: string[];
  stages: Stage[];
  verified: boolean;
  licensed: boolean;
  deals: number;
};

export type MarketKind = 'goods' | 'digital' | 'service';
export type MarketItem = {
  id: string;
  title: string;
  kind: MarketKind;
  price: number; // USD
  unit?: string;
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  country: string;
  sector: string;
  desc: string;
  /** Mahsulot rasmi (4:3, data: URI) — bo'lmasa soha belgisi ko'rsatiladi */
  image?: string;
  delivery?: string;
  minOrder?: string;
  /** Chegirmagacha bo'lgan narx (USD) */
  oldPrice?: number;
  /** O'rtacha baho (1–5) va baholar soni */
  rating?: number;
  reviews?: number;
  /** Sotilgan / buyurtma qilingan soni */
  sold?: number;
  status: ListingStatus;
  createdAt: string;
};

export type Specialist = {
  id: string;
  name: string;
  title: string;
  skills: string[];
  country: string;
  city: string;
  languages: string[];
  rate: number; // USD/soat
  rating: number;
  reviews: number;
  available: boolean;
  remote: boolean;
  verified: boolean;
  sector: string;
  experience: number;
  about: string;
  /** Profil rasmi (data: URI); bo'lmasa standart avatar */
  photo?: string;
  /** Portfolio sayti — ID kartaning orqa tomonidan ochiladi */
  website?: string;
  /** Standart avatarni tanlash uchun */
  gender?: 'm' | 'f';
};

export type Message = {
  id: string;
  from: 'me' | 'them' | 'system';
  text: string;
  at: string;
  file?: Attachment;
  meetingId?: string;
};

export type PeerKind = 'company' | 'person' | 'investor' | 'specialist' | 'support';
export type Conversation = {
  id: string;
  peerId: string;
  peerName: string;
  peerKind: PeerKind;
  peerVerified: boolean;
  subject?: string;
  kind: 'chat' | 'request';
  incoming?: boolean;
  requestStatus?: 'pending' | 'accepted' | 'declined';
  messages: Message[];
  unread: number;
  blocked?: boolean;
};

export type Meeting = {
  id: string;
  convId: string;
  title: string;
  with: string;
  at: string;
  durationMin: number;
  link: string;
  status: 'scheduled' | 'cancelled';
};

export type ReportTarget = 'project' | 'company' | 'specialist' | 'market' | 'investor' | 'user';
export type Report = {
  id: string;
  targetKind: ReportTarget;
  targetId: string;
  targetTitle: string;
  reason: string;
  note?: string;
  by: string;
  status: 'open' | 'resolved' | 'dismissed';
  action?: string;
  createdAt: string;
};

export type Verification = {
  id: string;
  name: string;
  kind: 'person' | 'company';
  country: string;
  docs: string[];
  /** Moderator uchun: yuklangan fayllar (data URI) */
  files?: { name: string; data: string }[];
  status: 'pending' | 'approved' | 'rejected';
  isMe?: boolean;
  createdAt: string;
};

export type Notice = { id: string; icon: IconName; title: string; text: string; at: string; read: boolean; href?: string };
export type SecurityEvent = { id: string; at: string; event: string; device: string; ok: boolean };

/* ================= Ma'lumotnomalar ================= */

export type Section = { id: string; name: string; icon: IconName; color: string; soft: string; route: string; desc: TKey };

export const SECTIONS: Section[] = [
  { id: 'project', name: 'PROJECT', icon: 'rocket-outline', color: '#2457F5', soft: '#E8EEFF', route: '/projects', desc: 'sec.project' },
  { id: 'business', name: 'BUSINESS', icon: 'business-outline', color: '#0E9F6E', soft: '#E3F6EE', route: '/business', desc: 'sec.business' },
  { id: 'invest', name: 'INVEST', icon: 'trending-up-outline', color: '#7A4DF0', soft: '#F0EAFF', route: '/invest', desc: 'sec.invest' },
  { id: 'market', name: 'MARKET', icon: 'storefront-outline', color: '#E5484D', soft: '#FDECEC', route: '/market', desc: 'sec.market' },
  { id: 'technology', name: 'TECHNOLOGY', icon: 'code-slash-outline', color: '#0891B2', soft: '#E0F5FA', route: '/tech', desc: 'sec.technology' },
  { id: 'connect', name: 'CONNECT', icon: 'chatbubbles-outline', color: '#D97706', soft: '#FEF3E2', route: '/connect', desc: 'sec.connect' },
  { id: 'world', name: 'WORLD', icon: 'earth-outline', color: '#4F6BD8', soft: '#E6E9F0', route: '/world', desc: 'sec.world' },
];

export type Sector = { id: string; name: string; icon: IconName; color: string; examples: string };

export const SECTORS: Sector[] = [
  { id: 'it', get name() { return tr('Axborot texnologiyalari'); }, icon: 'laptop-outline', color: '#2457F5', get examples() { return tr('Veb-saytlar, dasturlar, mobil ilovalar va IT xizmatlar'); } },
  { id: 'ai', get name() { return tr("Sun'iy intellekt va robototexnika"); }, icon: 'hardware-chip-outline', color: '#7A4DF0', get examples() { return tr('AI yechimlari, avtomatlashtirish va robotlar'); } },
  { id: 'transport', get name() { return tr('Transport va taksi'); }, icon: 'car-sport-outline', color: '#E0A800', get examples() { return tr("Taksi platformalari, yo'lovchi va yuk tashish"); } },
  { id: 'startup', get name() { return tr('Biznes va startaplar'); }, icon: 'bulb-outline', color: '#F59E0B', get examples() { return tr("Yangi kompaniyalar, tadbirkorlik g'oyalari va biznes rejalar"); } },
  { id: 'invest', get name() { return tr('Investitsiya va hamkorlik'); }, icon: 'trending-up-outline', color: '#0E9F6E', get examples() { return tr('Moliyalashtirish takliflari va sherik izlash'); } },
  { id: 'manufacturing', get name() { return tr('Ishlab chiqarish'); }, icon: 'construct-outline', color: '#64748B', get examples() { return tr('Zavodlar, fabrikalar va yangi mahsulotlar'); } },
  { id: 'ecommerce', get name() { return tr('Elektron savdo'); }, icon: 'cart-outline', color: '#E5484D', get examples() { return tr("Internet-do'konlar, tovarlar va raqamli mahsulotlar"); } },
  { id: 'realestate', get name() { return tr("Qurilish va ko'chmas mulk"); }, icon: 'business-outline', color: '#B45309', get examples() { return tr('Qurilish, infratuzilma va mulk loyihalari'); } },
  { id: 'agro', get name() { return tr("Qishloq xo'jaligi"); }, icon: 'leaf-outline', color: '#16A34A', get examples() { return tr('Fermerlik, agrotexnologiya va oziq-ovqat'); } },
  { id: 'health', get name() { return tr("Tibbiyot va sog'liqni saqlash"); }, icon: 'medkit-outline', color: '#DC2626', get examples() { return tr('Tibbiy texnologiyalar va xizmatlar'); } },
  { id: 'education', get name() { return tr("Ta'lim"); }, icon: 'school-outline', color: '#0891B2', get examples() { return tr("Onlayn kurslar, o'quv platformalari va ta'lim texnologiyalari"); } },
  { id: 'tourism', get name() { return tr('Turizm'); }, icon: 'airplane-outline', color: '#0EA5E9', get examples() { return tr('Sayohat, mehmonxona va turistik xizmatlar'); } },
  { id: 'energy', get name() { return tr('Energetika'); }, icon: 'flash-outline', color: '#EAB308', get examples() { return tr("Quyosh va boshqa muqobil energiya loyihalari"); } },
  { id: 'logistics', get name() { return tr('Logistika'); }, icon: 'cube-outline', color: '#9333EA', get examples() { return tr('Ombor, yetkazib berish va xalqaro yuk tashish'); } },
  { id: 'design', get name() { return tr('Dizayn va media'); }, icon: 'color-palette-outline', color: '#DB2777', get examples() { return tr('Grafika, reklama, video va ijodiy xizmatlar'); } },
  { id: 'jobs', get name() { return tr('Kadrlar va ish'); }, icon: 'people-outline', color: '#4F46E5', get examples() { return tr('Vakansiyalar, mutaxassislar va masofaviy ish'); } },
  { id: 'ecology', get name() { return tr('Ekologiya'); }, icon: 'earth-outline', color: '#059669', get examples() { return tr('Ekologik texnologiyalar va tabiatni muhofaza qilish'); } },
  { id: 'charity', get name() { return tr('Xayriya va ijtimoiy loyihalar'); }, icon: 'heart-outline', color: '#F43F5E', get examples() { return tr('Jamoatchilik tashabbuslari va ijtimoiy yordam'); } },
  { id: 'science', get name() { return tr('Ilm-fan va ixtirolar'); }, icon: 'flask-outline', color: '#6366F1', get examples() { return tr("Tadqiqotlar, yangi texnologiyalar va patentga oid g'oyalar"); } },
  { id: 'eservices', get name() { return tr('Elektron xizmatlar'); }, icon: 'cloud-outline', color: '#0284C7', get examples() { return tr('Raqamli xizmatlar va avtomatlashtirilgan tizimlar'); } },
  { id: 'finance', get name() { return tr('Moliya'); }, icon: 'cash-outline', color: '#15803D', get examples() { return tr("To'lov tizimlari, fintex va buxgalteriya"); } },
  { id: 'legal', get name() { return tr('Huquqiy xizmatlar'); }, icon: 'document-text-outline', color: '#475569', get examples() { return tr("Yuridik maslahat, shartnomalar va ro'yxatdan o'tkazish"); } },
  { id: 'insurance', get name() { return tr("Sug'urta"); }, icon: 'shield-checkmark-outline', color: '#0F766E', get examples() { return tr("Sug'urta mahsulotlari va risklarni boshqarish"); } },
  { id: 'telecom', get name() { return tr('Telekommunikatsiya'); }, icon: 'cellular-outline', color: '#1D4ED8', get examples() { return tr('Aloqa, internet va tarmoq infratuzilmasi'); } },
  { id: 'sport', get name() { return tr('Sport'); }, icon: 'football-outline', color: '#EA580C', get examples() { return tr('Sport klublari, fitnes va sport texnologiyalari'); } },
];

export type Country = { code: string; name: string; flag: string; region: 'Osiyo' | 'Yevropa' | 'Amerika' | 'Afrika' | 'Okeaniya' };

export const COUNTRIES: Country[] = [
  { code: 'UZ', get name() { return tr("O'zbekiston"); }, flag: '🇺🇿', region: 'Osiyo' },
  { code: 'KZ', get name() { return tr("Qozog'iston"); }, flag: '🇰🇿', region: 'Osiyo' },
  { code: 'KG', get name() { return tr("Qirg'iziston"); }, flag: '🇰🇬', region: 'Osiyo' },
  { code: 'TJ', get name() { return tr('Tojikiston'); }, flag: '🇹🇯', region: 'Osiyo' },
  { code: 'TM', get name() { return tr('Turkmaniston'); }, flag: '🇹🇲', region: 'Osiyo' },
  { code: 'TR', get name() { return tr('Turkiya'); }, flag: '🇹🇷', region: 'Osiyo' },
  { code: 'GE', get name() { return tr('Gruziya'); }, flag: '🇬🇪', region: 'Osiyo' },
  { code: 'AE', get name() { return tr('BAA'); }, flag: '🇦🇪', region: 'Osiyo' },
  { code: 'SA', get name() { return tr('Saudiya Arabistoni'); }, flag: '🇸🇦', region: 'Osiyo' },
  { code: 'CN', get name() { return tr('Xitoy'); }, flag: '🇨🇳', region: 'Osiyo' },
  { code: 'KR', get name() { return tr('Janubiy Koreya'); }, flag: '🇰🇷', region: 'Osiyo' },
  { code: 'JP', get name() { return tr('Yaponiya'); }, flag: '🇯🇵', region: 'Osiyo' },
  { code: 'IN', get name() { return tr('Hindiston'); }, flag: '🇮🇳', region: 'Osiyo' },
  { code: 'SG', get name() { return tr('Singapur'); }, flag: '🇸🇬', region: 'Osiyo' },
  { code: 'RU', get name() { return tr('Rossiya'); }, flag: '🇷🇺', region: 'Yevropa' },
  { code: 'DE', get name() { return tr('Germaniya'); }, flag: '🇩🇪', region: 'Yevropa' },
  { code: 'GB', get name() { return tr('Buyuk Britaniya'); }, flag: '🇬🇧', region: 'Yevropa' },
  { code: 'FR', get name() { return tr('Fransiya'); }, flag: '🇫🇷', region: 'Yevropa' },
  { code: 'PL', get name() { return tr('Polsha'); }, flag: '🇵🇱', region: 'Yevropa' },
  { code: 'NL', get name() { return tr('Niderlandiya'); }, flag: '🇳🇱', region: 'Yevropa' },
  { code: 'EE', get name() { return tr('Estoniya'); }, flag: '🇪🇪', region: 'Yevropa' },
  { code: 'US', get name() { return tr('AQSh'); }, flag: '🇺🇸', region: 'Amerika' },
  { code: 'CA', get name() { return tr('Kanada'); }, flag: '🇨🇦', region: 'Amerika' },
  { code: 'BR', get name() { return tr('Braziliya'); }, flag: '🇧🇷', region: 'Amerika' },
  { code: 'NG', get name() { return tr('Nigeriya'); }, flag: '🇳🇬', region: 'Afrika' },
  { code: 'KE', get name() { return tr('Keniya'); }, flag: '🇰🇪', region: 'Afrika' },
  { code: 'EG', get name() { return tr('Misr'); }, flag: '🇪🇬', region: 'Afrika' },
  { code: 'AU', get name() { return tr('Avstraliya'); }, flag: '🇦🇺', region: 'Okeaniya' },
];

/** Til va uni ko'rsatadigan bayroq (mamlakat kodi) */
export const LANGUAGES: { id: string; name: string; flag: string }[] = [
  { id: 'uz', get name() { return tr("O'zbek"); }, flag: 'UZ' },
  { id: 'ru', get name() { return tr('Rus'); }, flag: 'RU' },
  { id: 'en', get name() { return tr('Ingliz'); }, flag: 'GB' },
  { id: 'tr', get name() { return tr('Turk'); }, flag: 'TR' },
  { id: 'kk', get name() { return tr('Qozoq'); }, flag: 'KZ' },
  { id: 'de', get name() { return tr('Nemis'); }, flag: 'DE' },
  { id: 'fr', get name() { return tr('Fransuz'); }, flag: 'FR' },
  { id: 'ar', get name() { return tr('Arab'); }, flag: 'SA' },
  { id: 'zh', get name() { return tr('Xitoy tili'); }, flag: 'CN' },
  { id: 'ko', get name() { return tr('Koreys'); }, flag: 'KR' },
  { id: 'es', get name() { return tr('Ispan'); }, flag: 'ES' },
];

export const STAGES: { id: Stage; name: string; icon: IconName }[] = [
  { id: 'idea', get name() { return tr("G'oya"); }, icon: 'bulb-outline' },
  { id: 'prototype', get name() { return tr('Prototip'); }, icon: 'construct-outline' },
  { id: 'mvp', get name() { return tr('MVP'); }, icon: 'rocket-outline' },
  { id: 'growth', get name() { return tr("O'sish"); }, icon: 'trending-up-outline' },
  { id: 'scale', get name() { return tr('Kengayish'); }, icon: 'globe-outline' },
];

export const SEEKS: { id: Seek; name: string; icon: IconName }[] = [
  { id: 'investment', get name() { return tr('Investitsiya'); }, icon: 'cash-outline' },
  { id: 'partner', get name() { return tr('Hamkor'); }, icon: 'people-outline' },
  { id: 'specialist', get name() { return tr('Mutaxassis'); }, icon: 'code-slash-outline' },
  { id: 'client', get name() { return tr('Mijozlar'); }, icon: 'person-add-outline' },
  { id: 'supplier', get name() { return tr("Yetkazib beruvchi"); }, icon: 'cube-outline' },
];

export const STATUS_META: Record<ListingStatus, { name: string; icon: IconName; tone: 'muted' | 'warn' | 'ok' | 'danger' }> = {
  draft: { get name() { return tr('Qoralama'); }, icon: 'create-outline', tone: 'muted' },
  review: { get name() { return tr("Ko'rib chiqilmoqda"); }, icon: 'hourglass-outline', tone: 'warn' },
  published: { get name() { return tr('Faol'); }, icon: 'checkmark-circle', tone: 'ok' },
  paused: { get name() { return tr('Nofaol'); }, icon: 'pause-circle', tone: 'muted' },
  rejected: { get name() { return tr('Rad etilgan'); }, icon: 'close-circle', tone: 'danger' },
  blocked: { get name() { return tr('Bloklangan'); }, icon: 'ban', tone: 'danger' },
};

export const MARKET_KINDS: { id: MarketKind; name: string; icon: IconName }[] = [
  { id: 'goods', get name() { return tr('Tovarlar'); }, icon: 'cube-outline' },
  { id: 'digital', get name() { return tr('Raqamli mahsulotlar'); }, icon: 'cloud-download-outline' },
  { id: 'service', get name() { return tr('Xizmatlar'); }, icon: 'briefcase-outline' },
];

export const INVESTOR_KINDS: Record<Investor['kind'], string> = {
  get angel() { return tr('Biznes-farishta'); },
  get fund() { return tr('Venchur fond'); },
  get corporate() { return tr('Korporativ investor'); },
  get accelerator() { return tr('Akselerator'); },
};

export const REPORT_REASONS = [
  tx('Firibgarlik yoki aldov'),
  tx('Soxta investitsiya taklifi'),
  tx('Noqonuniy tovar yoki xizmat'),
  tx("Litsenziyasiz moliyaviy faoliyat"),
  tx('Spam yoki takroriy e\'lon'),
  tx('Haqoratli yoki zararli kontent'),
  tx('Mualliflik huquqi buzilishi'),
  tx('Boshqa'),
];

/** Platformada taqiqlangan faoliyat — e'lon matnida uchrasa avtomatik moderatsiyaga tushadi */
export const BANNED_WORDS = ['kafolatlangan daromad', 'piramida', 'kazino', 'qurol', 'narkotik', '100% foyda', 'garantированный доход'];

export const PLANS: { id: Plan; name: string; price: number; yearly: number; color: string; perks: string[] }[] = [
  {
    id: 'free', name: 'Free', price: 0, yearly: 0, color: '#64748B',
    get perks() { return [tr("3 tagacha faol loyiha"), tr("Oddiy joylashtirish bepul"), tr('Xabarlar va hamkorlik so\'rovlari'), tr('Asosiy qidiruv va filtrlar')]; },
  },
  {
    id: 'pro', name: 'Pro', price: 19, yearly: 190, color: '#2457F5',
    get perks() { return [tr('Cheksiz loyihalar'), tr('Oyiga 2 ta bepul «Top» ko\'rsatish'), tr("Ko'rishlar statistikasi"), tr('Onlayn uchrashuvlar'), tr('Fayl almashish 1 GB gacha')]; },
  },
  {
    id: 'business', name: 'Business', price: 79, yearly: 790, color: '#7A4DF0',
    get perks() { return [tr('Kengaytirilgan kompaniya profili'), tr('Xizmatlar katalogi va B2B takliflar'), tr('5 ta xodim akkaunti'), tr('Ustuvor moderatsiya (24 soat)'), tr('Reklama joylariga 20% chegirma'), tr('Shaxsiy menejer')]; },
  },
];

export const PRO_SERVICES: { id: string; title: string; desc: string; price: string; icon: IconName }[] = [
  { id: 'analysis', get title() { return tr('Loyiha tahlili'); }, get desc() { return tr("Bozor, raqobatchilar va moliyaviy model bo'yicha ekspert xulosasi"); }, get price() { return tr('{sum} dan', { sum: '$149' }); }, icon: 'analytics-outline' },
  { id: 'design', get title() { return tr('Taqdimot dizayni'); }, get desc() { return tr('Investorlar uchun pitch-deck tayyorlash'); }, get price() { return tr('{sum} dan', { sum: '$99' }); }, icon: 'easel-outline' },
  { id: 'translate', get title() { return tr('Tarjima'); }, get desc() { return tr("Loyiha sahifasini ingliz, rus va boshqa tillarga tarjima qilish"); }, get price() { return tr("{sum} / so'z", { sum: '$0.06' }); }, icon: 'language-outline' },
  { id: 'docs', get title() { return tr('Hujjat tayyorlash'); }, get desc() { return tr('Shartnoma, NDA va biznes-reja shablonlari'); }, get price() { return tr('{sum} dan', { sum: '$59' }); }, icon: 'document-attach-outline' },
];
