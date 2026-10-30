// Sayt interfeysi matnlari (o'zbek va rus). Admin tahrirlaydigan matnlar — content.ts da.
import type { Lang } from './content';

const uz = {
  nav: { tariffs: 'Tariflar', estimate: 'Narx', drivers: 'Haydovchilarga', faq: 'Savollar', download: 'Ilovani olish' },
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
    note: "Taxminiy narx: aniq summa ilovada marshrut va tirbandlikka qarab hisoblanadi.", swap: "Almashtirish",
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
  nav: { tariffs: 'Тарифы', estimate: 'Цена', drivers: 'Водителям', faq: 'Вопросы', download: 'Приложение' },
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
    note: 'Примерная цена: точная сумма считается в приложении с учётом маршрута и пробок.', swap: 'Поменять местами',
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

export const T: Record<Lang, Dict> = { uz, ru };

/** Tarif nomlari va tavsifi (rus tilida) — o'zbekchasi src/lib/data.ts da */
export const TARIFF_RU: Record<string, { name: string; desc: string }> = {
  start: { name: 'Старт', desc: 'Недорого и быстро' },
  comfort: { name: 'Комфорт', desc: 'Новые машины, кондиционер' },
  business: { name: 'Бизнес', desc: 'Премиальные автомобили' },
  minivan: { name: 'Минивэн', desc: 'Для большой семьи и багажа' },
  delivery: { name: 'Доставка', desc: 'Документы и посылки' },
};
