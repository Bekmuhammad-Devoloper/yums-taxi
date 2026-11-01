// Sayt matni: standart qiymatlar (ilovaning 5 tilida) va admin paneldan o'zgartirilgan maydonlar bilan birlashtirish.
// Server faqat o'zgartirilgan maydonlarni saqlaydi (server/registry.mjs → setContent), qolgani shu yerdan olinadi.
import { LANGS, type Lang } from '@/lib/i18n';

export type { Lang };
export const SITE_LANGS: Lang[] = LANGS.map(l => l.id);
/** Tillar nomi admin panel uchun (o'zbekcha) */
export const LANG_NAME: Record<Lang, string> = { uz: "o'zbekcha", ru: 'ruscha', en: 'inglizcha', tg: 'tojikcha', ar: 'arabcha' };
export const langLabel = (l: Lang) => {
  const n = LANG_NAME[l] ?? LANG_NAME.uz; // eski yozuvlarda noma'lum til bo'lsa ham
  return n[0].toUpperCase() + n.slice(1);
};

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
type Common = { phone: string; telegram: string; email: string; showStats: boolean; showPromo: boolean };
/** showStats — jonli ko'rsatkichlar (liniyadagi haydovchilar…), showPromo — aksiya qatori */
export type SiteContent = Record<Lang, LangBlock> & Common;
export type ContentOverrides = Partial<Record<Lang, Partial<LangBlock>> & Common>;

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
  en: {
    heroTitle: 'Fast, comfortable and safe rides across the city',
    heroSub: 'YUMS Taxi is the Tashkent taxi that arrives in minutes. The fare is known upfront, drivers are verified, and your trip is tracked live on the map.',
    promoText: '30% off the first ride for new users',
    promoCode: 'YANGI30',
    driverTitle: 'Drive with YUMS — your earnings, your way',
    driverSub: 'Flexible hours, low commission and cash-out to your card at any time. Leave an application and an operator will contact you.',
    faq: [
      { q: 'How is the fare calculated?', a: "The fare is made up of the tariff's base fare, the distance (km) and the trip time (minutes). You see the exact price before ordering. At times of high demand, the price multiplier is shown in the app in advance." },
      { q: 'How can I pay?', a: 'In cash, by Uzcard, Humo or Visa card, or from your YUMS balance. When you pay by card, the amount is charged automatically at the end of the trip.' },
      { q: 'How are drivers checked?', a: "Every driver uploads a driving licence, vehicle registration, taxi licence and OSAGO insurance policy. Documents are checked automatically and by a moderator; drivers can't go online with an expired document." },
      { q: 'How is trip safety ensured?', a: "The app shows the driver's name, car and licence plate, and the car is tracked live on the map. In an emergency you can call 112 with one tap." },
      { q: 'Can I cancel an order?', a: 'Yes, you can cancel for free at any time until the driver arrives. After arriving, the driver waits 3 minutes for free; after that, 500 sum is added for each minute.' },
      { q: 'What do I need to become a driver?', a: "A 2008 or newer car, a valid driving licence (category «B»), vehicle registration, a taxi licence and OSAGO insurance. The Comfort and Business tariffs have extra requirements for the car's class and year." },
    ],
  },
  tg: {
    heroTitle: 'Дар саросари шаҳр — зуд, бароҳат ва бехатар',
    heroSub: 'YUMS Taxi — таксие дар Тошкент, ки дар чанд дақиқа мерасад. Нарх пешакӣ маълум, ронандагон санҷидашуда ва сафар дар харита зинда пайгирӣ мешавад.',
    promoText: 'Барои корбарони нав 30% тахфиф ба сафари аввал',
    promoCode: 'YANGI30',
    driverTitle: 'Бо YUMS кор кунед — даромад дар дасти худатон',
    driverSub: 'Ҷадвали озод, комиссияи паст ва гирифтани пул ба корт дар ҳар вақт. Ариза гузоред — оператор бо шумо тамос мегирад.',
    faq: [
      { q: 'Нарх чӣ тавр ҳисоб карда мешавад?', a: 'Нарх аз пардохти ибтидоии тариф, масофа (км) ва вақти сафар (дақиқа) ҳисоб карда мешавад. Нархи дақиқро пеш аз фармоиш мебинед. Ҳангоми талаботи баланд коэффитсиенти нарх дар барнома пешакӣ нишон дода мешавад.' },
      { q: 'Чӣ тавр пардохт кардан мумкин?', a: 'Нақд, бо корти Uzcard, Humo ё Visa ва аз тавозуни YUMS. Ҳангоми пардохт бо корт маблағ пас аз анҷоми сафар худкор гирифта мешавад.' },
      { q: 'Ронандагон чӣ тавр санҷида мешаванд?', a: 'Ҳар як ронанда шаҳодатномаи ронандагӣ, шиносномаи техникӣ, иҷозатномаи такси ва полиси OSAGO-ро бор мекунад. Ҳуҷҷатҳо худкор ва аз ҷониби модератор санҷида мешаванд; бо ҳуҷҷати мӯҳлаташ гузашта ба хат баромадан мумкин нест.' },
      { q: 'Бехатарии сафар чӣ тавр таъмин мешавад?', a: 'Дар барнома ном, мошин ва рақами давлатии ронанда намоён аст, мошин дар харита зинда пайгирӣ мешавад. Дар ҳолати фавқулода бо як тугма ба 112 занг мезанед.' },
      { q: 'Фармоишро бекор кардан мумкин аст?', a: 'Бале, то омадани ронанда дар ҳар вақт ройгон бекор мекунед. Пас аз расидан ронанда 3 дақиқа ройгон интизор мешавад, баъд барои ҳар дақиқа 500 сӯм илова карда мешавад.' },
      { q: 'Барои ронанда шудан чӣ лозим аст?', a: 'Мошини соли 2008 ва навтар, шаҳодатномаи амалкунандаи ронандагӣ (категорияи «B»), шиносномаи техникӣ, иҷозатномаи такси ва OSAGO. Барои тарифҳои Комфорт ва Бизнес талаботи иловагӣ ба синф ва соли мошин мавҷуд аст.' },
    ],
  },
  ar: {
    heroTitle: 'تنقّل سريع ومريح وآمن في أنحاء المدينة',
    heroSub: 'YUMS Taxi هو تاكسي طشقند الذي يصل خلال دقائق. السعر معروف مسبقًا، والسائقون موثّقون، ورحلتك تُتابَع مباشرة على الخريطة.',
    promoText: 'خصم 30% على الرحلة الأولى للمستخدمين الجدد',
    promoCode: 'YANGI30',
    driverTitle: 'اعمل مع YUMS — دخلك بين يديك',
    driverSub: 'جدول مرن وعمولة منخفضة وسحب الأرباح إلى بطاقتك في أي وقت. قدّم طلبك وسيتواصل معك أحد الموظفين.',
    faq: [
      { q: 'كيف تُحسب الأجرة؟', a: 'تتكون الأجرة من السعر الأساسي للفئة والمسافة (كم) ومدة الرحلة (دقائق). ترى السعر الدقيق قبل الطلب، وفي أوقات الطلب المرتفع يظهر معامل السعر في التطبيق مسبقًا.' },
      { q: 'كيف يمكنني الدفع؟', a: 'نقدًا أو ببطاقة Uzcard أو Humo أو Visa أو من رصيد YUMS. عند الدفع بالبطاقة يُخصم المبلغ تلقائيًا بعد انتهاء الرحلة.' },
      { q: 'كيف يتم التحقق من السائقين؟', a: 'يرفع كل سائق رخصة القيادة ووثيقة تسجيل السيارة ورخصة التاكسي ووثيقة تأمين OSAGO. تُفحص المستندات آليًا ومن قبل مشرف، ولا يمكن العمل بوثيقة منتهية الصلاحية.' },
      { q: 'كيف تُضمن سلامة الرحلة؟', a: 'يعرض التطبيق اسم السائق والسيارة ورقم اللوحة، وتُتابَع السيارة مباشرة على الخريطة. وفي حالات الطوارئ يمكنك الاتصال بـ 112 بضغطة واحدة.' },
      { q: 'هل يمكنني إلغاء الطلب؟', a: 'نعم، يمكنك الإلغاء مجانًا في أي وقت قبل وصول السائق. بعد وصوله ينتظر السائق 3 دقائق مجانًا، ثم تُضاف 500 سوم عن كل دقيقة.' },
      { q: 'ما المطلوب لأصبح سائقًا؟', a: 'سيارة من طراز 2008 أو أحدث، ورخصة قيادة سارية (الفئة «B»)، ووثيقة تسجيل السيارة، ورخصة تاكسي، وتأمين OSAGO. ولفئتي «مريحة» و«أعمال» متطلبات إضافية بشأن فئة السيارة وسنة صنعها.' },
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
    uz: block('uz'), ru: block('ru'), en: block('en'), tg: block('tg'), ar: block('ar'),
    phone: str(o?.phone, DEFAULT_CONTENT.phone), telegram: str(o?.telegram, DEFAULT_CONTENT.telegram), email: str(o?.email, DEFAULT_CONTENT.email),
    showStats: typeof o?.showStats === 'boolean' ? o.showStats : DEFAULT_CONTENT.showStats,
    showPromo: typeof o?.showPromo === 'boolean' ? o.showPromo : DEFAULT_CONTENT.showPromo,
  };
}
