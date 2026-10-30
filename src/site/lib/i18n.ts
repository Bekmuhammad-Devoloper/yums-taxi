// Sayt interfeysi matnlari (ilovaning 5 tilida). Admin tahrirlaydigan matnlar — content.ts da;
// tarif va avtomobil sinfi nomlari ilova jadvalidan tr() bilan olinadi.
import type { Lang } from './content';

const uz = {
  meta: { title: "YUMS Taxi — Toshkent bo'ylab taksi" },
  nav: { tariffs: 'Tariflar', estimate: 'Narx', drivers: 'Haydovchilarga', faq: 'Savollar', download: 'Ilovani olish', menu: 'Menyu' },
  theme: { light: "Yorug' mavzu", dark: "Qorong'i mavzu" },
  hero: { badge: 'Toshkent bo\'ylab · 24/7', order: 'Taksi chaqirish', become: "Haydovchi bo'lish", promoCopy: 'Promokod', copied: 'Nusxa olindi' },
  stores: { apple: 'App Store', google: 'Google Play', web: 'Veb-versiya', soon: 'tez orada', title: 'YUMS ilovasi' },
  stats: { online: 'haydovchi liniyada', trips: 'ta safar bugun', pickup: 'daq — o\'rtacha kelish', rating: "o'rtacha baho", live: 'Jonli ma\'lumot' },
  values: [
    { title: 'Narx oldindan', text: "Buyurtmadan oldin aniq narxni ko'rasiz" },
    { title: 'Tekshirilgan haydovchilar', text: 'Hujjatlar va avtomobil talablari' },
    { title: 'Jonli kuzatuv', text: 'Mashina xaritada, safar ulashiladi' },
  ],
  estimate: {
    title: 'Narxni hisoblang', sub: "Qayerdan va qayerga — tariflar bo'yicha taxminiy narx", from: 'Qayerdan', to: 'Qayerga',
    pick: 'Tanlang', km: 'km', min: 'daq', loading: 'Marshrut hisoblanmoqda…', surge: 'yuqori talab',
    note: "Taxminiy narx: aniq summa ilovada marshrut va tirbandlikka qarab hisoblanadi.", swap: "Almashtirish", priceOf: '{name} narxi',
  },
  tariffs: {
    title: 'Har safarga mos tarif', sub: "Kundalik qatnovdan muhim uchrashuvgacha", seats: "o'rin", base: "boshlang'ich narx", perKm: 'har km', perMin: 'har daqiqa', minFare: 'eng kam',
  },
  features: {
    title: 'Nega YUMS', sub: "Biz har bir safarni xavfsiz va oldindan aniq qilamiz",
    items: [
      { title: 'Shaffof narx', text: "Narxni buyurtmadan oldin ko'rasiz. Talab yuqori bo'lsa, koeffitsient ham oldindan ko'rsatiladi." },
      { title: 'Tekshirilgan haydovchilar', text: "Guvohnoma, texnik pasport, litsenziya va OSAGO tekshiriladi. Muddati o'tgan hujjat bilan liniyaga chiqib bo'lmaydi." },
      { title: 'Xavfsiz safar', text: "Haydovchi, mashina va raqam ilovada, mashina xaritada jonli. Favqulodda holatda — 112 bir tugmada." },
      { title: 'Sifat nazorati', text: 'Har safardan keyin baho qo\'yasiz. Reytingi past haydovchi Komfort va Biznesda ishlay olmaydi.' },
      { title: "24/7 yordam", text: 'Savol yoki muammo bo\'lsa — ilovadagi chat yoki telefon orqali tez javob.' },
      { title: "Qulay to'lov", text: "Naqd, Uzcard, Humo, Visa yoki YUMS balansi. Promokod va chegirmalar ilovada avtomatik qo'llanadi." },
    ],
  },
  driver: {
    badge: 'YUMS Driver', benefits: ['Erkin grafik', 'Pul kartaga 1–2 daqiqada', 'Zanjir buyurtmalar', 'Ovozli navigator'], commission: 'Komissiya',
    calcTitle: 'Daromad kalkulyatori', hours: 'Kuniga soat', days: 'Haftada kun', tariff: 'Tarif', week: 'Haftasiga', month: 'Oyiga', gross: 'Safarlar summasi', fee: 'YUMS komissiyasi', net: "Sizga qoladi",
    calcNote: "Taxminiy hisob: o'rtacha 7 km / 18 daqiqalik safar, soatiga 1,6 ta buyurtma, yoqilg'i xarajatlarisiz. Haqiqiy daromad vaqt, hudud va talabga bog'liq.",
    reqTitle: 'Tariflar talablari', reqYear: 'yildan yangi', reqClass: 'sinf', reqRating: 'reyting', reqTrips: 'ta safar', reqSeats: "o'rindiqdan",
    formTitle: 'Ariza qoldiring', formSub: "Operator siz bilan bog'lanib, ro'yxatdan o'tishga yordam beradi",
    name: 'Ism va familiya', namePh: 'Masalan: Jasur Karimov', phone: 'Telefon', city: 'Shahar', car: 'Avtomobil', carPh: 'Modelni tanlang', year: 'Ishlab chiqarilgan yili',
    fits: 'Mos tariflar', later: 'keyinroq', none: "Bu avtomobil hozircha tariflarga mos emas", send: 'Ariza yuborish', sending: 'Yuborilmoqda…',
    okTitle: 'Rahmat! Arizangiz qabul qilindi', okText: "Operator tez orada qo'ng'iroq qiladi. Hozircha hujjatlarni tayyorlab qo'ying: guvohnoma, texnik pasport, taksi litsenziyasi va OSAGO.",
    again: 'Yana ariza', errName: 'Ismingizni kiriting', errPhone: "Telefon raqamini to'liq kiriting", errCar: 'Avtomobilni tanlang', errYear: "Yilni to'g'ri kiriting",
    consent: "Yuborish orqali ma'lumotlaringiz faqat siz bilan bog'lanish uchun ishlatilishiga rozilik bildirasiz.",
  },
  faq: { title: "Ko'p beriladigan savollar" },
  footer: { contacts: 'Aloqa', telegram: 'Telegram', rights: 'Barcha huquqlar himoyalangan', admin: 'Boshqaruv paneli', made: 'Toshkentda yaratilgan' },
};

type Dict = typeof uz;

const ru: Dict = {
  meta: { title: 'YUMS Taxi — такси по Ташкенту' },
  nav: { tariffs: 'Тарифы', estimate: 'Цена', drivers: 'Водителям', faq: 'Вопросы', download: 'Приложение', menu: 'Меню' },
  theme: { light: 'Светлая тема', dark: 'Тёмная тема' },
  hero: { badge: 'По всему Ташкенту · 24/7', order: 'Вызвать такси', become: 'Стать водителем', promoCopy: 'Промокод', copied: 'Скопировано' },
  stores: { apple: 'App Store', google: 'Google Play', web: 'Веб-версия', soon: 'скоро', title: 'Приложение YUMS' },
  stats: { online: 'водителей на линии', trips: 'поездок сегодня', pickup: 'мин — средняя подача', rating: 'средняя оценка', live: 'Данные в реальном времени' },
  values: [
    { title: 'Цена заранее', text: 'Точная стоимость до заказа' },
    { title: 'Проверенные водители', text: 'Документы и требования к авто' },
    { title: 'Онлайн-отслеживание', text: 'Машина на карте, поездкой можно поделиться' },
  ],
  estimate: {
    title: 'Рассчитайте стоимость', sub: 'Откуда и куда — примерная цена по тарифам', from: 'Откуда', to: 'Куда',
    pick: 'Выберите', km: 'км', min: 'мин', loading: 'Считаем маршрут…', surge: 'высокий спрос',
    note: 'Примерная цена: точная сумма считается в приложении с учётом маршрута и пробок.', swap: 'Поменять местами', priceOf: 'Цена: {name}',
  },
  tariffs: {
    title: 'Тариф для любой поездки', sub: 'От ежедневных поездок до важных встреч', seats: 'места', base: 'подача', perKm: 'за км', perMin: 'за минуту', minFare: 'минимум',
  },
  features: {
    title: 'Почему YUMS', sub: 'Каждая поездка — безопасная и с понятной ценой',
    items: [
      { title: 'Прозрачная цена', text: 'Стоимость видна до заказа. При высоком спросе коэффициент тоже показывается заранее.' },
      { title: 'Проверенные водители', text: 'Проверяем права, техпаспорт, лицензию и ОСАГО. С просроченным документом выйти на линию нельзя.' },
      { title: 'Безопасная поездка', text: 'Водитель, машина и номер в приложении, машина на карте в реальном времени. В экстренной ситуации — 112 одной кнопкой.' },
      { title: 'Контроль качества', text: 'После каждой поездки — оценка. Водители с низким рейтингом не работают в Комфорте и Бизнесе.' },
      { title: 'Поддержка 24/7', text: 'Вопрос или проблема — быстрый ответ в чате приложения или по телефону.' },
      { title: 'Удобная оплата', text: 'Наличные, Uzcard, Humo, Visa или баланс YUMS. Промокоды и скидки применяются в приложении автоматически.' },
    ],
  },
  driver: {
    badge: 'YUMS Driver', benefits: ['Свободный график', 'Вывод на карту за 1–2 минуты', 'Заказы цепочкой', 'Голосовой навигатор'], commission: 'Комиссия',
    calcTitle: 'Калькулятор дохода', hours: 'Часов в день', days: 'Дней в неделю', tariff: 'Тариф', week: 'В неделю', month: 'В месяц', gross: 'Сумма поездок', fee: 'Комиссия YUMS', net: 'Остаётся вам',
    calcNote: 'Примерный расчёт: средняя поездка 7 км / 18 минут, 1,6 заказа в час, без учёта топлива. Реальный доход зависит от времени, района и спроса.',
    reqTitle: 'Требования тарифов', reqYear: 'года и новее', reqClass: 'класс', reqRating: 'рейтинг', reqTrips: 'поездок', reqSeats: 'мест и больше',
    formTitle: 'Оставьте заявку', formSub: 'Оператор свяжется с вами и поможет с регистрацией',
    name: 'Имя и фамилия', namePh: 'Например: Жасур Каримов', phone: 'Телефон', city: 'Город', car: 'Автомобиль', carPh: 'Выберите модель', year: 'Год выпуска',
    fits: 'Подходящие тарифы', later: 'позже', none: 'Этот автомобиль пока не подходит под тарифы', send: 'Отправить заявку', sending: 'Отправляем…',
    okTitle: 'Спасибо! Заявка принята', okText: 'Оператор скоро позвонит. А пока подготовьте документы: права, техпаспорт, лицензию такси и ОСАГО.',
    again: 'Новая заявка', errName: 'Введите имя', errPhone: 'Введите номер телефона полностью', errCar: 'Выберите автомобиль', errYear: 'Введите корректный год',
    consent: 'Отправляя заявку, вы соглашаетесь, что данные будут использованы только для связи с вами.',
  },
  faq: { title: 'Частые вопросы' },
  footer: { contacts: 'Контакты', telegram: 'Telegram', rights: 'Все права защищены', admin: 'Панель управления', made: 'Сделано в Ташкенте' },
};

const en: Dict = {
  meta: { title: 'YUMS Taxi — taxi across Tashkent' },
  nav: { tariffs: 'Tariffs', estimate: 'Fare', drivers: 'For drivers', faq: 'FAQ', download: 'Get the app', menu: 'Menu' },
  theme: { light: 'Light theme', dark: 'Dark theme' },
  hero: { badge: 'Across Tashkent · 24/7', order: 'Order a taxi', become: 'Become a driver', promoCopy: 'Promo code', copied: 'Copied' },
  stores: { apple: 'App Store', google: 'Google Play', web: 'Web version', soon: 'coming soon', title: 'YUMS app' },
  stats: { online: 'drivers online', trips: 'trips today', pickup: 'min — average pickup', rating: 'average rating', live: 'Live data' },
  values: [
    { title: 'Upfront price', text: 'See the exact fare before you order' },
    { title: 'Verified drivers', text: 'Documents and vehicle standards' },
    { title: 'Live tracking', text: 'The car on the map, share your trip' },
  ],
  estimate: {
    title: 'Estimate your fare', sub: 'From and to — an estimated fare for each tariff', from: 'From', to: 'To',
    pick: 'Choose', km: 'km', min: 'min', loading: 'Calculating route…', surge: 'high demand',
    note: 'Estimated fare: the exact amount is calculated in the app based on the route and traffic.', swap: 'Swap', priceOf: '{name} fare',
  },
  tariffs: {
    title: 'A tariff for every trip', sub: 'From the daily commute to important meetings', seats: 'seats', base: 'base fare', perKm: 'per km', perMin: 'per minute', minFare: 'minimum',
  },
  features: {
    title: 'Why YUMS', sub: 'We make every trip safe and predictable',
    items: [
      { title: 'Transparent pricing', text: 'You see the fare before ordering. When demand is high, the multiplier is shown upfront too.' },
      { title: 'Verified drivers', text: "We check the driving licence, vehicle registration, taxi licence and OSAGO insurance. A driver with an expired document can't go online." },
      { title: 'Safe rides', text: 'The driver, car and plate number are in the app, and the car is live on the map. In an emergency, 112 is one tap away.' },
      { title: 'Quality control', text: "You rate every trip. Drivers with a low rating can't work in Comfort and Business." },
      { title: '24/7 support', text: 'A question or a problem? Get a quick answer in the in-app chat or by phone.' },
      { title: 'Easy payment', text: 'Cash, Uzcard, Humo, Visa or YUMS balance. Promo codes and discounts apply automatically in the app.' },
    ],
  },
  driver: {
    badge: 'YUMS Driver', benefits: ['Flexible schedule', 'Payouts to your card in 1–2 minutes', 'Chained orders', 'Voice navigation'], commission: 'Commission',
    calcTitle: 'Earnings calculator', hours: 'Hours per day', days: 'Days per week', tariff: 'Tariff', week: 'Per week', month: 'Per month', gross: 'Trip fares', fee: 'YUMS commission', net: 'You keep',
    calcNote: 'Rough estimate: an average 7 km / 18-minute trip, 1.6 orders per hour, excluding fuel. Actual earnings depend on time, area and demand.',
    reqTitle: 'Tariff requirements', reqYear: 'or newer', reqClass: 'class', reqRating: 'rating', reqTrips: 'trips', reqSeats: 'seats or more',
    formTitle: 'Apply now', formSub: 'An operator will contact you and help you sign up',
    name: 'Full name', namePh: 'E.g. Jasur Karimov', phone: 'Phone', city: 'City', car: 'Car', carPh: 'Choose a model', year: 'Year of manufacture',
    fits: 'Eligible tariffs', later: 'later', none: "This car doesn't meet the tariff requirements yet", send: 'Send application', sending: 'Sending…',
    okTitle: 'Thank you! Your application has been received', okText: 'An operator will call you soon. Meanwhile, get your documents ready: driving licence, vehicle registration, taxi licence and OSAGO insurance.',
    again: 'New application', errName: 'Enter your name', errPhone: 'Enter the full phone number', errCar: 'Choose a car', errYear: 'Enter a valid year',
    consent: 'By sending, you agree that your details will be used only to contact you.',
  },
  faq: { title: 'Frequently asked questions' },
  footer: { contacts: 'Contacts', telegram: 'Telegram', rights: 'All rights reserved', admin: 'Admin panel', made: 'Made in Tashkent' },
};

const tg: Dict = {
  meta: { title: 'YUMS Taxi — такси дар Тошкент' },
  nav: { tariffs: 'Тарифҳо', estimate: 'Нарх', drivers: 'Барои ронандагон', faq: 'Саволҳо', download: 'Гирифтани барнома', menu: 'Меню' },
  theme: { light: 'Мавзӯи равшан', dark: 'Мавзӯи торик' },
  hero: { badge: 'Дар саросари Тошкент · 24/7', order: 'Даъвати такси', become: 'Ронанда шудан', promoCopy: 'Промокод', copied: 'Нусха гирифта шуд' },
  stores: { apple: 'App Store', google: 'Google Play', web: 'Версияи веб', soon: 'ба наздикӣ', title: 'Барномаи YUMS' },
  stats: { online: 'ронанда дар хат', trips: 'сафар имрӯз', pickup: 'дақ — омадани миёна', rating: 'баҳои миёна', live: 'Маълумоти зинда' },
  values: [
    { title: 'Нарх пешакӣ', text: 'Нархи дақиқро пеш аз фармоиш мебинед' },
    { title: 'Ронандагони санҷидашуда', text: 'Ҳуҷҷатҳо ва талабот ба мошин' },
    { title: 'Пайгирии зинда', text: 'Мошин дар харита, сафарро мубодила кардан мумкин' },
  ],
  estimate: {
    title: 'Нархро ҳисоб кунед', sub: 'Аз куҷо ва ба куҷо — нархи тахминӣ аз рӯи тарифҳо', from: 'Аз куҷо', to: 'Ба куҷо',
    pick: 'Интихоб кунед', km: 'км', min: 'дақ', loading: 'Масир ҳисоб карда мешавад…', surge: 'талаботи баланд',
    note: 'Нархи тахминӣ: маблағи дақиқ дар барнома вобаста ба масир ва роҳбандӣ ҳисоб карда мешавад.', swap: 'Иваз кардан', priceOf: 'Нархи {name}',
  },
  tariffs: {
    title: 'Тариф барои ҳар сафар', sub: 'Аз рафтуомади ҳаррӯза то вохӯриҳои муҳим', seats: 'ҷой', base: 'нархи ибтидоӣ', perKm: 'ҳар км', perMin: 'ҳар дақиқа', minFare: 'камтарин',
  },
  features: {
    title: 'Чаро YUMS', sub: 'Мо ҳар сафарро бехатар ва пешакӣ возеҳ мекунем',
    items: [
      { title: 'Нархи шаффоф', text: 'Нархро пеш аз фармоиш мебинед. Агар талабот баланд бошад, коэффитсиент низ пешакӣ нишон дода мешавад.' },
      { title: 'Ронандагони санҷидашуда', text: 'Шаҳодатнома, шиносномаи техникӣ, иҷозатнома ва OSAGO санҷида мешаванд. Бо ҳуҷҷати мӯҳлаташ гузашта ба хат баромадан мумкин нест.' },
      { title: 'Сафари бехатар', text: 'Ронанда, мошин ва рақам дар барнома, мошин дар харита зинда. Дар ҳолати фавқулода — 112 бо як тугма.' },
      { title: 'Назорати сифат', text: 'Пас аз ҳар сафар баҳо медиҳед. Ронандаи рейтингаш паст дар Комфорт ва Бизнес кор карда наметавонад.' },
      { title: 'Дастгирии 24/7', text: 'Агар савол ё мушкил бошад — ҷавоби зуд тавассути чати барнома ё телефон.' },
      { title: 'Пардохти қулай', text: 'Нақд, Uzcard, Humo, Visa ё тавозуни YUMS. Промокодҳо ва тахфифҳо дар барнома худкор татбиқ мешаванд.' },
    ],
  },
  driver: {
    badge: 'YUMS Driver', benefits: ['Ҷадвали озод', 'Пул ба корт дар 1–2 дақиқа', 'Фармоишҳои занҷирӣ', 'Навигатори овозӣ'], commission: 'Комиссия',
    calcTitle: 'Ҳисобкунаки даромад', hours: 'Соат дар як рӯз', days: 'Рӯз дар як ҳафта', tariff: 'Тариф', week: 'Дар як ҳафта', month: 'Дар як моҳ', gross: 'Маблағи сафарҳо', fee: 'Комиссияи YUMS', net: 'Ба шумо мемонад',
    calcNote: 'Ҳисоби тахминӣ: сафари миёна 7 км / 18 дақиқа, 1,6 фармоиш дар як соат, бе хароҷоти сӯзишворӣ. Даромади воқеӣ аз вақт, минтақа ва талабот вобаста аст.',
    reqTitle: 'Талаботи тарифҳо', reqYear: 'ва навтар', reqClass: 'синф', reqRating: 'рейтинг', reqTrips: 'сафар', reqSeats: 'ҷой ва бештар',
    formTitle: 'Ариза гузоред', formSub: 'Оператор бо шумо тамос гирифта, дар бақайдгирӣ кӯмак мекунад',
    name: 'Ном ва насаб', namePh: 'Масалан: Ҷасур Каримов', phone: 'Телефон', city: 'Шаҳр', car: 'Мошин', carPh: 'Моделро интихоб кунед', year: 'Соли истеҳсол',
    fits: 'Тарифҳои мувофиқ', later: 'баъдтар', none: 'Ин мошин ҳоло ба тарифҳо мувофиқ нест', send: 'Фиристодани ариза', sending: 'Фиристода мешавад…',
    okTitle: 'Ташаккур! Аризаи шумо қабул шуд', okText: 'Оператор ба зудӣ занг мезанад. То он вақт ҳуҷҷатҳоро омода кунед: шаҳодатнома, шиносномаи техникӣ, иҷозатномаи такси ва OSAGO.',
    again: 'Аризаи нав', errName: 'Номи худро ворид кунед', errPhone: 'Рақами телефонро пурра ворид кунед', errCar: 'Мошинро интихоб кунед', errYear: 'Солро дуруст ворид кунед',
    consent: 'Бо фиристодан шумо розӣ мешавед, ки маълумоти шумо танҳо барои тамос бо шумо истифода мешавад.',
  },
  faq: { title: 'Саволҳои маъмул' },
  footer: { contacts: 'Тамос', telegram: 'Telegram', rights: 'Ҳамаи ҳуқуқҳо ҳифз шудаанд', admin: 'Панели идоракунӣ', made: 'Дар Тошкент сохта шудааст' },
};

const ar: Dict = {
  meta: { title: 'YUMS Taxi — تاكسي في طشقند' },
  nav: { tariffs: 'الفئات', estimate: 'السعر', drivers: 'للسائقين', faq: 'الأسئلة', download: 'حمّل التطبيق', menu: 'القائمة' },
  theme: { light: 'المظهر الفاتح', dark: 'المظهر الداكن' },
  hero: { badge: 'في جميع أنحاء طشقند · 24/7', order: 'اطلب تاكسي', become: 'كن سائقًا', promoCopy: 'رمز ترويجي', copied: 'تم النسخ' },
  stores: { apple: 'App Store', google: 'Google Play', web: 'نسخة الويب', soon: 'قريبًا', title: 'تطبيق YUMS' },
  stats: { online: 'سائق متصل', trips: 'رحلة اليوم', pickup: 'د — متوسط وقت الوصول', rating: 'متوسط التقييم', live: 'بيانات مباشرة' },
  values: [
    { title: 'السعر مسبقًا', text: 'ترى السعر الدقيق قبل الطلب' },
    { title: 'سائقون موثّقون', text: 'المستندات ومعايير السيارة' },
    { title: 'تتبع مباشر', text: 'السيارة على الخريطة ويمكنك مشاركة رحلتك' },
  ],
  estimate: {
    title: 'احسب الأجرة', sub: 'من أين وإلى أين — سعر تقديري لكل فئة', from: 'من', to: 'إلى',
    pick: 'اختر', km: 'كم', min: 'د', loading: 'جارٍ حساب المسار…', surge: 'طلب مرتفع',
    note: 'سعر تقديري: يُحسب المبلغ الدقيق في التطبيق حسب المسار وحركة المرور.', swap: 'تبديل', priceOf: 'سعر {name}',
  },
  tariffs: {
    title: 'فئة تناسب كل رحلة', sub: 'من التنقل اليومي إلى الاجتماعات المهمة', seats: 'مقاعد', base: 'الأجرة الأساسية', perKm: 'لكل كم', perMin: 'لكل دقيقة', minFare: 'الحد الأدنى',
  },
  features: {
    title: 'لماذا YUMS', sub: 'نجعل كل رحلة آمنة وواضحة مسبقًا',
    items: [
      { title: 'سعر شفاف', text: 'ترى السعر قبل الطلب. وعند ارتفاع الطلب يظهر المعامل مسبقًا أيضًا.' },
      { title: 'سائقون موثّقون', text: 'نتحقق من رخصة القيادة ووثيقة تسجيل السيارة ورخصة التاكسي وتأمين OSAGO. لا يمكن العمل بوثيقة منتهية الصلاحية.' },
      { title: 'رحلة آمنة', text: 'السائق والسيارة ورقم اللوحة في التطبيق، والسيارة على الخريطة مباشرة. في حالات الطوارئ: 112 بضغطة واحدة.' },
      { title: 'مراقبة الجودة', text: 'تقيّم كل رحلة. لا يمكن للسائقين ذوي التقييم المنخفض العمل في فئتي «مريحة» و«أعمال».' },
      { title: 'دعم على مدار الساعة', text: 'سؤال أو مشكلة؟ رد سريع عبر الدردشة في التطبيق أو الهاتف.' },
      { title: 'دفع مريح', text: 'نقدًا أو Uzcard أو Humo أو Visa أو رصيد YUMS. تُطبَّق رموز الخصم والتخفيضات تلقائيًا في التطبيق.' },
    ],
  },
  driver: {
    badge: 'YUMS Driver', benefits: ['جدول مرن', 'تحويل الأرباح إلى البطاقة خلال 1–2 دقيقة', 'طلبات متتالية', 'ملاحة صوتية'], commission: 'العمولة',
    calcTitle: 'حاسبة الأرباح', hours: 'ساعات يوميًا', days: 'أيام أسبوعيًا', tariff: 'الفئة', week: 'أسبوعيًا', month: 'شهريًا', gross: 'إجمالي الرحلات', fee: 'عمولة YUMS', net: 'صافي ربحك',
    calcNote: 'تقدير تقريبي: رحلة متوسطة 7 كم / 18 دقيقة، و1.6 طلب في الساعة، دون تكاليف الوقود. تعتمد الأرباح الفعلية على الوقت والمنطقة والطلب.',
    reqTitle: 'متطلبات الفئات', reqYear: 'أو أحدث', reqClass: 'الفئة', reqRating: 'التقييم', reqTrips: 'رحلة', reqSeats: 'مقاعد أو أكثر',
    formTitle: 'قدّم طلبك', formSub: 'سيتواصل معك أحد الموظفين ويساعدك في التسجيل',
    name: 'الاسم الكامل', namePh: 'مثال: جاسور كريموف', phone: 'الهاتف', city: 'المدينة', car: 'السيارة', carPh: 'اختر الطراز', year: 'سنة الصنع',
    fits: 'الفئات المناسبة', later: 'لاحقًا', none: 'هذه السيارة لا تناسب أي فئة حاليًا', send: 'إرسال الطلب', sending: 'جارٍ الإرسال…',
    okTitle: 'شكرًا! تم استلام طلبك', okText: 'سيتصل بك أحد الموظفين قريبًا. جهّز مستنداتك في هذه الأثناء: رخصة القيادة ووثيقة تسجيل السيارة ورخصة التاكسي وتأمين OSAGO.',
    again: 'طلب جديد', errName: 'أدخل اسمك', errPhone: 'أدخل رقم الهاتف كاملًا', errCar: 'اختر السيارة', errYear: 'أدخل سنة صحيحة',
    consent: 'بالإرسال فإنك توافق على استخدام بياناتك للتواصل معك فقط.',
  },
  faq: { title: 'الأسئلة الشائعة' },
  footer: { contacts: 'التواصل', telegram: 'Telegram', rights: 'جميع الحقوق محفوظة', admin: 'لوحة الإدارة', made: 'صُنع في طشقند' },
};

export const T: Record<Lang, Dict> = { uz, ru, en, tg, ar };
