// YUMS – O‘rgumchak Taxi Park va haydovchi o'rtasidagi ichki hamkorlik shartnomasi.
// Asl matn o'zbek kirill yozuvida (kompaniya bergan hujjat, faqat imlo va bo'shliqlar tuzatilgan) — lotin yozuvi
// shundan avtomatik olinadi. Matn o'zgarsa VERSION yangilanadi: haydovchilar yangi tahrirga qayta rozilik bildiradi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export const CONTRACT_VERSION = '2026-11-01';

export const CONTRACT_META = {
  company: 'ZALATIYE LASTOCHKA MCHJ',
  park: 'YUMS – O‘RGUMCHAK TAXI PARK',
  signed: '01.11.2026',
  until: '01.12.2030',
};

/** Shartnomadagi asosiy raqamlar (so'm) — ilovaning boshqa joylarida ham shulardan foydalaniladi */
export const CONTRACT_TERMS = {
  joinFee: 79_000,
  seniorityMonthly: 120_000,
  cardLinkFee: 3_200,
  keepBalance: 50_000,
  stopBelow: 5_000,
  commission: 1_200,
  brandedCommission: 950,
  brandedPerDistrict: 30,
  baseFare: 10_000,
  baseKm: 3,
  perKm: 1_800,
};

export type Clause = { n: string; text: string; items?: string[]; title?: string };
export type Section = { n: number; title: string; intro?: string; clauses: Clause[] };

export const CONTRACT_TITLE = 'Такси ҳайдовчилари билан ички ҳамкорлик шартномаси';

export const CONTRACT_PREAMBLE =
  'Бир томондан «ZALATIYE LASTOCHKA» MCHJ қошида ташкил этилган YUMS – O‘RGUMCHAK TAXI PARK (кейинги ўринларда «Компания»), ' +
  'иккинчи томондан қуйидаги маълумотларга эга бўлган ҳайдовчи (кейинги ўринларда «Ҳамкор ҳайдовчи») ўртасида ушбу шартнома тузилди.';

export const CONTRACT_SECTIONS: Section[] = [
  {
    n: 1, title: 'Шартноманинг мақсади ва муддати', clauses: [
      { n: '1.1', text: 'Ушбу шартнома Компания ва такси ҳайдовчилари ўртасида ҳамкорлик муносабатларини ташкил этиш, электрон платформа орқали буюртмалар қабул қилиш ва йўловчиларга хизмат кўрсатиш тартибини белгилайди.' },
      { n: '1.2', text: 'Шартнома 01.12.2030 йилгача бўлган муддатга тузилади.' },
      { n: '1.3', text: 'Томонларнинг ўзаро розилиги билан шартнома узайтирилиши мумкин.' },
      { n: '1.4', text: 'Ҳамкорлик ихтиёрийлик ва ўзаро манфаатдорлик асосида амалга оширилади.' },
    ],
  },
  {
    n: 2, title: 'Аъзолик бадали ва ойлик тўловлар', clauses: [
      { n: '2.1', text: 'Ҳамкорликни бошлаш учун ҳайдовчи бир марталик аъзолик бадали сифатида 79 000 (етмиш тўққиз минг) сўм тўлайди.' },
      { n: '2.2', text: 'Ҳайдовчи иш стажини расмийлаштиришни хоҳласа, ҳар ой 120 000 (бир юз йигирма минг) сўм тўлов амалга оширади.' },
      { n: '2.3', text: 'Иш стажини расмийлаштириш 0,25 штат бирлиги асосида, меҳнат қонунчилиги талабларига мувофиқ алоҳида меҳнат ҳужжатлари билан расмийлаштирилади.' },
      { n: '2.4', text: 'Иш ҳақи, иш вақти, солиқлар ва бошқа мажбурий тўловлар қонунчилик асосида белгиланади.' },
      { n: '2.5', text: 'Ҳайдовчи платформага аъзо бўлиб, банк картасини бириктирганда 3 200 сўм бир марталик хизмат ҳақи ечилади.' },
    ],
  },
  {
    n: 3, title: 'Электрон ҳисоб ва баланс тартиби', clauses: [
      { n: '3.1', text: 'Ҳайдовчининг электрон ҳисобида доимий ишлаш учун 50 000 сўм маблағ сақланиши белгиланади.' },
      { n: '3.2', text: 'Ҳисобдаги маблағ 5 000 сўмгача камайганда, янги буюртмаларни қабул қилиш вақтинча тўхтатилади.' },
      { n: '3.3', text: 'Ҳайдовчи ўз ҳисобини мустақил равишда тўлдириши лозим.' },
      { n: '3.4', text: 'Барча ҳисоб-китоблар электрон платформада акс эттирилади.' },
    ],
  },
  {
    n: 4, title: 'Ҳар бир буюртма учун комиссия', clauses: [
      { n: '4.1', text: 'Ҳар бир бажарилган буюртма учун Компания комиссияси 1 200 сўмни ташкил этади.' },
      { n: '4.2', text: 'Агар ҳайдовчи Компания бренди туширилган автомобиль билан хизмат кўрсатса, ҳар бир бажарилган буюртма учун комиссия 950 сўм этиб белгиланади. Бренд сони: вилоят аро ҳар туманда 30 кишигача ваколат берилади.' },
      { n: '4.3', text: 'Комиссия электрон платформа орқали ҳисобланади.' },
      { n: '4.4', text: 'Ҳайдовчи буюртмаларни белгиланган тартибда бажариши шарт.' },
    ],
  },
  {
    n: 5, title: 'Мижозлар учун йўл ҳақи тарифлари', clauses: [
      { n: '5.1', text: 'Дастлабки 3 километр учун йўловчи тўлови 10 000 сўм этиб белгиланади.' },
      { n: '5.2', text: 'Ҳар бир қўшимча километр учун 1 800 сўм қўшилади.' },
      { n: '5.3', text: 'Тарифлар электрон платформада автоматик ҳисобланади.' },
      { n: '5.4', text: 'Йўловчи буюртмани қабул қилишдан олдин йўл ҳақи билан танишиш имкониятига эга бўлади.' },
    ],
  },
  {
    n: 6, title: 'Ҳамкор ҳайдовчилар учун бонуслар',
    intro: 'Компания ўз тармоғини кенгайтиришга ҳисса қўшган фаол ҳайдовчиларни қуйидаги рағбатлантириш дастури асосида қўллаб-қувватлайди.',
    clauses: [
      { n: '6.1', title: 'Автомобиль балонлари бонуси', text: 'Ҳайдовчи Компанияга 18–20 нафар янги ҳайдовчини ва уларнинг автомобилларини ҳамкорликка жалб қилса, жалб қилинган ҳайдовчилар 30 кун давомида яхши натижа билан ишласа, уларни жалб қилган ҳайдовчининг автомобили учун балонларини бир марта Компания ҳисобидан алмаштириб бериш бонуси берилади.' },
      { n: '6.2', title: 'Мотор мойи бонуси', text: 'Ҳайдовчи Компания платформаси орқали келган мижозларга хизмат кўрсатиб, 3 000 километр масофа босиб ўтса, Компания томонидан бир марта автомобиль мотор мойи қуйиб бериш бонуси тақдим этилади.' },
      {
        n: '6.3', title: 'Ички туризм бонуси', text: 'Ҳайдовчи 18–20 нафар ҳайдовчини ҳамкорликка жалб қилиб, улар билан 3 ой давомида барқарор ва яхши натижа билан ишласа, Компания томонидан бир марта қуйидаги бонус тақдим этилади:',
        items: ['3 кунлик ички туризм саёҳати;', '2 кеча меҳмонхонада тунаш;', 'туристик пакет;', 'саёҳат суғуртаси ёки автомобиль техник кўригидан ўтказиш хизмати.'],
      },
      { n: '6.4', title: 'Ота-онаси учун Умра зиёрати бонуси', text: 'Ҳайдовчи Компания тармоғини кенгайтириш мақсадида 18–20 нафар янги ҳайдовчи ва уларнинг автомобилларини ҳамкорликка жалб қилса ҳамда жалб қилинган ҳайдовчилар билан камида 6 ой давомида барқарор ҳамкорликни таъминласа, Компания ушбу фаол ҳайдовчининг ота-онасини Умра зиёратига юборишни бонус сифатида таъминлаш мажбуриятини олади. Ушбу бонус сафар ташкилотчиси билан келишилган расмий йўлланма, ҳужжатлар, сафар муддати ва қонуний талаблар асосида амалга оширилади.' },
      { n: '6.5', text: 'Барча бонуслар белгиланган шартлар бажарилгани электрон платформа ва Компания ҳисоботлари орқали тасдиқлангандан кейин тақдим этилади.' },
    ],
  },
  {
    n: 7, title: 'Лицензия ва иш стажини расмийлаштириш', clauses: [
      { n: '7.1', text: 'Компания ҳайдовчиларга такси фаолияти учун зарур бўлган лицензия ва рухсатномаларни расмийлаштиришда қонуний тартибда ёрдам кўрсатади.' },
      { n: '7.2', text: 'Иш стажини расмийлаштириш томонларнинг келишуви асосида ва амалдаги меҳнат қонунчилиги талабларига мувофиқ амалга оширилади.' },
      { n: '7.3', text: 'Лицензия, рухсатнома ва бошқа хизматлар бўйича тўловлар олдиндан келишилади.' },
      { n: '7.4', text: 'Ҳеч бир рухсатнома ёки иш стажи ҳужжати қонунчиликка зид равишда расмийлаштирилмайди.' },
    ],
  },
  {
    n: 8, title: 'Ҳайдовчининг мажбуриятлари', intro: 'Ҳамкор ҳайдовчи:', clauses: [
      { n: '8.1', text: 'Йўл ҳаракати қоидаларига риоя қилиши;' },
      { n: '8.2', text: 'Автомобилни техник жиҳатдан соз ҳолатда сақлаши;' },
      { n: '8.3', text: 'Йўловчилар билан хушмуомала бўлиши;' },
      { n: '8.4', text: 'Буюртмаларни сифатли ва ўз вақтида бажариши;' },
      { n: '8.5', text: 'Компания платформасидан белгиланган тартибда фойдаланиши;' },
      { n: '8.6', text: 'Компаниянинг ишчанлик обрўсига зарар етказмаслиги;' },
      { n: '8.7', text: 'Мижозларнинг шахсий маълумотларини сир сақлаши шарт.' },
    ],
  },
  {
    n: 9, title: 'Компаниянинг мажбуриятлари', intro: 'Компания:', clauses: [
      { n: '9.1', text: 'Ҳайдовчини платформага рўйхатдан ўтказади.' },
      { n: '9.2', text: 'Электрон буюртмалар тизимини ташкил этади.' },
      { n: '9.3', text: 'Ҳисоб-китобларни электрон тарзда юритади.' },
      { n: '9.4', text: 'Ҳайдовчиларга ташкилий ва техник ёрдам кўрсатади.' },
      { n: '9.5', text: 'Бонус шартлари бажарилганда белгиланган рағбатлантиришларни тақдим этади.' },
      { n: '9.6', text: 'Ҳамкорлик тармоғини кенгайтириш ва мижозлар базасини ривожлантириш бўйича иш олиб боради.' },
    ],
  },
  {
    n: 10, title: 'Шартномани бекор қилиш', clauses: [
      { n: '10.1', text: 'Томонлар ўзаро келишув асосида шартномани бекор қилиш ҳуқуқига эга.' },
      { n: '10.2', text: 'Шартномани бекор қилиш истаги ҳақида иккинчи томонга олдиндан ёзма хабар берилади.' },
      { n: '10.3', text: 'Шартнома бекор қилинганда ўзаро ҳисоб-китоблар якунланади.' },
      { n: '10.4', text: 'Бажарилган хизматлар ва юзага келган мажбуриятлар бўйича ҳисоб-китоблар қонунчилик асосида амалга оширилади.' },
    ],
  },
  {
    n: 11, title: 'Якуний қоидалар', clauses: [
      { n: '11.1', text: 'Ушбу шартномада кўрсатилмаган масалалар томонларнинг ўзаро келишуви ва амалдаги қонунчилик асосида ҳал қилинади.' },
      { n: '11.2', text: 'Шартнома икки нусхада тузилади.' },
      { n: '11.3', text: 'Ҳар икки томон шартнома шартлари билан танишиб, розилик билдирган ҳолда имзо қўяди.' },
    ],
  },
];

export type ReqLink = 'tel' | 'telegram' | 'web';
/** 12-bo'lim: kompaniya rekvizitlari (yorliq kirillda, qiymat asl ko'rinishida) */
export const COMPANY_REQUISITES: { label: string; value: string; link?: ReqLink }[] = [
  { label: 'Ташкилот', value: 'ZALATIYE LASTOCHKA MCHJ' },
  { label: 'Фирма номи', value: 'YUMS – O‘RGUMCHAK TAXI PARK' },
  { label: 'СТИР', value: '308122009' },
  { label: 'Ҳисоб рақами', value: '2020 8000 6053 3284 8001' },
  { label: 'Банк', value: 'AGROBANK UZUN FILIALI' },
  { label: 'Телефон', value: '+998 99 571 24 63', link: 'tel' },
  { label: 'Менежер (Telegram)', value: '@zalatiye_lastochka', link: 'telegram' },
  { label: 'Веб-сайт', value: 'VALLEYOFANTS.UZ', link: 'web' },
  { label: 'Раҳбар', value: 'HIMOYDINOV M.' },
];

/** Haydovchi tomoni: ilovadagi profildan to'ldiriladi (bo'sh qolganlari hujjatlar bo'limida) */
export const DRIVER_REQUISITES = {
  name: 'Ф.И.Ш.',
  passport: 'Паспорт / ID',
  license: 'Ҳайдовчилик гувоҳномаси',
  techPassport: 'Автомобиль техпаспорти',
  car: 'Автомобиль русуми',
  plate: 'Давлат рақами',
  platformId: 'Платформа ID',
  phone: 'Телефон рақами',
} as const;

export const CONTRACT_NOTE =
  'YUMS – O‘RGUMCHAK TAXI янги платформа бўлгани боис, халққа танилгунига қадар бошланғич фаолият давомида мижозлар сони бироз камроқ бўлиши мумкин (эҳтимоли бор).';

export const CONTRACT_CONSENT = 'Ҳайдовчи шартнома шартлари билан танишди ва розилик билдирди.';

/* ---------- Yozuv: kirill → lotin (o'zbek imlosi) ---------- */

export type Script = 'latn' | 'cyrl';

const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: "'", ы: 'i',
  ь: '', э: 'e', ю: 'yu', я: 'ya', ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h',
};
const CYR = /[а-яёўқғҳ]/i;
const VOWEL = /[аеёиоуўэюяъь]/i;
const isUpper = (ch: string | undefined) => !!ch && ch !== ch.toLowerCase();

/** O'zbek kirill matnini lotin yozuviga o'giradi (lotin harflari, raqamlar va belgilar o'zgarmaydi) */
export function toLatin(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const low = ch.toLowerCase();
    if (!CYR.test(ch)) { out += ch; continue; }
    const prev = s[i - 1];
    let lat = MAP[low];
    // «е» so'z boshida va unlidan keyin — «ye» (yetmish, yechiladi), qolganida — «e»
    if (low === 'е') lat = !prev || !CYR.test(prev) || VOWEL.test(prev) ? 'ye' : 'e';
    if (lat === undefined) { out += ch; continue; }
    if (isUpper(ch)) {
      const next = s[i + 1];
      // butun so'z bosh harflarda bo'lsa (СТИР) — hammasi katta; aks holda faqat birinchi harf (Sh, Ye, O')
      const allCaps = (CYR.test(next ?? '') && isUpper(next)) || (!CYR.test(next ?? '') && CYR.test(prev ?? '') && isUpper(prev));
      lat = allCaps ? lat.toUpperCase() : lat.charAt(0).toUpperCase() + lat.slice(1);
    }
    out += lat;
  }
  return out;
}

/** Matnni tanlangan yozuvda qaytaradi */
export const inScript = (s: string, script: Script) => (script === 'latn' ? toLatin(s) : s);

/* ---------- Rozilik (qurilmada, har bir hisob uchun alohida) ---------- */

export type Acceptance = { version: string; at: string };
const KEY = 'yd:contract';
type Saved = Record<string, Acceptance>;

let saved: Saved | null = null;
const listeners = new Set<() => void>();

async function read(): Promise<Saved> {
  if (saved) return saved;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    saved = raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    saved = {};
  }
  return saved;
}

/** Shu hisobning amaldagi tahrirga roziligi (bo'lmasa null). `undefined` — hali o'qilmoqda */
export function useContractAcceptance(account: string | undefined): Acceptance | null | undefined {
  const pick = () => {
    const a = saved?.[account ?? 'guest'];
    return a && a.version === CONTRACT_VERSION ? a : null;
  };
  const [value, setValue] = useState<Acceptance | null | undefined>(() => (saved ? pick() : undefined));
  useEffect(() => {
    let alive = true;
    const sync = () => { if (alive) setValue(pick()); };
    read().then(sync);
    listeners.add(sync);
    return () => { alive = false; listeners.delete(sync); };
    // hisob almashganda qayta o'qiladi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  return value;
}

export async function acceptContract(account: string | undefined): Promise<void> {
  const all = { ...(await read()), [account ?? 'guest']: { version: CONTRACT_VERSION, at: new Date().toISOString() } };
  saved = all;
  listeners.forEach(f => f());
  await AsyncStorage.setItem(KEY, JSON.stringify(all)).catch(() => {});
}
