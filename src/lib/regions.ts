// Mamlakatlarning viloyat va yirik shaharlari — loyiha/profil hududini ro'yxatdan tanlash uchun.
// Saqlanadigan qiymat — o'zbekcha nom (`uz`): hamma uchun bir xil. Ko'rsatishda ilova tiliga o'giriladi.
// Ro'yxati yo'q mamlakatda hudud qo'lda yoziladi.
import { getLang } from '@/lib/i18n';

export type Region = { uz: string; ru: string; en: string };

const r = (uz: string, ru: string, en: string): Region => ({ uz, ru, en });

export const REGIONS: Partial<Record<string, Region[]>> = {
  UZ: [
    r('Toshkent shahri', 'г. Ташкент', 'Tashkent city'),
    r('Toshkent viloyati', 'Ташкентская область', 'Tashkent Region'),
    r('Andijon viloyati', 'Андижанская область', 'Andijan Region'),
    r('Buxoro viloyati', 'Бухарская область', 'Bukhara Region'),
    r("Farg'ona viloyati", 'Ферганская область', 'Fergana Region'),
    r('Jizzax viloyati', 'Джизакская область', 'Jizzakh Region'),
    r('Xorazm viloyati', 'Хорезмская область', 'Khorezm Region'),
    r('Namangan viloyati', 'Наманганская область', 'Namangan Region'),
    r('Navoiy viloyati', 'Навоийская область', 'Navoi Region'),
    r('Qashqadaryo viloyati', 'Кашкадарьинская область', 'Kashkadarya Region'),
    r('Samarqand viloyati', 'Самаркандская область', 'Samarkand Region'),
    r('Sirdaryo viloyati', 'Сырдарьинская область', 'Syrdarya Region'),
    r('Surxondaryo viloyati', 'Сурхандарьинская область', 'Surkhandarya Region'),
    r("Qoraqalpog'iston Respublikasi", 'Республика Каракалпакстан', 'Republic of Karakalpakstan'),
  ],
  KZ: [
    r('Astana', 'Астана', 'Astana'),
    r('Almati', 'Алматы', 'Almaty'),
    r('Chimkent', 'Шымкент', 'Shymkent'),
    r('Abay viloyati', 'Абайская область', 'Abai Region'),
    r('Aqmola viloyati', 'Акмолинская область', 'Akmola Region'),
    r("Aqto'be viloyati", 'Актюбинская область', 'Aktobe Region'),
    r('Almati viloyati', 'Алматинская область', 'Almaty Region'),
    r('Atirau viloyati', 'Атырауская область', 'Atyrau Region'),
    r("Sharqiy Qozog'iston viloyati", 'Восточно-Казахстанская область', 'East Kazakhstan Region'),
    r('Jambil viloyati', 'Жамбылская область', 'Jambyl Region'),
    r('Jetisuv viloyati', 'Жетысуская область', 'Jetisu Region'),
    r("G'arbiy Qozog'iston viloyati", 'Западно-Казахстанская область', 'West Kazakhstan Region'),
    r("Qarag'anda viloyati", 'Карагандинская область', 'Karaganda Region'),
    r('Qostanay viloyati', 'Костанайская область', 'Kostanay Region'),
    r("Qizilo'rda viloyati", 'Кызылординская область', 'Kyzylorda Region'),
    r("Mang'istov viloyati", 'Мангистауская область', 'Mangystau Region'),
    r('Pavlodar viloyati', 'Павлодарская область', 'Pavlodar Region'),
    r("Shimoliy Qozog'iston viloyati", 'Северо-Казахстанская область', 'North Kazakhstan Region'),
    r('Turkiston viloyati', 'Туркестанская область', 'Turkistan Region'),
    r('Ulitov viloyati', 'Улытауская область', 'Ulytau Region'),
  ],
  KG: [
    r('Bishkek', 'Бишкек', 'Bishkek'),
    r("O'sh shahri", 'г. Ош', 'Osh city'),
    r('Botken viloyati', 'Баткенская область', 'Batken Region'),
    r('Jalolobod viloyati', 'Джалал-Абадская область', 'Jalal-Abad Region'),
    r("Issiqko'l viloyati", 'Иссык-Кульская область', 'Issyk-Kul Region'),
    r('Norin viloyati', 'Нарынская область', 'Naryn Region'),
    r("O'sh viloyati", 'Ошская область', 'Osh Region'),
    r('Talas viloyati', 'Таласская область', 'Talas Region'),
    r('Chuy viloyati', 'Чуйская область', 'Chuy Region'),
  ],
  TJ: [
    r('Dushanbe', 'Душанбе', 'Dushanbe'),
    r("Sug'd viloyati", 'Согдийская область', 'Sughd Region'),
    r('Xatlon viloyati', 'Хатлонская область', 'Khatlon Region'),
    r("Tog'li Badaxshon", 'Горно-Бадахшанская АО', 'Gorno-Badakhshan'),
    r("Respublikaga bo'ysunuvchi tumanlar", 'Районы республиканского подчинения', 'Districts of Republican Subordination'),
  ],
  TM: [
    r('Ashxobod', 'Ашхабад', 'Ashgabat'),
    r('Ahal viloyati', 'Ахалский велаят', 'Ahal Region'),
    r('Balkan viloyati', 'Балканский велаят', 'Balkan Region'),
    r("Dashog'uz viloyati", 'Дашогузский велаят', 'Dashoguz Region'),
    r('Lebap viloyati', 'Лебапский велаят', 'Lebap Region'),
    r('Mari viloyati', 'Марыйский велаят', 'Mary Region'),
  ],
};

/** Hudud nomi ilova tilida: o'zbekcha — `uz`, kirillda (rus, tojik) — `ru`, qolganlari — `en` */
export function regionName(region: Region): string {
  const lang = getLang();
  return lang === 'uz' ? region.uz : lang === 'ru' || lang === 'tg' ? region.ru : region.en;
}

/** Saqlangan qiymatni (har qanday tilda yozilgan bo'lsa ham) ro'yxatdagi hududga moslaydi */
export function findRegion(country: string, value: string): Region | undefined {
  const v = value.trim().toLowerCase();
  return v ? REGIONS[country]?.find(x => [x.uz, x.ru, x.en].some(n => n.toLowerCase() === v)) : undefined;
}
