// STIR (INN) va JShShIR (PINFL) tekshiruvi.
//
// Haqiqiy reyestr: EXPO_PUBLIC_REGISTRY_API berilsa, `${API}/company/{stir}` so'raladi
// (javob: { name, director, status: 'active' | 'liquidated' }). Bu server soliq.uz / orginfo.uz
// kabi rasmiy manbalardan ma'lumot oladi — mobil ilova ularga to'g'ridan-to'g'ri murojaat qilmaydi.
// API berilmasa, demo reyestr ishlatiladi (to'qilgan yozuvlar, haqiqiy kompaniyalar emas).

import { tr } from '@/lib/i18n';

export type CompanyRecord = { stir: string; name: string; director: string; status: 'active' | 'liquidated' };
export type LookupResult = { ok: true; record: CompanyRecord } | { ok: false; reason: 'notfound' | 'network' };

/** STIR: 9 raqam. Yuridik shaxslarda 2 yoki 3 bilan, jismoniy shaxslarda 4–6 bilan boshlanadi */
export function checkStir(s: string, kind: 'company' | 'person' = 'company'): string | null {
  if (!/^\d{9}$/.test(s)) return tr("STIR 9 ta raqamdan iborat bo'lishi kerak");
  if (kind === 'company' && !/^[23]/.test(s)) return tr('Yuridik shaxs STIRi 2 yoki 3 bilan boshlanadi');
  return null;
}

/**
 * JShShIR: 14 raqam. 1-raqam — asr va jins (3/4 — 1900-yillar, 5/6 — 2000-yillar),
 * keyingi 6 raqam — tug'ilgan sana (KKOOYY).
 */
export function checkPinfl(s: string): { error: string | null; birth?: Date } {
  if (!/^\d{14}$/.test(s)) return { error: tr("JShShIR 14 ta raqamdan iborat bo'lishi kerak") };
  const century = { '1': 1800, '2': 1800, '3': 1900, '4': 1900, '5': 2000, '6': 2000 }[s[0]];
  if (!century) return { error: tr('JShShIR 1–6 raqamlaridan biri bilan boshlanadi') };
  const d = +s.slice(1, 3), m = +s.slice(3, 5), y = century + +s.slice(5, 7);
  const birth = new Date(y, m - 1, d);
  if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) return { error: tr("JShShIR ichidagi tug'ilgan sana noto'g'ri") };
  const age = (Date.now() - birth.getTime()) / (365.25 * 86400000);
  if (age < 18) return { error: tr("Ro'yxatdan o'tish uchun 18 yoshdan katta bo'lish kerak"), birth };
  if (age > 110) return { error: tr("JShShIR ichidagi tug'ilgan sana noto'g'ri") };
  return { error: null, birth };
}

/** JShShIR birinchi raqamidan jins: 1/3/5 — erkak, 2/4/6 — ayol (rasmiy kodlash) */
export function pinflGender(s?: string): 'm' | 'f' | undefined {
  if (!s || !/^[1-6]/.test(s)) return undefined;
  return +s[0] % 2 === 1 ? 'm' : 'f';
}

const FEMALE_NAMES = new Set(['nilufar', 'dilnoz', 'mohinur', 'yulduz', 'nargiz', 'saodat', 'barno', 'gulnor', 'dilorom', 'sabohat', 'muattar', 'farangiz', 'rano', 'oydin', 'gulshan', 'mehrinoz', 'sevinch', 'lyubov']);
const MALE_A_NAMES = new Set(['musa', 'isa', 'mustafa', 'hamza', 'yahya', 'zakariya', 'murtaza', 'taha', 'mirza', 'nikita', 'ilya', 'sasha', 'misha', 'dima', 'kolya', 'vanya', 'petya', 'vova']);

/**
 * Ismdan taxminiy jins — faqat standart rasm tanlash uchun (jinsi saqlanmagan eski profillar, JShShIR'siz yo'lovchilar).
 * Familiya/otasining ismi (-ova, -eva, qizi / -ov, -ev, o'g'li) aniqroq; bo'lmasa ism oxiri. Noma'lum bo'lsa — erkak.
 */
export function nameGender(name?: string): 'm' | 'f' {
  const words = (name ?? '').toLowerCase().replace(/[ʻʼ'`’‘]/g, '').split(/\s+/).filter(Boolean);
  for (const w of words.slice(1)) {
    if (/(ova|eva|yeva|ovna|evna|qizi|kizi|ова|ева|овна|евна|қизи)$/.test(w)) return 'f';
    if (/(ov|ev|yev|ovich|evich|ogli|ugli|ов|ев|ович|евич|ўғли|угли)$/.test(w)) return 'm';
  }
  const first = words[0] ?? '';
  if (FEMALE_NAMES.has(first)) return 'f';
  if (MALE_A_NAMES.has(first)) return 'm';
  return /(a|ya|oy|xon|gul|bonu|niso|bibi|а|я|ой|хон|гул)$/.test(first) ? 'f' : 'm';
}

/** Demo reyestr — faqat sinov uchun to'qilgan yozuvlar */
export const DEMO_REGISTRY: CompanyRecord[] = [
  { stir: '301234567', name: '«YUMS DEMO» MChJ', director: 'Karimov Aziz Bahodirovich', status: 'active' },
  { stir: '302345678', name: '«SILK ROAD LOGISTICS» MChJ', director: 'Saidova Nodira Alisherovna', status: 'active' },
  { stir: '207654321', name: '«AGROSMART» MChJ', director: 'Rahimov Bekzod Tolibovich', status: 'active' },
  { stir: '305555555', name: '«ESKI SAVDO» MChJ', director: 'Tursunov Jamshid', status: 'liquidated' },
];

const API = process.env.EXPO_PUBLIC_REGISTRY_API;

export async function lookupCompany(stir: string): Promise<LookupResult> {
  if (API) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${API.replace(/\/$/, '')}/company/${stir}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status === 404) return { ok: false, reason: 'notfound' };
      if (!res.ok) return { ok: false, reason: 'network' };
      const j = await res.json();
      return { ok: true, record: { stir, name: String(j.name ?? ''), director: String(j.director ?? ''), status: j.status === 'liquidated' ? 'liquidated' : 'active' } };
    } catch {
      return { ok: false, reason: 'network' };
    }
  }
  await new Promise(r => setTimeout(r, 700)); // reyestr so'rovi taqlidi
  const record = DEMO_REGISTRY.find(x => x.stir === stir);
  return record ? { ok: true, record } : { ok: false, reason: 'notfound' };
}

/** Nomni solishtirish uchun: tashkiliy shakl, qo'shtirnoq, apostrof va bo'shliqlarsiz */
const LEGAL_FORMS = /\b(mchj|mas'uliyati cheklangan jamiyat|xk|aj|qk|ooo|ao|llc|ltd|inc|yatt|xususiy korxona|oilaviy korxona)\b/g;
export const normName = (s: string) =>
  s.toLowerCase()
    .replace(/[ʻʼ’‘`´]/g, "'")
    .replace(LEGAL_FORMS, ' ')
    .replace(/[«»"“”.,()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Kompaniya nomi mosligi: tashkiliy shakl va tinish belgilarisiz bir xil */
export const companyMatches = (input: string, record: CompanyRecord) => {
  const a = normName(input), b = normName(record.name);
  return !!a && a === b;
};

/** Mas'ul shaxs rahbar bilan mos: kiritilgan ism-familiyaning har bir so'zi rahbar F.I.Sh.da bor (kamida 2 so'z) */
export const directorMatches = (input: string, record: CompanyRecord) => {
  const words = normName(input).split(' ').filter(w => w.length > 1);
  const dir = normName(record.director).split(' ');
  return words.length >= 2 && words.every(w => dir.includes(w));
};
