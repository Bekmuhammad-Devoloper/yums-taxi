import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { TKey } from './i18n';

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

export type Sector = { id: string; name: string; ru: string; en: string; icon: IconName; color: string; examples: string };

export const SECTORS: Sector[] = [
  { id: 'it', name: 'Axborot texnologiyalari', ru: 'ИТ', en: 'Information technology', icon: 'laptop-outline', color: '#2457F5', examples: 'Veb-saytlar, dasturlar, mobil ilovalar va IT xizmatlar' },
  { id: 'ai', name: "Sun'iy intellekt va robototexnika", ru: 'ИИ и робототехника', en: 'AI & robotics', icon: 'hardware-chip-outline', color: '#7A4DF0', examples: 'AI yechimlari, avtomatlashtirish va robotlar' },
  { id: 'transport', name: 'Transport va taksi', ru: 'Транспорт и такси', en: 'Transport & taxi', icon: 'car-sport-outline', color: '#E0A800', examples: "Taksi platformalari, yo'lovchi va yuk tashish" },
  { id: 'startup', name: 'Biznes va startaplar', ru: 'Бизнес и стартапы', en: 'Business & startups', icon: 'bulb-outline', color: '#F59E0B', examples: "Yangi kompaniyalar, tadbirkorlik g'oyalari va biznes rejalar" },
  { id: 'invest', name: 'Investitsiya va hamkorlik', ru: 'Инвестиции и партнёрство', en: 'Investment & partnership', icon: 'trending-up-outline', color: '#0E9F6E', examples: 'Moliyalashtirish takliflari va sherik izlash' },
  { id: 'manufacturing', name: 'Ishlab chiqarish', ru: 'Производство', en: 'Manufacturing', icon: 'construct-outline', color: '#64748B', examples: 'Zavodlar, fabrikalar va yangi mahsulotlar' },
  { id: 'ecommerce', name: 'Elektron savdo', ru: 'Электронная торговля', en: 'E-commerce', icon: 'cart-outline', color: '#E5484D', examples: "Internet-do'konlar, tovarlar va raqamli mahsulotlar" },
  { id: 'realestate', name: "Qurilish va ko'chmas mulk", ru: 'Строительство и недвижимость', en: 'Construction & real estate', icon: 'business-outline', color: '#B45309', examples: 'Qurilish, infratuzilma va mulk loyihalari' },
  { id: 'agro', name: "Qishloq xo'jaligi", ru: 'Сельское хозяйство', en: 'Agriculture', icon: 'leaf-outline', color: '#16A34A', examples: 'Fermerlik, agrotexnologiya va oziq-ovqat' },
  { id: 'health', name: "Tibbiyot va sog'liqni saqlash", ru: 'Медицина и здравоохранение', en: 'Healthcare', icon: 'medkit-outline', color: '#DC2626', examples: 'Tibbiy texnologiyalar va xizmatlar' },
  { id: 'education', name: "Ta'lim", ru: 'Образование', en: 'Education', icon: 'school-outline', color: '#0891B2', examples: "Onlayn kurslar, o'quv platformalari va ta'lim texnologiyalari" },
  { id: 'tourism', name: 'Turizm', ru: 'Туризм', en: 'Tourism', icon: 'airplane-outline', color: '#0EA5E9', examples: 'Sayohat, mehmonxona va turistik xizmatlar' },
  { id: 'energy', name: 'Energetika', ru: 'Энергетика', en: 'Energy', icon: 'flash-outline', color: '#EAB308', examples: "Quyosh va boshqa muqobil energiya loyihalari" },
  { id: 'logistics', name: 'Logistika', ru: 'Логистика', en: 'Logistics', icon: 'cube-outline', color: '#9333EA', examples: 'Ombor, yetkazib berish va xalqaro yuk tashish' },
  { id: 'design', name: 'Dizayn va media', ru: 'Дизайн и медиа', en: 'Design & media', icon: 'color-palette-outline', color: '#DB2777', examples: 'Grafika, reklama, video va ijodiy xizmatlar' },
  { id: 'jobs', name: 'Kadrlar va ish', ru: 'Кадры и работа', en: 'Jobs & talent', icon: 'people-outline', color: '#4F46E5', examples: 'Vakansiyalar, mutaxassislar va masofaviy ish' },
  { id: 'ecology', name: 'Ekologiya', ru: 'Экология', en: 'Ecology', icon: 'earth-outline', color: '#059669', examples: 'Ekologik texnologiyalar va tabiatni muhofaza qilish' },
  { id: 'charity', name: 'Xayriya va ijtimoiy loyihalar', ru: 'Благотворительность', en: 'Charity & social', icon: 'heart-outline', color: '#F43F5E', examples: 'Jamoatchilik tashabbuslari va ijtimoiy yordam' },
  { id: 'science', name: 'Ilm-fan va ixtirolar', ru: 'Наука и изобретения', en: 'Science & inventions', icon: 'flask-outline', color: '#6366F1', examples: "Tadqiqotlar, yangi texnologiyalar va patentga oid g'oyalar" },
  { id: 'eservices', name: 'Elektron xizmatlar', ru: 'Электронные услуги', en: 'Digital services', icon: 'cloud-outline', color: '#0284C7', examples: 'Raqamli xizmatlar va avtomatlashtirilgan tizimlar' },
  { id: 'finance', name: 'Moliya', ru: 'Финансы', en: 'Finance', icon: 'cash-outline', color: '#15803D', examples: "To'lov tizimlari, fintex va buxgalteriya" },
  { id: 'legal', name: 'Huquqiy xizmatlar', ru: 'Юридические услуги', en: 'Legal services', icon: 'document-text-outline', color: '#475569', examples: "Yuridik maslahat, shartnomalar va ro'yxatdan o'tkazish" },
  { id: 'insurance', name: "Sug'urta", ru: 'Страхование', en: 'Insurance', icon: 'shield-checkmark-outline', color: '#0F766E', examples: "Sug'urta mahsulotlari va risklarni boshqarish" },
  { id: 'telecom', name: 'Telekommunikatsiya', ru: 'Телеком', en: 'Telecom', icon: 'cellular-outline', color: '#1D4ED8', examples: 'Aloqa, internet va tarmoq infratuzilmasi' },
  { id: 'sport', name: 'Sport', ru: 'Спорт', en: 'Sport', icon: 'football-outline', color: '#EA580C', examples: 'Sport klublari, fitnes va sport texnologiyalari' },
];

export type Country = { code: string; name: string; flag: string; region: 'Osiyo' | 'Yevropa' | 'Amerika' | 'Afrika' | 'Okeaniya' };

export const COUNTRIES: Country[] = [
  { code: 'UZ', name: "O'zbekiston", flag: '🇺🇿', region: 'Osiyo' },
  { code: 'KZ', name: "Qozog'iston", flag: '🇰🇿', region: 'Osiyo' },
  { code: 'KG', name: "Qirg'iziston", flag: '🇰🇬', region: 'Osiyo' },
  { code: 'TJ', name: 'Tojikiston', flag: '🇹🇯', region: 'Osiyo' },
  { code: 'TM', name: 'Turkmaniston', flag: '🇹🇲', region: 'Osiyo' },
  { code: 'TR', name: 'Turkiya', flag: '🇹🇷', region: 'Osiyo' },
  { code: 'GE', name: 'Gruziya', flag: '🇬🇪', region: 'Osiyo' },
  { code: 'AE', name: 'BAA', flag: '🇦🇪', region: 'Osiyo' },
  { code: 'SA', name: 'Saudiya Arabistoni', flag: '🇸🇦', region: 'Osiyo' },
  { code: 'CN', name: 'Xitoy', flag: '🇨🇳', region: 'Osiyo' },
  { code: 'KR', name: 'Janubiy Koreya', flag: '🇰🇷', region: 'Osiyo' },
  { code: 'JP', name: 'Yaponiya', flag: '🇯🇵', region: 'Osiyo' },
  { code: 'IN', name: 'Hindiston', flag: '🇮🇳', region: 'Osiyo' },
  { code: 'SG', name: 'Singapur', flag: '🇸🇬', region: 'Osiyo' },
  { code: 'RU', name: 'Rossiya', flag: '🇷🇺', region: 'Yevropa' },
  { code: 'DE', name: 'Germaniya', flag: '🇩🇪', region: 'Yevropa' },
  { code: 'GB', name: 'Buyuk Britaniya', flag: '🇬🇧', region: 'Yevropa' },
  { code: 'FR', name: 'Fransiya', flag: '🇫🇷', region: 'Yevropa' },
  { code: 'PL', name: 'Polsha', flag: '🇵🇱', region: 'Yevropa' },
  { code: 'NL', name: 'Niderlandiya', flag: '🇳🇱', region: 'Yevropa' },
  { code: 'EE', name: 'Estoniya', flag: '🇪🇪', region: 'Yevropa' },
  { code: 'US', name: 'AQSh', flag: '🇺🇸', region: 'Amerika' },
  { code: 'CA', name: 'Kanada', flag: '🇨🇦', region: 'Amerika' },
  { code: 'BR', name: 'Braziliya', flag: '🇧🇷', region: 'Amerika' },
  { code: 'NG', name: 'Nigeriya', flag: '🇳🇬', region: 'Afrika' },
  { code: 'KE', name: 'Keniya', flag: '🇰🇪', region: 'Afrika' },
  { code: 'EG', name: 'Misr', flag: '🇪🇬', region: 'Afrika' },
  { code: 'AU', name: 'Avstraliya', flag: '🇦🇺', region: 'Okeaniya' },
];

/** Til va uni ko'rsatadigan bayroq (mamlakat kodi) */
export const LANGUAGES: { id: string; name: string; flag: string }[] = [
  { id: 'uz', name: "O'zbek", flag: 'UZ' },
  { id: 'ru', name: 'Rus', flag: 'RU' },
  { id: 'en', name: 'Ingliz', flag: 'GB' },
  { id: 'tr', name: 'Turk', flag: 'TR' },
  { id: 'kk', name: 'Qozoq', flag: 'KZ' },
  { id: 'de', name: 'Nemis', flag: 'DE' },
  { id: 'fr', name: 'Fransuz', flag: 'FR' },
  { id: 'ar', name: 'Arab', flag: 'SA' },
  { id: 'zh', name: 'Xitoy', flag: 'CN' },
  { id: 'ko', name: 'Koreys', flag: 'KR' },
  { id: 'es', name: 'Ispan', flag: 'ES' },
];

export const STAGES: { id: Stage; name: string; icon: IconName }[] = [
  { id: 'idea', name: "G'oya", icon: 'bulb-outline' },
  { id: 'prototype', name: 'Prototip', icon: 'construct-outline' },
  { id: 'mvp', name: 'MVP', icon: 'rocket-outline' },
  { id: 'growth', name: "O'sish", icon: 'trending-up-outline' },
  { id: 'scale', name: 'Kengayish', icon: 'globe-outline' },
];

export const SEEKS: { id: Seek; name: string; icon: IconName }[] = [
  { id: 'investment', name: 'Investitsiya', icon: 'cash-outline' },
  { id: 'partner', name: 'Hamkor', icon: 'people-outline' },
  { id: 'specialist', name: 'Mutaxassis', icon: 'code-slash-outline' },
  { id: 'client', name: 'Mijozlar', icon: 'person-add-outline' },
  { id: 'supplier', name: "Yetkazib beruvchi", icon: 'cube-outline' },
];

export const STATUS_META: Record<ListingStatus, { name: string; icon: IconName; tone: 'muted' | 'warn' | 'ok' | 'danger' }> = {
  draft: { name: 'Qoralama', icon: 'create-outline', tone: 'muted' },
  review: { name: "Ko'rib chiqilmoqda", icon: 'hourglass-outline', tone: 'warn' },
  published: { name: 'Faol', icon: 'checkmark-circle', tone: 'ok' },
  paused: { name: 'Nofaol', icon: 'pause-circle', tone: 'muted' },
  rejected: { name: 'Rad etilgan', icon: 'close-circle', tone: 'danger' },
  blocked: { name: 'Bloklangan', icon: 'ban', tone: 'danger' },
};

export const MARKET_KINDS: { id: MarketKind; name: string; icon: IconName }[] = [
  { id: 'goods', name: 'Tovarlar', icon: 'cube-outline' },
  { id: 'digital', name: 'Raqamli mahsulotlar', icon: 'cloud-download-outline' },
  { id: 'service', name: 'Xizmatlar', icon: 'briefcase-outline' },
];

export const INVESTOR_KINDS: Record<Investor['kind'], string> = {
  angel: 'Biznes-farishta',
  fund: 'Venchur fond',
  corporate: 'Korporativ investor',
  accelerator: 'Akselerator',
};

export const REPORT_REASONS = [
  'Firibgarlik yoki aldov',
  'Soxta investitsiya taklifi',
  'Noqonuniy tovar yoki xizmat',
  "Litsenziyasiz moliyaviy faoliyat",
  'Spam yoki takroriy e\'lon',
  'Haqoratli yoki zararli kontent',
  'Mualliflik huquqi buzilishi',
  'Boshqa',
];

/** Platformada taqiqlangan faoliyat — e'lon matnida uchrasa avtomatik moderatsiyaga tushadi */
export const BANNED_WORDS = ['kafolatlangan daromad', 'piramida', 'kazino', 'qurol', 'narkotik', '100% foyda', 'garantированный доход'];

export const PLANS: { id: Plan; name: string; price: number; yearly: number; color: string; perks: string[] }[] = [
  {
    id: 'free', name: 'Free', price: 0, yearly: 0, color: '#64748B',
    perks: ["3 tagacha faol loyiha", "Oddiy joylashtirish bepul", 'Xabarlar va hamkorlik so\'rovlari', 'Asosiy qidiruv va filtrlar'],
  },
  {
    id: 'pro', name: 'Pro', price: 19, yearly: 190, color: '#2457F5',
    perks: ['Cheksiz loyihalar', 'Oyiga 2 ta bepul «Top» ko\'rsatish', "Ko'rishlar statistikasi", 'Onlayn uchrashuvlar', 'Fayl almashish 1 GB gacha'],
  },
  {
    id: 'business', name: 'Business', price: 79, yearly: 790, color: '#7A4DF0',
    perks: ['Kengaytirilgan kompaniya profili', 'Xizmatlar katalogi va B2B takliflar', '5 ta xodim akkaunti', 'Ustuvor moderatsiya (24 soat)', 'Reklama joylariga 20% chegirma', 'Shaxsiy menejer'],
  },
];

export const PRO_SERVICES: { id: string; title: string; desc: string; price: string; icon: IconName }[] = [
  { id: 'analysis', title: 'Loyiha tahlili', desc: "Bozor, raqobatchilar va moliyaviy model bo'yicha ekspert xulosasi", price: '$149 dan', icon: 'analytics-outline' },
  { id: 'design', title: 'Taqdimot dizayni', desc: 'Investorlar uchun pitch-deck tayyorlash', price: '$99 dan', icon: 'easel-outline' },
  { id: 'translate', title: 'Tarjima', desc: "Loyiha sahifasini ingliz, rus va boshqa tillarga tarjima qilish", price: '$0.06 / so\'z', icon: 'language-outline' },
  { id: 'docs', title: 'Hujjat tayyorlash', desc: 'Shartnoma, NDA va biznes-reja shablonlari', price: '$59 dan', icon: 'document-attach-outline' },
];

/* ================= Namuna ma'lumotlar ================= */

const d = (days: number) => new Date(Date.UTC(2026, 9, 21) - days * 86400000).toISOString();

export const SEED_PROJECTS: Project[] = [
  {
    id: 'p1', ownerId: 'c1', ownerName: 'AgroSmart LLC', ownerKind: 'company', ownerVerified: true,
    title: 'Aqlli tomchilatib sug\'orish tizimi',
    summary: "IoT sensorlar va AI yordamida suvni 40% tejaydigan sug'orish tizimi",
    description: "Tuproq namligi, harorat va ob-havo prognozini hisobga olib, sug'orishni avtomatik boshqaruvchi tizim. Fermer telefon orqali har bir dalani kuzatadi. Pilot Farg'ona vodiysidagi 120 gektarda o'tkazildi va suv sarfi 38% ga kamaydi.",
    goal: "2027-yil oxirigacha Markaziy Osiyodagi 5 000 gektar maydonga tizimni joriy etish",
    sector: 'agro', country: 'UZ', city: "Farg'ona", languages: ['uz', 'ru', 'en'], stage: 'growth',
    budgetMin: 250000, budgetMax: 600000, durationMonths: 18, contact: 'chat', seeking: ['investment', 'partner'],
    attachments: [{ id: 'a1', name: 'AgroSmart_pitch.pdf', size: 2400000 }, { id: 'a2', name: 'Pilot_natijalari.xlsx', size: 380000 }],
    status: 'published', views: 3420, saves: 214, boosted: true, team: 14, createdAt: d(6),
  },
  {
    id: 'p2', ownerId: 'u2', ownerName: 'Dilnoza Karimova', ownerKind: 'person', ownerVerified: true,
    title: 'EduBridge — o\'zbek tilidagi onlayn universitet',
    summary: "Xalqaro universitetlar kurslarini o'zbek tiliga moslashtirib beruvchi platforma",
    description: "Coursera va edX formatidagi kurslarni litsenziya asosida o'zbek tiliga tarjima qilib, mahalliy o'qituvchilar bilan mentorlik qo'shamiz. 12 000 dan ortiq ro'yxatdan o'tgan foydalanuvchi, 3 ta universitet bilan memorandum.",
    goal: '100 000 talabaga sifatli ta\'lim berish va 50 ta kursni lokalizatsiya qilish',
    sector: 'education', country: 'UZ', city: 'Toshkent', languages: ['uz', 'en'], stage: 'mvp',
    budgetMin: 80000, budgetMax: 150000, durationMonths: 12, contact: 'chat', seeking: ['investment', 'specialist'],
    attachments: [{ id: 'a3', name: 'EduBridge_deck.pdf', size: 5100000 }],
    status: 'published', views: 1980, saves: 156, boosted: true, team: 6, createdAt: d(3),
  },
  {
    id: 'p3', ownerId: 'c3', ownerName: 'SunPower Central Asia', ownerKind: 'company', ownerVerified: true,
    title: 'Navoiy viloyatida 20 MVt quyosh elektr stansiyasi',
    summary: 'Davlat-xususiy sheriklik asosida qurilayotgan quyosh stansiyasi uchun EPC hamkor izlanmoqda',
    description: "Yer maydoni va tarmoqqa ulanish ruxsatnomasi olingan. Loyiha 25 yillik PPA shartnomasi bilan ta'minlangan. Uskunalar yetkazib beruvchi va qurilish-montaj ishlari bo'yicha hamkor qidirilmoqda.",
    goal: '2027-yil 3-choragida stansiyani ishga tushirish',
    sector: 'energy', country: 'UZ', city: 'Navoiy', languages: ['uz', 'ru', 'en', 'zh'], stage: 'scale',
    budgetMin: 12000000, budgetMax: 16000000, durationMonths: 20, contact: 'email', contactValue: 'projects@sunpower.example', seeking: ['partner', 'supplier', 'investment'],
    attachments: [{ id: 'a4', name: 'Texnik_topshiriq.pdf', size: 8200000 }],
    status: 'published', views: 5210, saves: 302, team: 40, createdAt: d(12),
  },
  {
    id: 'p4', ownerId: 'u4', ownerName: 'Arman Seitkali', ownerKind: 'person', ownerVerified: false,
    title: 'CargoLink — Markaziy Osiyo yuk birjasi',
    summary: "Yuk egalari va tashuvchilarni bog'lovchi onlayn birja, real vaqt kuzatuvi bilan",
    description: "Qozog'iston, O'zbekiston va Qirg'iziston o'rtasidagi yuk tashishda bo'sh qatnovlar 35% ni tashkil qiladi. CargoLink yuk va mashinani avtomatik moslashtiradi, hujjatlarni elektron rasmiylashtiradi.",
    goal: '18 oyda 3 000 ta faol tashuvchini ulash',
    sector: 'logistics', country: 'KZ', city: 'Almati', languages: ['kk', 'ru', 'en'], stage: 'prototype',
    budgetMin: 150000, budgetMax: 300000, durationMonths: 18, contact: 'chat', seeking: ['investment', 'specialist'],
    attachments: [], status: 'published', views: 870, saves: 64, team: 4, createdAt: d(2),
  },
  {
    id: 'p5', ownerId: 'c5', ownerName: 'MedTech Istanbul', ownerKind: 'company', ownerVerified: true,
    title: 'AI asosida rentgen tasvirlarini tahlil qilish',
    summary: "Shifokorlarga o'pka kasalliklarini 2 barobar tez aniqlashga yordam beruvchi AI yordamchi",
    description: "Model 400 000 dan ortiq anonimlashtirilgan tasvirda o'qitilgan, CE sertifikatlash jarayonida. Markaziy Osiyo klinikalarida pilot sinov uchun hamkor klinikalar izlanmoqda.",
    goal: '10 ta klinikada pilot va mahalliy ro\'yxatdan o\'tkazish',
    sector: 'health', country: 'TR', city: 'Istanbul', languages: ['tr', 'en', 'ru'], stage: 'mvp',
    budgetMin: 300000, budgetMax: 500000, durationMonths: 10, contact: 'chat', seeking: ['partner', 'client'],
    attachments: [{ id: 'a5', name: 'Clinical_validation.pdf', size: 3300000 }],
    status: 'published', views: 2140, saves: 133, team: 22, createdAt: d(9),
  },
  {
    id: 'p6', ownerId: 'u6', ownerName: 'Bekzod Rahimov', ownerKind: 'person', ownerVerified: false,
    title: 'Samarqand eko-mehmon uyi tarmog\'i',
    summary: "Tarixiy mahallalarda an'anaviy uslubdagi 12 ta eko mehmon uyi",
    description: "Eski mahalla uylarini mahalliy hunarmandlar bilan ta'mirlab, sayyohlarga autentik tajriba taklif qilamiz. 3 ta uy allaqachon ishlamoqda, bandlik 78%.",
    goal: "Mehmon uylari sonini 12 taga yetkazish va onlayn bron qilish tizimini ishga tushirish",
    sector: 'tourism', country: 'UZ', city: 'Samarqand', languages: ['uz', 'en', 'fr'], stage: 'growth',
    budgetMin: 200000, budgetMax: 350000, durationMonths: 24, contact: 'phone', contactValue: '+998 90 555 12 12', seeking: ['investment', 'partner'],
    attachments: [], status: 'published', views: 1320, saves: 98, team: 9, createdAt: d(15),
  },
  {
    id: 'p7', ownerId: 'c7', ownerName: 'RoboLab Seoul', ownerKind: 'company', ownerVerified: true,
    title: 'Omborlar uchun avtonom robot-yuk tashuvchi',
    summary: "Omborda tovarlarni avtomatik tashuvchi AMR robotlarini Markaziy Osiyoga olib kirish",
    description: "Robotlar mavjud ombor infratuzilmasiga 2 haftada integratsiya qilinadi. Distribyutor va xizmat ko'rsatish hamkori izlanmoqda.",
    goal: 'Mintaqada 3 ta rasmiy distribyutor tayinlash',
    sector: 'ai', country: 'KR', city: 'Seul', languages: ['ko', 'en'], stage: 'scale',
    budgetMin: 500000, budgetMax: 1500000, durationMonths: 12, contact: 'email', contactValue: 'partners@robolab.example', seeking: ['partner', 'client'],
    attachments: [{ id: 'a6', name: 'AMR_catalog.pdf', size: 6400000 }],
    status: 'published', views: 2760, saves: 187, team: 120, createdAt: d(20),
  },
  {
    id: 'p8', ownerId: 'u8', ownerName: 'Aziza Yusupova', ownerKind: 'person', ownerVerified: true,
    title: 'Hunarmand — milliy hunarmandchilik onlayn do\'koni',
    summary: "O'zbek hunarmandlari mahsulotlarini Yevropa va AQShga eksport qiluvchi marketplace",
    description: "Kulolchilik, zardo'zlik, suzani va boshqa buyumlar. Xalqaro yetkazib berish va to'lov integratsiyasi tayyor. 240 ta hunarmand ro'yxatdan o'tgan.",
    goal: 'Yillik eksport hajmini $1 mln ga yetkazish',
    sector: 'ecommerce', country: 'UZ', city: 'Buxoro', languages: ['uz', 'en', 'de'], stage: 'growth',
    budgetMin: 60000, budgetMax: 120000, durationMonths: 12, contact: 'chat', seeking: ['investment', 'client'],
    attachments: [], status: 'published', views: 1650, saves: 141, team: 7, createdAt: d(5),
  },
  {
    id: 'p9', ownerId: 'u9', ownerName: 'Lars Becker', ownerKind: 'person', ownerVerified: true,
    title: 'GreenCycle — plastik chiqindini qayta ishlash',
    summary: "PET chiqindidan qurilish plitalari ishlab chiqaruvchi modul zavod",
    description: "Germaniyada sinovdan o'tgan texnologiya. Bitta modul kuniga 6 tonna plastikni qayta ishlaydi. Mahalliy hamkor va yer maydoni izlanmoqda.",
    goal: 'Mintaqada 2 ta modul zavod ochish',
    sector: 'ecology', country: 'DE', city: 'Gamburg', languages: ['de', 'en', 'ru'], stage: 'mvp',
    budgetMin: 400000, budgetMax: 900000, durationMonths: 14, contact: 'chat', seeking: ['partner', 'investment'],
    attachments: [{ id: 'a7', name: 'GreenCycle_overview.pdf', size: 2900000 }],
    status: 'published', views: 990, saves: 77, team: 11, createdAt: d(8),
  },
  {
    id: 'p10', ownerId: 'u10', ownerName: 'Kamola Tursunova', ownerKind: 'person', ownerVerified: false,
    title: "Bolalar uchun robototexnika to'garaklari",
    summary: "Viloyat maktablarida 8–16 yoshli bolalar uchun robototexnika va dasturlash to'garaklari",
    description: "Har bir to'garak uchun 15 ta robototexnika to'plami va o'qituvchilarni tayyorlash. Ijtimoiy loyiha — kam ta'minlangan oilalar farzandlari uchun bepul.",
    goal: "20 ta maktabda to'garak ochish",
    sector: 'charity', country: 'UZ', city: 'Qarshi', languages: ['uz'], stage: 'idea',
    budgetMin: 15000, budgetMax: 40000, durationMonths: 9, contact: 'chat', seeking: ['partner', 'investment'],
    attachments: [], status: 'published', views: 420, saves: 51, team: 3, createdAt: d(1),
  },
  {
    id: 'p11', ownerId: 'c11', ownerName: 'Yums Mobility', ownerKind: 'company', ownerVerified: true,
    title: 'YUMS Taxi — shaharlararo yo\'nalishlar',
    summary: "Toshkent–Samarqand–Buxoro yo'nalishida qat'iy narxli shaharlararo taksi xizmati",
    description: "YUMS Taxi ilovasi negizida shaharlararo safarlarni oldindan bron qilish, o'rindiq bo'yicha to'lash va haydovchi reytingi. Haydovchilar hamkor parki izlanmoqda.",
    goal: '500 ta hamkor haydovchini ulash',
    sector: 'transport', country: 'UZ', city: 'Toshkent', languages: ['uz', 'ru'], stage: 'mvp',
    budgetMin: 100000, budgetMax: 250000, durationMonths: 8, contact: 'chat', seeking: ['partner', 'client'],
    attachments: [], status: 'published', views: 2310, saves: 120, boosted: true, team: 18, createdAt: d(4),
  },
  {
    id: 'p12', ownerId: 'u12', ownerName: 'Grace Okafor', ownerKind: 'person', ownerVerified: false,
    title: 'PayRemit — Afrika va Osiyo o\'rtasida pul o\'tkazmalari',
    summary: "Litsenziyalangan to'lov hamkorlari orqali arzon xalqaro pul o'tkazmalari",
    description: "Nigeriya va BAA o'rtasidagi pul o'tkazmalari komissiyasini 3 barobar kamaytiradi. Loyiha litsenziyalangan to'lov tashkiloti bilan hamkorlikda ishlaydi; mustaqil moliyaviy xizmat ko'rsatmaydi.",
    goal: "Litsenziyalangan hamkorlar tarmog'ini 4 ta mamlakatga kengaytirish",
    sector: 'finance', country: 'NG', city: 'Lagos', languages: ['en', 'ar'], stage: 'prototype',
    budgetMin: 200000, budgetMax: 400000, durationMonths: 12, contact: 'chat', seeking: ['investment', 'partner'],
    attachments: [], status: 'published', views: 610, saves: 39, team: 5, createdAt: d(11),
  },
  {
    id: 'p13', ownerId: 'u13', ownerName: 'Nodir Aliyev', ownerKind: 'person', ownerVerified: false,
    title: 'Kafolatlangan daromad — kripto fond',
    summary: 'Oyiga 30% kafolatlangan daromad, minimal kiritma $500',
    description: "Mablag'ingizni kriptovalyutaga joylashtiring va har oy 30% foyda oling. 100% foyda kafolati.",
    goal: '1000 ta investor jalb qilish',
    sector: 'finance', country: 'AE', city: 'Dubay', languages: ['uz', 'ru'], stage: 'idea',
    budgetMin: 500, budgetMax: 1000000, durationMonths: 12, contact: 'phone', contactValue: '+971 50 000 0000', seeking: ['investment'],
    attachments: [], status: 'review', views: 0, saves: 0, team: 1, createdAt: d(0),
  },
];

export const SEED_COMPANIES: Company[] = [
  {
    id: 'c1', name: 'AgroSmart LLC', color: '#16A34A', country: 'UZ', city: "Farg'ona", sector: 'agro',
    about: "Qishloq xo'jaligi uchun IoT va sun'iy intellekt yechimlari. 2019-yildan beri 300 dan ortiq fermer xo'jaligi bilan ishlaymiz.",
    services: [{ title: "Sug'orish tizimini o'rnatish", price: '$450 / ga' }, { title: 'Tuproq tahlili', price: '$35' }, { title: 'Agro-konsalting', price: '$60 / soat' }],
    offers: [{ id: 'o1', title: 'Distribyutorlar izlanmoqda', desc: "Qozog'iston va Qirg'izistonda rasmiy distribyutor bo'ling — 25% marja" }],
    verified: true, plan: 'business', employees: '50–100', founded: 2019, rating: 4.8, languages: ['uz', 'ru', 'en'], website: 'agrosmart.example',
  },
  {
    id: 'c3', name: 'SunPower Central Asia', color: '#EAB308', country: 'UZ', city: 'Toshkent', sector: 'energy',
    about: "Quyosh va shamol elektr stansiyalarini loyihalash va qurish. 140 MVt dan ortiq quvvat ishga tushirilgan.",
    services: [{ title: 'Quyosh panellarini o\'rnatish (tijorat)', price: '$0.62 / Vt' }, { title: 'Energiya auditi', price: '$900 dan' }],
    offers: [{ id: 'o2', title: 'EPC subpudratchilar', desc: 'Navoiy loyihasi uchun montaj va elektr ishlari bo\'yicha hamkorlar' }, { id: 'o3', title: 'Panel yetkazib beruvchilar', desc: 'Tier-1 ishlab chiqaruvchilardan narx takliflari qabul qilinadi' }],
    verified: true, plan: 'business', employees: '100–250', founded: 2016, rating: 4.7, languages: ['uz', 'ru', 'en', 'zh'],
  },
  {
    id: 'c5', name: 'MedTech Istanbul', color: '#DC2626', country: 'TR', city: 'Istanbul', sector: 'health',
    about: 'Tibbiy tasvirlarni tahlil qiluvchi AI dasturlar ishlab chiqaruvchi. Turkiya va Yevropada 60 dan ortiq klinika mijozimiz.',
    services: [{ title: 'AI rentgen tahlili (SaaS)', price: '$1.2 / tasvir' }, { title: 'PACS integratsiyasi', price: 'Kelishuv asosida' }],
    offers: [{ id: 'o4', title: 'Klinikalar uchun pilot', desc: '3 oy bepul sinov — Markaziy Osiyo klinikalari uchun' }],
    verified: true, plan: 'pro', employees: '20–50', founded: 2020, rating: 4.9, languages: ['tr', 'en', 'ru'],
  },
  {
    id: 'c7', name: 'RoboLab Seoul', color: '#7A4DF0', country: 'KR', city: 'Seul', sector: 'ai',
    about: 'Avtonom mobil robotlar (AMR) va ombor avtomatlashtirish tizimlari.',
    services: [{ title: 'AMR robot ijarasi', price: '$1 200 / oy' }, { title: 'Ombor avtomatlashtirish loyihasi', price: 'Kelishuv asosida' }],
    offers: [{ id: 'o5', title: 'Rasmiy distribyutor', desc: 'Markaziy Osiyo va Kavkaz uchun eksklyuziv distribyutorlik' }],
    verified: true, plan: 'business', employees: '100–250', founded: 2015, rating: 4.6, languages: ['ko', 'en'],
  },
  {
    id: 'c11', name: 'Yums Mobility', color: '#FFC800', country: 'UZ', city: 'Toshkent', sector: 'transport',
    about: "YUMS Taxi va YUMS Delivery xizmatlari operatori. Toshkent bo'ylab 24/7 taksi va yetkazish.",
    services: [{ title: 'Korporativ taksi', price: "Oylik hisob" }, { title: 'Hujjat va posilka yetkazish', price: '10 000 so\'mdan' }],
    offers: [{ id: 'o6', title: 'Korporativ mijozlar', desc: 'Xodimlaringiz safarlari uchun yagona hisob va 10% chegirma' }],
    verified: true, plan: 'business', employees: '250+', founded: 2024, rating: 4.8, languages: ['uz', 'ru'],
  },
  {
    id: 'c20', name: 'Silk Road Logistics', color: '#9333EA', country: 'KZ', city: 'Almati', sector: 'logistics',
    about: 'Xitoy — Markaziy Osiyo — Yevropa yo\'nalishida temir yo\'l va avtomobil yuk tashish.',
    services: [{ title: 'FTL yuk tashish', price: '$1.4 / km' }, { title: 'Bojxona rasmiylashtiruvi', price: '$180 dan' }, { title: 'Omborxona xizmati', price: '$4 / m² oy' }],
    offers: [{ id: 'o7', title: 'Konsolidatsiya qilingan yuklar', desc: 'Kichik eksportchilar uchun haftalik guruh jo\'natmalari' }],
    verified: true, plan: 'pro', employees: '100–250', founded: 2012, rating: 4.5, languages: ['kk', 'ru', 'en', 'zh'],
  },
  {
    id: 'c21', name: 'PixelForge Studio', color: '#DB2777', country: 'PL', city: 'Varshava', sector: 'design',
    about: 'Brending, UI/UX va motion dizayn studiyasi. Startaplar uchun maxsus paketlar.',
    services: [{ title: 'Brend identifikatsiyasi', price: '$2 500 dan' }, { title: 'Mobil ilova UI/UX', price: '$4 000 dan' }, { title: 'Pitch-deck dizayni', price: '$600' }],
    offers: [{ id: 'o8', title: 'Startap paketi', desc: 'Logo + sayt + pitch-deck — 30% chegirma YUMS foydalanuvchilariga' }],
    verified: false, plan: 'pro', employees: '10–20', founded: 2018, rating: 4.9, languages: ['en', 'ru'],
  },
  {
    id: 'c22', name: 'BuildPro Group', color: '#B45309', country: 'AE', city: 'Dubay', sector: 'realestate',
    about: "Tijorat va turar-joy qurilishi, loyihalarni boshqarish. BAA, Saudiya Arabistoni va O'zbekistonda loyihalar.",
    services: [{ title: 'Loyiha menejmenti', price: 'Kelishuv asosida' }, { title: 'Arxitektura loyihalash', price: '$18 / m²' }],
    offers: [{ id: 'o9', title: 'Mahalliy pudratchilar', desc: "Toshkentdagi biznes markaz qurilishi uchun subpudratchilar" }],
    verified: true, plan: 'business', employees: '250+', founded: 2008, rating: 4.4, languages: ['ar', 'en', 'ru'],
  },
];

export const SEED_INVESTORS: Investor[] = [
  { id: 'i1', name: 'Silk Ventures', kind: 'fund', country: 'UZ', about: "Markaziy Osiyodagi texnologik startaplarga ilk bosqichda sarmoya kiritadi.", ticketMin: 50000, ticketMax: 500000, sectors: ['it', 'ai', 'education', 'finance'], stages: ['mvp', 'growth'], verified: true, licensed: true, deals: 24 },
  { id: 'i2', name: 'Aral Green Fund', kind: 'fund', country: 'KZ', about: 'Ekologiya, energetika va barqaror qishloq xo\'jaligi loyihalari.', ticketMin: 250000, ticketMax: 5000000, sectors: ['energy', 'ecology', 'agro'], stages: ['growth', 'scale'], verified: true, licensed: true, deals: 11 },
  { id: 'i3', name: 'Timur Saidov', kind: 'angel', country: 'UZ', about: 'Serial tadbirkor, e-commerce va logistika bo\'yicha mentor.', ticketMin: 10000, ticketMax: 75000, sectors: ['ecommerce', 'logistics', 'startup'], stages: ['idea', 'prototype', 'mvp'], verified: true, licensed: false, deals: 9 },
  { id: 'i4', name: 'Bosphorus Capital', kind: 'fund', country: 'TR', about: "Sog'liqni saqlash va AI loyihalariga ixtisoslashgan venchur fond.", ticketMin: 200000, ticketMax: 2000000, sectors: ['health', 'ai', 'science'], stages: ['mvp', 'growth'], verified: true, licensed: true, deals: 31 },
  { id: 'i5', name: 'Tashkent Startup Hub', kind: 'accelerator', country: 'UZ', about: '3 oylik akseleratsiya dasturi, $25 000 grant va mentorlar.', ticketMin: 10000, ticketMax: 25000, sectors: ['it', 'startup', 'education', 'eservices'], stages: ['idea', 'prototype'], verified: true, licensed: false, deals: 58 },
  { id: 'i6', name: 'Gulf Infrastructure Partners', kind: 'corporate', country: 'AE', about: 'Infratuzilma, qurilish va energetika loyihalarida hamkorlik.', ticketMin: 2000000, ticketMax: 30000000, sectors: ['realestate', 'energy', 'logistics', 'tourism'], stages: ['scale'], verified: true, licensed: true, deals: 7 },
];

export const SEED_MARKET: MarketItem[] = [
  { id: 'm1', title: 'Quyosh paneli 550 Vt (Tier-1)', kind: 'goods', price: 118, unit: 'dona', sellerId: 'c3', sellerName: 'SunPower Central Asia', sellerVerified: true, country: 'UZ', sector: 'energy', desc: "Monokristall panel, 25 yil kafolat. Ulgurji buyurtmalar uchun maxsus narx.", delivery: "O'zbekiston bo'ylab 3–5 kun", minOrder: '20 dona', status: 'published', createdAt: d(4) },
  { id: 'm2', title: 'Quritilgan o\'rik, eksport sifati', kind: 'goods', price: 3.8, unit: 'kg', sellerId: 'u30', sellerName: "Farg'ona Agro Export", sellerVerified: true, country: 'UZ', sector: 'agro', desc: "Shakar qo'shilmagan, GOST va EU standartlari bo'yicha sertifikatlangan.", delivery: 'FOB Toshkent', minOrder: '1 tonna', status: 'published', createdAt: d(7) },
  { id: 'm3', title: 'Suzani — qo\'lda tikilgan, 2×1.5 m', kind: 'goods', price: 340, unit: 'dona', sellerId: 'u8', sellerName: 'Aziza Yusupova', sellerVerified: true, country: 'UZ', sector: 'ecommerce', desc: "Buxoro ustalari tomonidan ipak iplar bilan tikilgan. Har bir buyum yagona nusxada.", delivery: 'Xalqaro DHL, 5–9 kun', status: 'published', createdAt: d(2) },
  { id: 'm4', title: 'Biznes-reja shabloni (Excel + Word)', kind: 'digital', price: 29, sellerId: 'u31', sellerName: 'StartupKit', sellerVerified: false, country: 'EE', sector: 'startup', desc: "Moliyaviy model, P&L, cash-flow va investorlar uchun taqdimot tuzilmasi. O'zbek, rus, ingliz tillarida.", status: 'published', createdAt: d(10) },
  { id: 'm5', title: 'Mobil ilova UI kit (Figma)', kind: 'digital', price: 49, sellerId: 'c21', sellerName: 'PixelForge Studio', sellerVerified: false, country: 'PL', sector: 'design', desc: '320+ komponent, yorug\' va qorong\'i mavzu, taksi va e-commerce ekranlari.', status: 'published', createdAt: d(5) },
  { id: 'm6', title: 'Onlayn kurs: Python va Data Science', kind: 'digital', price: 79, sellerId: 'u2', sellerName: 'EduBridge', sellerVerified: true, country: 'UZ', sector: 'education', desc: "60 soatlik video, amaliy loyihalar va sertifikat. O'zbek tilida.", status: 'published', createdAt: d(3) },
  { id: 'm7', title: 'Bojxona rasmiylashtiruvi', kind: 'service', price: 180, unit: 'deklaratsiya', sellerId: 'c20', sellerName: 'Silk Road Logistics', sellerVerified: true, country: 'KZ', sector: 'logistics', desc: 'Eksport-import deklaratsiyalari, sertifikatlar va litsenziyalar bo\'yicha yordam.', status: 'published', createdAt: d(6) },
  { id: 'm8', title: 'Saytni ingliz va rus tiliga tarjima', kind: 'service', price: 0.06, unit: "so'z", sellerId: 'u32', sellerName: 'LinguaPro', sellerVerified: true, country: 'UZ', sector: 'eservices', desc: "Texnik, yuridik va marketing matnlari. Ona tili egalari tomonidan tahrir.", status: 'published', createdAt: d(9) },
  { id: 'm9', title: 'Sanoat 3D printeri FDM-600', kind: 'goods', price: 7400, unit: 'dona', sellerId: 'u33', sellerName: 'Shenzhen MakerTech', sellerVerified: true, country: 'CN', sector: 'manufacturing', desc: '600×600×600 mm bosma maydoni, sanoat plastmassalari. O\'rnatish va o\'qitish bilan.', delivery: 'Toshkentgacha 21 kun', minOrder: '1 dona', status: 'published', createdAt: d(13) },
  { id: 'm10', title: 'Yuridik maslahat: MChJ ochish', kind: 'service', price: 120, unit: 'paket', sellerId: 'u34', sellerName: 'LexAsia Advokatlik byurosi', sellerVerified: true, country: 'UZ', sector: 'legal', desc: "Xorijiy investitsiyali korxonani ro'yxatdan o'tkazish, ustav va bank hisobini ochish.", status: 'published', createdAt: d(1) },
];

export const SEED_SPECIALISTS: Specialist[] = [
  { id: 's1', name: 'Jamshid Nematov', title: 'Senior React Native dasturchi', skills: ['React Native', 'TypeScript', 'Expo', 'Node.js'], country: 'UZ', city: 'Toshkent', languages: ['uz', 'ru', 'en'], rate: 35, rating: 4.9, reviews: 47, available: true, remote: true, verified: true, sector: 'it', experience: 7, about: "Taksi, yetkazib berish va fintex ilovalari ishlab chiqishda 7 yillik tajriba. 20+ ilova App Store va Google Play'da." },
  { id: 's2', name: 'Elena Volkova', title: 'UI/UX dizayner', skills: ['Figma', 'Design system', 'User research', 'Prototyping'], country: 'GE', city: 'Tbilisi', languages: ['ru', 'en'], rate: 40, rating: 5.0, reviews: 63, available: true, remote: true, verified: true, sector: 'design', experience: 9, about: 'Mobil va veb mahsulotlar uchun foydalanuvchi tajribasi. Avval Yandex va Kaspi loyihalarida ishlagan.' },
  { id: 's3', name: 'Rustam Qodirov', title: 'Machine Learning muhandisi', skills: ['Python', 'PyTorch', 'Computer vision', 'MLOps'], country: 'UZ', city: 'Toshkent', languages: ['uz', 'ru', 'en'], rate: 45, rating: 4.8, reviews: 21, available: false, remote: true, verified: true, sector: 'ai', experience: 6, about: "Tasvirni aniqlash va tavsiya tizimlari. INHA universiteti magistri." },
  { id: 's4', name: 'Ahmet Yılmaz', title: 'Mexatronika muhandisi', skills: ['PLC', 'SCADA', 'Robototexnika', 'AutoCAD'], country: 'TR', city: 'Bursa', languages: ['tr', 'en'], rate: 30, rating: 4.7, reviews: 18, available: true, remote: false, verified: false, sector: 'manufacturing', experience: 11, about: 'Zavodlarni avtomatlashtirish va ishlab chiqarish liniyalarini ishga tushirish.' },
  { id: 's5', name: 'Malika Xasanova', title: 'Biznes-tahlilchi / Product manager', skills: ['Product discovery', 'Jira', 'SQL', 'Unit-ekonomika'], country: 'UZ', city: 'Samarqand', languages: ['uz', 'ru', 'en'], rate: 28, rating: 4.9, reviews: 32, available: true, remote: true, verified: true, sector: 'startup', experience: 5, about: 'MVP talablarini aniqlash, foydalanuvchi ssenariylari va roadmap tuzish.' },
  { id: 's6', name: 'David Miller', title: 'DevOps va kiberxavfsizlik', skills: ['AWS', 'Kubernetes', 'ISO 27001', 'Pentest'], country: 'GB', city: 'London', languages: ['en'], rate: 75, rating: 4.9, reviews: 54, available: true, remote: true, verified: true, sector: 'it', experience: 13, about: "Xavfsiz infratuzilma, zaxira nusxalar va monitoring. GDPR talablariga moslashtirish." },
  { id: 's7', name: 'Sardor Ergashev', title: 'QA tester (avtomatlashtirish)', skills: ['Detox', 'Playwright', 'Appium', 'CI/CD'], country: 'UZ', city: 'Namangan', languages: ['uz', 'ru'], rate: 18, rating: 4.6, reviews: 15, available: true, remote: true, verified: false, sector: 'it', experience: 4, about: 'Mobil va veb ilovalar uchun avtomatik testlar.' },
  { id: 's8', name: 'Fatima Al-Sayed', title: 'Yurist — GDPR va xalqaro huquq', skills: ['GDPR', 'Shartnomalar', 'Korporativ huquq', 'IP'], country: 'AE', city: 'Abu-Dabi', languages: ['ar', 'en', 'fr'], rate: 90, rating: 5.0, reviews: 29, available: true, remote: true, verified: true, sector: 'legal', experience: 12, about: "Raqamli platformalar uchun maxfiylik siyosati, foydalanish shartlari va investitsion kelishuvlar." },
  { id: 's9', name: 'Oybek Karimov', title: 'Backend dasturchi (Go, PostgreSQL)', skills: ['Go', 'PostgreSQL', 'gRPC', 'Redis'], country: 'UZ', city: 'Toshkent', languages: ['uz', 'ru', 'en'], rate: 32, rating: 4.8, reviews: 26, available: true, remote: true, verified: true, sector: 'it', experience: 6, about: "Yuqori yuklamali API va to'lov tizimlari." },
  { id: 's10', name: 'Li Wei', title: 'Agrotexnolog', skills: ['Gidroponika', 'Issiqxonalar', "Tomchilatib sug'orish"], country: 'CN', city: 'Shandong', languages: ['zh', 'en', 'ru'], rate: 38, rating: 4.7, reviews: 12, available: true, remote: false, verified: true, sector: 'agro', experience: 15, about: 'Zamonaviy issiqxona majmualarini loyihalash va ishga tushirish.' },
];

export const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'cv1', peerId: 'c1', peerName: 'AgroSmart LLC', peerKind: 'company', peerVerified: true, kind: 'chat', unread: 2,
    messages: [
      { id: 'x1', from: 'me', text: "Assalomu alaykum! Sug'orish tizimi loyihangiz qiziqtirdi. Qozog'istonda distribyutorlik shartlari qanday?", at: d(1) },
      { id: 'x2', from: 'them', text: 'Vaalaykum assalom! Rahmat. Distribyutorlarga 25% marja va texnik o\'qitishni taklif qilamiz.', at: d(1) },
      { id: 'x3', from: 'them', text: 'Shartlar bilan batafsil tanishing.', at: d(0.9), file: { id: 'f1', name: 'Distribyutor_shartlari.pdf', size: 820000 } },
    ],
  },
  {
    id: 'cv2', peerId: 'i3', peerName: 'Timur Saidov', peerKind: 'investor', peerVerified: true, kind: 'request', incoming: true, requestStatus: 'pending', subject: "Hamkorlik so'rovi: investitsiya", unread: 1,
    messages: [
      { id: 'x4', from: 'them', text: "Salom! Loyihalaringizni ko'rib chiqdim. Unit-ekonomika va hozirgi ko'rsatkichlar bo'yicha qisqa qo'ng'iroq qilsak bo'ladimi?", at: d(0.3) },
    ],
  },
  {
    id: 'cv3', peerId: 's2', peerName: 'Elena Volkova', peerKind: 'specialist', peerVerified: true, kind: 'chat', unread: 0,
    messages: [
      { id: 'x5', from: 'me', text: 'Elena, mobil ilova uchun dizayn tizimi kerak. 4 hafta ichida ulgurasizmi?', at: d(3) },
      { id: 'x6', from: 'them', text: "Ha, albatta. Brif yuboring, baholab beraman.", at: d(3) },
    ],
  },
  {
    id: 'cv4', peerId: 'support', peerName: 'YUMS qo\'llab-quvvatlash', peerKind: 'support', peerVerified: true, kind: 'chat', unread: 1,
    messages: [
      { id: 'x7', from: 'them', text: "YUMS platformasiga xush kelibsiz! Savollaringiz bo'lsa shu yerga yozing — 24/7 javob beramiz.", at: d(0.5) },
    ],
  },
];

export const SEED_REPORTS: Report[] = [
  { id: 'rp1', targetKind: 'project', targetId: 'p13', targetTitle: 'Kafolatlangan daromad — kripto fond', reason: 'Soxta investitsiya taklifi', note: "Oyiga 30% «kafolat» va'da qilinmoqda, litsenziya yo'q", by: 'Foydalanuvchi #4821', status: 'open', createdAt: d(0.2) },
  { id: 'rp2', targetKind: 'market', targetId: 'm4', targetTitle: 'Biznes-reja shabloni (Excel + Word)', reason: 'Mualliflik huquqi buzilishi', note: 'Shablon boshqa saytdan nusxa olinganga o\'xshaydi', by: 'Foydalanuvchi #1290', status: 'open', createdAt: d(1) },
  { id: 'rp3', targetKind: 'specialist', targetId: 's7', targetTitle: 'Sardor Ergashev', reason: 'Spam yoki takroriy e\'lon', by: 'Foydalanuvchi #7712', status: 'dismissed', action: 'Asos topilmadi', createdAt: d(5) },
];

export const SEED_VERIFICATIONS: Verification[] = [
  { id: 'v1', name: 'PixelForge Studio', kind: 'company', country: 'PL', docs: ["Ro'yxatdan o'tganlik guvohnomasi", 'Direktor pasporti'], status: 'pending', createdAt: d(1) },
  { id: 'v2', name: 'Arman Seitkali', kind: 'person', country: 'KZ', docs: ['ID karta', 'Selfi'], status: 'pending', createdAt: d(2) },
];

export const SEED_NOTICES: Notice[] = [
  { id: 'n1', icon: 'chatbubble-ellipses', title: 'AgroSmart LLC', text: 'Distribyutor_shartlari.pdf faylini yubordi', at: d(0.9), read: false, href: '/chat/cv1' },
  { id: 'n2', icon: 'people', title: "Yangi hamkorlik so'rovi", text: 'Timur Saidov siz bilan bog\'lanmoqchi', at: d(0.3), read: false, href: '/chat/cv2' },
  { id: 'n3', icon: 'sparkles', title: 'YUMS platformasiga xush kelibsiz', text: "Profilingizni to'ldiring va birinchi loyihangizni joylashtiring", at: d(0.5), read: true, href: '/profile-edit' },
];
