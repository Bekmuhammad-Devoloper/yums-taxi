// Ko'p tilli matnlar: o'zbek (asosiy), rus, ingliz, tojik va arab (o'ngdan chapga) tillari.
// Ikki xil kalit: platforma qobig'i uchun nomli kalitlar — t('tab.home'), qolgan barcha matnlar uchun
// o'zbekcha matnning o'zi — tr("Liniyaga chiqish"); tarjimalar src/lib/locales jadvallarida.
// Tarjima topilmasa o'zbekcha matn ko'rsatiladi. Foydalanuvchi kiritgan kontent (loyiha, e'lon, chat) tarjima qilinmaydi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { getLocales } from 'expo-localization';
import { I18nManager, Platform } from 'react-native';

import { PHRASES } from './locales';

export type Lang = 'uz' | 'ru' | 'en' | 'tg' | 'ar';

/** country — bayroq rasmi (src/lib/flags.ts) */
export const LANGS: { id: Lang; label: string; country: string; locale: string; rtl?: boolean }[] = [
  { id: 'uz', label: "O'zbekcha", country: 'UZ', locale: 'uz-UZ' },
  { id: 'ru', label: 'Русский', country: 'RU', locale: 'ru-RU' },
  { id: 'en', label: 'English', country: 'GB', locale: 'en-GB' },
  { id: 'tg', label: 'Тоҷикӣ', country: 'TJ', locale: 'tg-TJ' },
  { id: 'ar', label: 'العربية', country: 'SA', locale: 'ar', rtl: true },
];
const LANG_IDS = LANGS.map(l => l.id);
export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANG_IDS as string[]).includes(v);

const uz = {
  'tab.home': 'Asosiy',
  'home.kicker': 'YUMS · XALQARO RAQAMLI PLATFORMA',
  'home.statProjects': 'loyiha',
  'home.statCountries': 'mamlakat',
  'home.statSectors': 'soha',
  'home.taxiTitle': 'Qayerga boramiz?',
  'home.taxiEta': '3 daqiqada',
  'home.taxiChip': 'Yaqin haydovchi · 3 daq',
  'tab.world': 'Qidiruv',
  'tab.create': 'Loyiha',
  'tab.connect': 'Xabarlar',
  'tab.profile': 'Kabinet',

  'home.hello': 'Salom',
  'home.tagline': 'Dunyo loyihalari bitta platformada',
  'home.search': 'Loyiha, kompaniya, mutaxassis…',
  'home.sections': "Bo'limlar",
  'home.services': 'Xizmatlar',
  'home.sectors': 'Sohalar',
  'home.featured': 'Tavsiya etilgan loyihalar',
  'home.new': 'Yangi loyihalar',
  'home.experts': 'Mutaxassislar',
  'home.companies': 'Kompaniyalar',
  'home.all': 'Barchasi',
  'home.ad': 'Reklama',
  'home.createTitle': "G'oyangiz bormi?",
  'home.createSub': "Loyihani joylashtiring — investor, hamkor va mutaxassislar sizni topadi",
  'home.createBtn': 'Loyiha yaratish',
  'home.verifyTitle': 'Profilingizni tasdiqlang',
  'home.verifySub': 'Tasdiqlangan profillarga ishonch 4 barobar yuqori',

  'sec.project': 'Loyihalarni joylashtirish va topish',
  'sec.business': 'Kompaniyalar, xizmatlar, B2B',
  'sec.invest': 'Investorlar va moliyalashtirish',
  'sec.market': 'Tovarlar va raqamli mahsulotlar',
  'sec.technology': 'Dasturchi, muhandis, dizayner',
  'sec.connect': 'Xabarlar, uchrashuvlar, hujjatlar',
  'sec.world': "Mamlakat va til bo'yicha qidiruv",
  'sec.taxi': "Taksi chaqirish va yetkazish",

  'world.title': 'YUMS World',
  'world.placeholder': 'Qidirish…',
  'world.filters': 'Filtrlar',
  'world.results': 'natija',
  'world.reset': 'Tozalash',
  'world.apply': "Ko'rsatish",
  'world.sector': 'Soha',
  'world.country': 'Mamlakat',
  'world.language': 'Til',
  'world.stage': 'Bosqich',
  'world.sort': 'Saralash',
  'world.empty': 'Hech narsa topilmadi',
  'world.emptySub': "Filtrlarni o'zgartirib ko'ring",

  'type.projects': 'Loyihalar',
  'type.companies': 'Kompaniyalar',
  'type.specialists': 'Mutaxassislar',
  'type.market': 'Bozor',
  'type.investors': 'Investorlar',

  'connect.title': 'YUMS Connect',
  'connect.chats': 'Chatlar',
  'connect.requests': "So'rovlar",
  'connect.meetings': 'Uchrashuvlar',

  'profile.title': 'Shaxsiy kabinet',
  'profile.myProjects': 'Mening loyihalarim',
  'profile.favorites': 'Saqlanganlar',
  'profile.notifications': 'Bildirishnomalar',
  'profile.plan': 'Tarif va reklama',
  'profile.verify': 'Profilni tasdiqlash',
  'profile.security': 'Xavfsizlik va zaxira',
  'profile.moderation': 'Moderatsiya paneli',
  'profile.settings': 'Sozlamalar',
  'profile.legal': 'Huquqiy hujjatlar',
  'profile.about': 'Platforma haqida',
  'profile.support': 'Yordam',
  'profile.logout': 'Chiqish',
  'profile.edit': 'Profilni tahrirlash',
  'profile.taxi': 'YUMS Taxi',

  'settings.title': 'Sozlamalar',
  'settings.appearance': "Ko'rinish",
  'settings.language': 'Til',
  'settings.system': 'Tizim',
  'settings.light': "Yorug'",
  'settings.dark': "Qorong'i",
  'settings.notifications': 'Bildirishnomalar',
  'settings.account': 'Hisob',

  'common.save': 'Saqlash',
  'common.cancel': 'Bekor qilish',
  'common.send': 'Yuborish',
  'common.verified': 'Tasdiqlangan',
  'common.write': 'Yozish',
  'common.report': 'Shikoyat qilish',
};

type Dict = Record<keyof typeof uz, string>;
export type TKey = keyof typeof uz;

const ru: Dict = {
  'tab.home': 'Главная',
  'home.kicker': 'YUMS · МЕЖДУНАРОДНАЯ ЦИФРОВАЯ ПЛАТФОРМА',
  'home.statProjects': 'проектов',
  'home.statCountries': 'стран',
  'home.statSectors': 'отраслей',
  'home.taxiTitle': 'Куда едем?',
  'home.taxiEta': 'за 3 минуты',
  'home.taxiChip': 'Водитель рядом · 3 мин',
  'tab.world': 'Поиск',
  'tab.create': 'Проект',
  'tab.connect': 'Сообщения',
  'tab.profile': 'Кабинет',

  'home.hello': 'Привет',
  'home.tagline': 'Проекты всего мира на одной платформе',
  'home.search': 'Проект, компания, специалист…',
  'home.sections': 'Разделы',
  'home.services': 'Сервисы',
  'home.sectors': 'Отрасли',
  'home.featured': 'Рекомендуемые проекты',
  'home.new': 'Новые проекты',
  'home.experts': 'Специалисты',
  'home.companies': 'Компании',
  'home.all': 'Все',
  'home.ad': 'Реклама',
  'home.createTitle': 'Есть идея?',
  'home.createSub': 'Разместите проект — инвесторы, партнёры и специалисты найдут вас',
  'home.createBtn': 'Создать проект',
  'home.verifyTitle': 'Подтвердите профиль',
  'home.verifySub': 'Подтверждённым профилям доверяют в 4 раза больше',

  'sec.project': 'Размещение и поиск проектов',
  'sec.business': 'Компании, услуги, B2B',
  'sec.invest': 'Инвесторы и финансирование',
  'sec.market': 'Товары и цифровые продукты',
  'sec.technology': 'Разработчики, инженеры, дизайнеры',
  'sec.connect': 'Сообщения, встречи, документы',
  'sec.world': 'Поиск по странам и языкам',
  'sec.taxi': 'Вызов такси и доставка',

  'world.title': 'YUMS World',
  'world.placeholder': 'Поиск…',
  'world.filters': 'Фильтры',
  'world.results': 'результатов',
  'world.reset': 'Сбросить',
  'world.apply': 'Показать',
  'world.sector': 'Отрасль',
  'world.country': 'Страна',
  'world.language': 'Язык',
  'world.stage': 'Стадия',
  'world.sort': 'Сортировка',
  'world.empty': 'Ничего не найдено',
  'world.emptySub': 'Попробуйте изменить фильтры',

  'type.projects': 'Проекты',
  'type.companies': 'Компании',
  'type.specialists': 'Специалисты',
  'type.market': 'Маркет',
  'type.investors': 'Инвесторы',

  'connect.title': 'YUMS Connect',
  'connect.chats': 'Чаты',
  'connect.requests': 'Запросы',
  'connect.meetings': 'Встречи',

  'profile.title': 'Личный кабинет',
  'profile.myProjects': 'Мои проекты',
  'profile.favorites': 'Избранное',
  'profile.notifications': 'Уведомления',
  'profile.plan': 'Тарифы и реклама',
  'profile.verify': 'Верификация профиля',
  'profile.security': 'Безопасность и резервная копия',
  'profile.moderation': 'Панель модерации',
  'profile.settings': 'Настройки',
  'profile.legal': 'Правовые документы',
  'profile.about': 'О платформе',
  'profile.support': 'Поддержка',
  'profile.logout': 'Выйти',
  'profile.edit': 'Редактировать профиль',
  'profile.taxi': 'YUMS Taxi',

  'settings.title': 'Настройки',
  'settings.appearance': 'Оформление',
  'settings.language': 'Язык',
  'settings.system': 'Системная',
  'settings.light': 'Светлая',
  'settings.dark': 'Тёмная',
  'settings.notifications': 'Уведомления',
  'settings.account': 'Аккаунт',

  'common.save': 'Сохранить',
  'common.cancel': 'Отмена',
  'common.send': 'Отправить',
  'common.verified': 'Подтверждён',
  'common.write': 'Написать',
  'common.report': 'Пожаловаться',
};

const en: Dict = {
  'tab.home': 'Home',
  'home.kicker': 'YUMS · INTERNATIONAL DIGITAL PLATFORM',
  'home.statProjects': 'projects',
  'home.statCountries': 'countries',
  'home.statSectors': 'industries',
  'home.taxiTitle': 'Where to?',
  'home.taxiEta': 'in 3 min',
  'home.taxiChip': 'Driver nearby · 3 min',
  'tab.world': 'Search',
  'tab.create': 'Project',
  'tab.connect': 'Messages',
  'tab.profile': 'Account',

  'home.hello': 'Hello',
  'home.tagline': "The world's projects on one platform",
  'home.search': 'Project, company, specialist…',
  'home.sections': 'Sections',
  'home.services': 'Services',
  'home.sectors': 'Industries',
  'home.featured': 'Featured projects',
  'home.new': 'New projects',
  'home.experts': 'Specialists',
  'home.companies': 'Companies',
  'home.all': 'See all',
  'home.ad': 'Sponsored',
  'home.createTitle': 'Got an idea?',
  'home.createSub': 'Publish your project — investors, partners and experts will find you',
  'home.createBtn': 'Create project',
  'home.verifyTitle': 'Verify your profile',
  'home.verifySub': 'Verified profiles are trusted 4× more',

  'sec.project': 'Publish and discover projects',
  'sec.business': 'Companies, services, B2B',
  'sec.invest': 'Investors and funding',
  'sec.market': 'Goods and digital products',
  'sec.technology': 'Developers, engineers, designers',
  'sec.connect': 'Messages, meetings, documents',
  'sec.world': 'Search by country and language',
  'sec.taxi': 'Ride hailing and delivery',

  'world.title': 'YUMS World',
  'world.placeholder': 'Search…',
  'world.filters': 'Filters',
  'world.results': 'results',
  'world.reset': 'Reset',
  'world.apply': 'Show',
  'world.sector': 'Industry',
  'world.country': 'Country',
  'world.language': 'Language',
  'world.stage': 'Stage',
  'world.sort': 'Sort',
  'world.empty': 'Nothing found',
  'world.emptySub': 'Try changing the filters',

  'type.projects': 'Projects',
  'type.companies': 'Companies',
  'type.specialists': 'Specialists',
  'type.market': 'Market',
  'type.investors': 'Investors',

  'connect.title': 'YUMS Connect',
  'connect.chats': 'Chats',
  'connect.requests': 'Requests',
  'connect.meetings': 'Meetings',

  'profile.title': 'My account',
  'profile.myProjects': 'My projects',
  'profile.favorites': 'Saved',
  'profile.notifications': 'Notifications',
  'profile.plan': 'Plans & ads',
  'profile.verify': 'Verify profile',
  'profile.security': 'Security & backup',
  'profile.moderation': 'Moderation panel',
  'profile.settings': 'Settings',
  'profile.legal': 'Legal documents',
  'profile.about': 'About the platform',
  'profile.support': 'Support',
  'profile.logout': 'Log out',
  'profile.edit': 'Edit profile',
  'profile.taxi': 'YUMS Taxi',

  'settings.title': 'Settings',
  'settings.appearance': 'Appearance',
  'settings.language': 'Language',
  'settings.system': 'System',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.notifications': 'Notifications',
  'settings.account': 'Account',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.send': 'Send',
  'common.verified': 'Verified',
  'common.write': 'Message',
  'common.report': 'Report',
};


const tg: Dict = {
  'tab.home': 'Асосӣ',
  'home.kicker': 'YUMS · ПЛАТФОРМАИ РАҚАМИИ БАЙНАЛМИЛАЛӢ',
  'home.statProjects': 'лоиҳа',
  'home.statCountries': 'кишвар',
  'home.statSectors': 'соҳа',
  'home.taxiTitle': 'Ба куҷо меравем?',
  'home.taxiEta': 'дар 3 дақиқа',
  'home.taxiChip': 'Ронанда наздик · 3 дақ',
  'tab.world': 'Ҷустуҷӯ',
  'tab.create': 'Лоиҳа',
  'tab.connect': 'Паёмҳо',
  'tab.profile': 'Кабинет',

  'home.hello': 'Салом',
  'home.tagline': 'Лоиҳаҳои ҷаҳон дар як платформа',
  'home.search': 'Лоиҳа, ширкат, мутахассис…',
  'home.sections': 'Бахшҳо',
  'home.services': 'Хизматрасониҳо',
  'home.sectors': 'Соҳаҳо',
  'home.featured': 'Лоиҳаҳои тавсияшуда',
  'home.new': 'Лоиҳаҳои нав',
  'home.experts': 'Мутахассисон',
  'home.companies': 'Ширкатҳо',
  'home.all': 'Ҳама',
  'home.ad': 'Реклама',
  'home.createTitle': 'Идея доред?',
  'home.createSub': 'Лоиҳаро ҷойгир кунед — сармоягузорон, шарикон ва мутахассисон шуморо меёбанд',
  'home.createBtn': 'Эҷоди лоиҳа',
  'home.verifyTitle': 'Профилатонро тасдиқ кунед',
  'home.verifySub': 'Ба профилҳои тасдиқшуда 4 маротиба бештар бовар мекунанд',

  'sec.project': 'Ҷойгиркунӣ ва ҷустуҷӯи лоиҳаҳо',
  'sec.business': 'Ширкатҳо, хизматҳо, B2B',
  'sec.invest': 'Сармоягузорон ва маблағгузорӣ',
  'sec.market': 'Молҳо ва маҳсулоти рақамӣ',
  'sec.technology': 'Барномасоз, муҳандис, дизайнер',
  'sec.connect': 'Паёмҳо, вохӯриҳо, ҳуҷҷатҳо',
  'sec.world': 'Ҷустуҷӯ аз рӯи кишвар ва забон',
  'sec.taxi': 'Даъвати такси ва расонидан',

  'world.title': 'YUMS World',
  'world.placeholder': 'Ҷустуҷӯ…',
  'world.filters': 'Филтрҳо',
  'world.results': 'натиҷа',
  'world.reset': 'Тоза кардан',
  'world.apply': 'Нишон додан',
  'world.sector': 'Соҳа',
  'world.country': 'Кишвар',
  'world.language': 'Забон',
  'world.stage': 'Марҳила',
  'world.sort': 'Мураттабсозӣ',
  'world.empty': 'Ҳеҷ чиз ёфт нашуд',
  'world.emptySub': 'Филтрҳоро тағйир диҳед',

  'type.projects': 'Лоиҳаҳо',
  'type.companies': 'Ширкатҳо',
  'type.specialists': 'Мутахассисон',
  'type.market': 'Бозор',
  'type.investors': 'Сармоягузорон',

  'connect.title': 'YUMS Connect',
  'connect.chats': 'Чатҳо',
  'connect.requests': 'Дархостҳо',
  'connect.meetings': 'Вохӯриҳо',

  'profile.title': 'Кабинети шахсӣ',
  'profile.myProjects': 'Лоиҳаҳои ман',
  'profile.favorites': 'Захирашудаҳо',
  'profile.notifications': 'Огоҳиномаҳо',
  'profile.plan': 'Тарифҳо ва реклама',
  'profile.verify': 'Тасдиқи профил',
  'profile.security': 'Амният ва нусхаи эҳтиётӣ',
  'profile.moderation': 'Панели модератсия',
  'profile.settings': 'Танзимот',
  'profile.legal': 'Ҳуҷҷатҳои ҳуқуқӣ',
  'profile.about': 'Дар бораи платформа',
  'profile.support': 'Дастгирӣ',
  'profile.logout': 'Баромадан',
  'profile.edit': 'Таҳрири профил',
  'profile.taxi': 'YUMS Taxi',

  'settings.title': 'Танзимот',
  'settings.appearance': 'Намуди зоҳирӣ',
  'settings.language': 'Забон',
  'settings.system': 'Системавӣ',
  'settings.light': 'Равшан',
  'settings.dark': 'Торик',
  'settings.notifications': 'Огоҳиномаҳо',
  'settings.account': 'Ҳисоб',

  'common.save': 'Нигоҳ доштан',
  'common.cancel': 'Бекор кардан',
  'common.send': 'Фиристодан',
  'common.verified': 'Тасдиқшуда',
  'common.write': 'Навиштан',
  'common.report': 'Шикоят кардан',
};

const ar: Dict = {
  'tab.home': 'الرئيسية',
  'home.kicker': 'YUMS · منصة رقمية دولية',
  'home.statProjects': 'مشروع',
  'home.statCountries': 'دولة',
  'home.statSectors': 'قطاع',
  'home.taxiTitle': 'إلى أين؟',
  'home.taxiEta': 'خلال 3 دقائق',
  'home.taxiChip': 'سائق قريب · 3 د',
  'tab.world': 'بحث',
  'tab.create': 'مشروع',
  'tab.connect': 'الرسائل',
  'tab.profile': 'حسابي',

  'home.hello': 'مرحبًا',
  'home.tagline': 'مشاريع العالم في منصة واحدة',
  'home.search': 'مشروع، شركة، متخصص…',
  'home.sections': 'الأقسام',
  'home.services': 'الخدمات',
  'home.sectors': 'القطاعات',
  'home.featured': 'مشاريع مميزة',
  'home.new': 'مشاريع جديدة',
  'home.experts': 'المتخصصون',
  'home.companies': 'الشركات',
  'home.all': 'الكل',
  'home.ad': 'إعلان',
  'home.createTitle': 'لديك فكرة؟',
  'home.createSub': 'انشر مشروعك — سيجدك المستثمرون والشركاء والخبراء',
  'home.createBtn': 'إنشاء مشروع',
  'home.verifyTitle': 'وثّق ملفك الشخصي',
  'home.verifySub': 'الملفات الموثّقة تحظى بثقة أكبر بأربع مرات',

  'sec.project': 'نشر المشاريع والبحث عنها',
  'sec.business': 'الشركات والخدمات و B2B',
  'sec.invest': 'المستثمرون والتمويل',
  'sec.market': 'السلع والمنتجات الرقمية',
  'sec.technology': 'مطورون ومهندسون ومصممون',
  'sec.connect': 'الرسائل والاجتماعات والمستندات',
  'sec.world': 'البحث حسب الدولة واللغة',
  'sec.taxi': 'طلب سيارة أجرة والتوصيل',

  'world.title': 'YUMS World',
  'world.placeholder': 'بحث…',
  'world.filters': 'عوامل التصفية',
  'world.results': 'نتيجة',
  'world.reset': 'إعادة تعيين',
  'world.apply': 'عرض',
  'world.sector': 'القطاع',
  'world.country': 'الدولة',
  'world.language': 'اللغة',
  'world.stage': 'المرحلة',
  'world.sort': 'الترتيب',
  'world.empty': 'لم يتم العثور على شيء',
  'world.emptySub': 'جرّب تغيير عوامل التصفية',

  'type.projects': 'المشاريع',
  'type.companies': 'الشركات',
  'type.specialists': 'المتخصصون',
  'type.market': 'السوق',
  'type.investors': 'المستثمرون',

  'connect.title': 'YUMS Connect',
  'connect.chats': 'المحادثات',
  'connect.requests': 'الطلبات',
  'connect.meetings': 'الاجتماعات',

  'profile.title': 'حسابي',
  'profile.myProjects': 'مشاريعي',
  'profile.favorites': 'المحفوظات',
  'profile.notifications': 'الإشعارات',
  'profile.plan': 'الباقات والإعلانات',
  'profile.verify': 'توثيق الملف الشخصي',
  'profile.security': 'الأمان والنسخ الاحتياطي',
  'profile.moderation': 'لوحة الإشراف',
  'profile.settings': 'الإعدادات',
  'profile.legal': 'المستندات القانونية',
  'profile.about': 'عن المنصة',
  'profile.support': 'الدعم',
  'profile.logout': 'تسجيل الخروج',
  'profile.edit': 'تعديل الملف الشخصي',
  'profile.taxi': 'YUMS Taxi',

  'settings.title': 'الإعدادات',
  'settings.appearance': 'المظهر',
  'settings.language': 'اللغة',
  'settings.system': 'النظام',
  'settings.light': 'فاتح',
  'settings.dark': 'داكن',
  'settings.notifications': 'الإشعارات',
  'settings.account': 'الحساب',

  'common.save': 'حفظ',
  'common.cancel': 'إلغاء',
  'common.send': 'إرسال',
  'common.verified': 'موثّق',
  'common.write': 'مراسلة',
  'common.report': 'إبلاغ',
};

export const DICTS: Record<Lang, Dict> = { uz, ru, en, tg, ar };

/* ---------- Joriy til ---------- */

let current: Lang = 'uz';
/** user — foydalanuvchi o'zi almashtirdi (ilova ochilishida tiklanganda false) */
const listeners = new Set<(l: Lang, user: boolean) => void>();

export const getLang = () => current;
export const isRTL = (l: Lang = current) => !!LANGS.find(x => x.id === l)?.rtl;
/** Sana, son va ovoz uchun til kodi (masalan, ru-RU) */
export const localeOf = (l: Lang = current) => LANGS.find(x => x.id === l)!.locale;
export const onLangChange = (f: (l: Lang, user: boolean) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

/** Qurilma tili (ilova birinchi ochilganda) — qo'llab-quvvatlanmasa o'zbekcha */
export function deviceLang(): Lang {
  try {
    for (const loc of getLocales()) if (isLang(loc.languageCode)) return loc.languageCode;
  } catch {
    // til aniqlanmadi
  }
  return 'uz';
}

/**
 * Ilova tilini o'rnatish. Vebda yozuv yo'nalishi darhol almashadi; telefonda arab tiliga (yoki undan) o'tilganda
 * yo'nalish ilova qayta yuklanganda qo'llanadi — shuning uchun true qaytsa, ilova qayta yuklanadi.
 */
export function setAppLang(l: Lang, user = false): boolean {
  current = l;
  const rtl = isRTL(l);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l;
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    }
  } else if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    listeners.forEach(f => f(l, user));
    return true;
  }
  listeners.forEach(f => f(l, user));
  return false;
}

const RELOAD_KEY = 'yums:dir-reload';
/** Yo'nalish o'zgarganda ilovani qayta yuklash (telefonda). Qayta yuklash yordam bermasa — takrorlanmaydi */
export async function reloadForDirection() {
  try {
    const last = Number(await AsyncStorage.getItem(RELOAD_KEY));
    if (Date.now() - last < 15000) return;
    await AsyncStorage.setItem(RELOAD_KEY, String(Date.now()));
    await reloadAppAsync('language direction');
  } catch {
    // qayta yuklab bo'lmadi — yo'nalish keyingi ochilishda qo'llanadi
  }
}

const COL: Record<Exclude<Lang, 'uz'>, number> = { ru: 0, en: 1, tg: 2, ar: 3 };

/**
 * Ilova matni: o'zbekcha matnning o'zi kalit; {nom} o'rniga qiymat qo'yiladi.
 * Masalan: tr('{n} ta buyurtma', { n: 3 }).
 */
export function tr(text: string, vars?: Record<string, string | number | null | undefined>): string {
  let s = text;
  if (current !== 'uz') {
    const row = PHRASES[text];
    if (row?.[COL[current]]) s = row[COL[current]];
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? '') : m)) : s;
}

/** O'ngdan chapga tillarda yo'nalish belgilari (strelka, chevron) aks ettiriladi */
export const flipRTL = () => (isRTL() ? { transform: [{ scaleX: -1 }] } : undefined);
/** Ionicons nomi yo'nalishli belgimi (chevron-back, arrow-forward…) */
export const isDirectional = (name: string) => /^(chevron|arrow)-(back|forward)/.test(name);

/** «A → B» yo'nalishi (arab tilida o'ngdan chapga o'qiladi — strelka ham teskari) */
export const route = (from: string, to: string) => (isRTL() ? `${from} ← ${to}` : `${from} → ${to}`);

/** Joy nomi: ma'lum joylar tarjima qilinadi, «… yaqinida» ko'rinishidagilari ham */
export function trPlace(title?: string | null): string {
  if (!title) return '';
  let m = title.match(/^(.+) yaqinida$/);
  if (m) return tr('{place} yaqinida', { place: tr(m[1]) });
  m = title.match(/^(.+)dan ([\d.]+) km$/);
  if (m) return tr('{place}dan {km} km', { place: tr(m[1]), km: m[2] });
  m = title.match(/^(\d+) m · (.+)$/);
  if (m) return tr('{m} m · {place}', { m: m[1], place: tr(m[2]) });
  return tr(title);
}

/**
 * «Keyinroq tarjima qilinadi» belgisi: modul darajasidagi ro'yxatlar (yorliqlar, holatlar) uchun.
 * Matn o'zgarmaydi — ekranda tr(qiymat) bilan chiqariladi; tekshiruv skripti esa uni tarjima jadvalidan izlaydi.
 */
export const tx = <S extends string>(text: S): S => text;

/** Platforma qobig'i kaliti yoki o'zbekcha matn */
export function t(key: TKey | (string & {}), vars?: Record<string, string | number | null | undefined>): string {
  const d = DICTS[current] as Record<string, string>;
  if (key in DICTS.uz) {
    const s = d[key] ?? (DICTS.uz as Record<string, string>)[key];
    return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? '') : m)) : s;
  }
  return tr(key, vars);
}

