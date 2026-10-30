// Sayt matni: standart qiymatlar (o'zbek va rus tillarida) va admin paneldan o'zgartirilgan maydonlar bilan birlashtirish.
// Server faqat o'zgartirilgan maydonlarni saqlaydi (server/registry.mjs → setContent), qolgani shu yerdan olinadi.

export type Lang = 'uz' | 'ru';
export type Faq = { q: string; a: string };
export type LangBlock = {
  heroTitle: string;
  heroSub: string;
  promoText: string;
  promoCode: string;
  driverTitle: string;
  driverSub: string;
  faq: Faq[];
};
/** showStats — jonli ko'rsatkichlar (liniyadagi haydovchilar…), showPromo — aksiya qatori */
export type SiteContent = { uz: LangBlock; ru: LangBlock; phone: string; telegram: string; email: string; showStats: boolean; showPromo: boolean };
export type ContentOverrides = Partial<{ uz: Partial<LangBlock>; ru: Partial<LangBlock>; phone: string; telegram: string; email: string; showStats: boolean; showPromo: boolean }>;

export const DEFAULT_CONTENT: SiteContent = {
  uz: {
    heroTitle: "Shahar bo'ylab tez, qulay va xavfsiz",
    heroSub: "YUMS Taxi — Toshkentda bir necha daqiqada keladigan taksi. Narx oldindan ma'lum, haydovchilar tekshirilgan, safar xaritada jonli kuzatiladi.",
    promoText: 'Yangi foydalanuvchilarga birinchi safarga 30% chegirma',
    promoCode: 'YANGI30',
    driverTitle: "YUMS bilan ishlang — daromad o'z qo'lingizda",
    driverSub: "Erkin grafik, past komissiya va pulni istalgan vaqtda kartaga yechib olish. Ariza qoldiring — operator siz bilan bog'lanadi.",
    faq: [
      { q: 'Narx qanday hisoblanadi?', a: "Narx tarifning boshlang'ich to'lovi, masofa (km) va safar vaqti (daqiqa)dan hisoblanadi. Buyurtma berishdan oldin aniq narxni ko'rasiz. Talab yuqori bo'lgan paytda narx koeffitsienti ilovada oldindan ko'rsatiladi." },
      { q: "Qanday to'lash mumkin?", a: "Naqd, Uzcard, Humo yoki Visa kartasi va YUMS balansi orqali. Karta bilan to'langan safar yakunlanganda summa avtomatik yechiladi." },
      { q: 'Haydovchilar qanday tekshiriladi?', a: "Har bir haydovchi haydovchilik guvohnomasi, texnik pasport, taksi litsenziyasi va OSAGO polisini yuklaydi. Hujjatlar avtomatik va moderator tomonidan tekshiriladi; muddati o'tgan hujjat bilan liniyaga chiqib bo'lmaydi." },
      { q: "Safar xavfsizligi qanday ta'minlanadi?", a: "Ilovada haydovchining ismi, mashinasi va davlat raqami ko'rinadi, mashina xaritada jonli kuzatiladi. Favqulodda vaziyatda bir tugma bilan 112 ga qo'ng'iroq qilasiz." },
      { q: 'Buyurtmani bekor qilsam bo\'ladimi?', a: "Ha, haydovchi kelguncha istalgan vaqtda bepul bekor qilasiz. Haydovchi yetib kelgach 3 daqiqa bepul kutadi, keyin har daqiqa uchun 500 so'm qo'shiladi." },
      { q: "Haydovchi bo'lish uchun nima kerak?", a: "2008-yil va undan yangi avtomobil, amaldagi haydovchilik guvohnomasi («B» toifa), texnik pasport, taksi litsenziyasi va OSAGO. Komfort va Biznes tariflari uchun avtomobil sinfi va yili bo'yicha qo'shimcha talablar bor." },
    ],
  },
  ru: {
    heroTitle: 'Быстро, удобно и безопасно по всему городу',
    heroSub: 'YUMS Taxi — такси в Ташкенте, которое приезжает за несколько минут. Цена известна заранее, водители проверены, поездка отслеживается на карте в реальном времени.',
    promoText: 'Скидка 30% на первую поездку для новых пользователей',
    promoCode: 'YANGI30',
    driverTitle: 'Работайте с YUMS — доход в ваших руках',
    driverSub: 'Свободный график, низкая комиссия и вывод денег на карту в любое время. Оставьте заявку — оператор свяжется с вами.',
    faq: [
      { q: 'Как рассчитывается цена?', a: 'Цена складывается из подачи по тарифу, расстояния (км) и времени в пути (мин). Точную стоимость вы видите до заказа. В часы высокого спроса повышающий коэффициент показывается в приложении заранее.' },
      { q: 'Как можно оплатить?', a: 'Наличными, картой Uzcard, Humo или Visa и с баланса YUMS. При оплате картой сумма списывается автоматически после поездки.' },
      { q: 'Как проверяются водители?', a: 'Каждый водитель загружает водительское удостоверение, техпаспорт, лицензию такси и полис ОСАГО. Документы проверяются автоматически и модератором; с просроченным документом выйти на линию нельзя.' },
      { q: 'Как обеспечивается безопасность поездки?', a: 'В приложении видно имя водителя, автомобиль и госномер, машина отслеживается на карте в реальном времени. В экстренной ситуации — звонок в 112 одной кнопкой.' },
      { q: 'Можно ли отменить заказ?', a: 'Да, до приезда водителя — бесплатно в любой момент. После прибытия водитель бесплатно ждёт 3 минуты, далее — 500 сум за каждую минуту ожидания.' },
      { q: 'Что нужно, чтобы стать водителем?', a: 'Автомобиль 2008 года выпуска и новее, действующее водительское удостоверение категории «B», техпаспорт, лицензия такси и ОСАГО. Для тарифов Комфорт и Бизнес есть дополнительные требования к классу и году автомобиля.' },
    ],
  },
  phone: '+998 71 200 00 00',
  telegram: 'yums_driver_support',
  email: 'info@yums.example',
  showStats: true,
  showPromo: true,
};

/** Admin o'zgartirgan maydonlar standart matn ustiga qo'yiladi (bo'sh qatorlar e'tiborga olinmaydi) */
export function mergeContent(o?: ContentOverrides | null): SiteContent {
  const block = (lang: Lang): LangBlock => {
    const d = DEFAULT_CONTENT[lang], x = o?.[lang] ?? {};
    const pick = (k: Exclude<keyof LangBlock, 'faq'>) => (typeof x[k] === 'string' && x[k]!.trim() ? x[k]!.trim() : d[k]);
    return {
      heroTitle: pick('heroTitle'), heroSub: pick('heroSub'), promoText: pick('promoText'), promoCode: pick('promoCode'),
      driverTitle: pick('driverTitle'), driverSub: pick('driverSub'),
      faq: Array.isArray(x.faq) && x.faq.length ? x.faq : d.faq,
    };
  };
  const str = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim() : d);
  return {
    uz: block('uz'), ru: block('ru'),
    phone: str(o?.phone, DEFAULT_CONTENT.phone), telegram: str(o?.telegram, DEFAULT_CONTENT.telegram), email: str(o?.email, DEFAULT_CONTENT.email),
    showStats: typeof o?.showStats === 'boolean' ? o.showStats : DEFAULT_CONTENT.showStats,
    showPromo: typeof o?.showPromo === 'boolean' ? o.showPromo : DEFAULT_CONTENT.showPromo,
  };
}
