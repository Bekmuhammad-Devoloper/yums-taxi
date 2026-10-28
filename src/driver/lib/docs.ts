// Haydovchi hujjatlari: turlari, maydonlari, tekshiruvi.
// Hujjat yuborilgach «Tekshirilmoqda», so'ng «Tasdiqlangan» yoki sabab bilan «Rad etildi».

import type Ionicons from '@expo/vector-icons/Ionicons';

export type DocKind = 'license' | 'techPassport' | 'taxiLicense' | 'osago';
export type DocStatus = 'missing' | 'review' | 'approved' | 'rejected';
/** SAMPLE — demo hujjat: rasm o'rniga hujjat dizayni ko'rsatiladi */
export const SAMPLE = 'sample';

export type DriverDoc = {
  kind: DocKind;
  number: string;
  /** DD.MM.YYYY */
  issued?: string;
  expires?: string;
  /** guvohnoma toifalari (B, C …) */
  categories?: string;
  front?: string;
  back?: string;
  status: DocStatus;
  note?: string;
  submittedAt?: string;
  checkedAt?: string;
};

type Meta = {
  title: string;
  short: string;
  icon: keyof typeof Ionicons.glyphMap;
  numberLabel: string;
  placeholder: string;
  pattern: RegExp;
  expires: boolean;
  back: boolean;
  categories?: boolean;
  hint: string;
};

export const DOC_KINDS: DocKind[] = ['license', 'techPassport', 'taxiLicense', 'osago'];

export const DOC_META: Record<DocKind, Meta> = {
  license: {
    title: 'Haydovchilik guvohnomasi', short: 'Guvohnoma', icon: 'card', numberLabel: 'Seriya va raqam', placeholder: 'AF 1234567',
    pattern: /^[A-Z]{2} \d{7}$/, expires: true, back: true, categories: true,
    hint: "Old va orqa tomoni aniq ko'rinsin, yorug'lik aks etmasin",
  },
  techPassport: {
    title: 'Texnik pasport', short: 'Tex. pasport', icon: 'document-text', numberLabel: 'Seriya va raqam', placeholder: 'AAF 1234567',
    pattern: /^[A-Z]{3} \d{7}$/, expires: false, back: true,
    hint: 'Avtomobil profilingizdagi davlat raqami bilan bir xil bo\'lishi kerak',
  },
  taxiLicense: {
    title: 'Taksi litsenziyasi', short: 'Litsenziya', icon: 'ribbon', numberLabel: 'Litsenziya raqami', placeholder: 'TL 1234567',
    pattern: /^[A-Z]{2,3} \d{6,7}$/, expires: true, back: false,
    hint: "Transport vazirligi bergan amaldagi litsenziya",
  },
  osago: {
    title: "OSAGO sug'urtasi", short: 'OSAGO', icon: 'shield-checkmark', numberLabel: 'Polis raqami', placeholder: 'EAA 1234567',
    pattern: /^[A-Z]{2,4} \d{6,8}$/, expires: true, back: false,
    hint: "Polis amal qilish muddati tugamagan bo'lishi kerak",
  },
};

export const emptyDoc = (kind: DocKind): DriverDoc => ({ kind, number: '', status: 'missing' });

/** «af1234567» → «AF 1234567» */
export const fmtDocNumber = (s: string) => {
  const r = s.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 12);
  const m = r.match(/^([A-Z]*)(\d*)/);
  return m && m[1] && m[2] ? `${m[1]} ${m[2]}` : r;
};

/** «01022030» → «01.02.2030» */
export const fmtDate = (s: string) => {
  const d = s.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('.');
};

export const parseDate = (s?: string) => {
  const m = s?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null;
};

/** Forma xatolari (bo'sh obyekt — hammasi to'g'ri) */
export function validateDoc(d: DriverDoc, now = new Date()): Partial<Record<'number' | 'issued' | 'expires' | 'categories' | 'front' | 'back', string>> {
  const meta = DOC_META[d.kind];
  const e: Partial<Record<'number' | 'issued' | 'expires' | 'categories' | 'front' | 'back', string>> = {};
  if (!meta.pattern.test(d.number)) e.number = `Masalan: ${meta.placeholder}`;
  const issued = parseDate(d.issued);
  if (!issued || issued > now) e.issued = "Berilgan sanani to'g'ri kiriting (KK.OO.YYYY)";
  if (meta.expires) {
    const exp = parseDate(d.expires);
    if (!exp) e.expires = 'Amal qilish muddatini kiriting (KK.OO.YYYY)';
    else if (issued && exp <= issued) e.expires = 'Muddat berilgan sanadan keyin bo\'lishi kerak';
  }
  if (meta.categories && !/\bB\b/.test(d.categories ?? '')) e.categories = 'Taksi uchun kamida «B» toifasi kerak';
  if (!d.front) e.front = 'Old tomoni rasmini yuklang';
  if (meta.back && !d.back) e.back = 'Orqa tomoni rasmini yuklang';
  return e;
}

/** Moderator tekshiruvi (demo): muddati o'tgan hujjat rad etiladi */
export function reviewDoc(d: DriverDoc, now = new Date()): Pick<DriverDoc, 'status' | 'note'> {
  const exp = parseDate(d.expires);
  if (DOC_META[d.kind].expires && exp && exp < now) return { status: 'rejected', note: "Hujjat muddati o'tgan — yangisini yuklang" };
  return { status: 'approved', note: undefined };
}

/** Demo uchun namuna hujjat */
export function sampleDoc(kind: DocKind, now = new Date()): DriverDoc {
  const y = now.getFullYear();
  const num: Record<DocKind, string> = { license: 'AF 4821736', techPassport: 'AAF 0937215', taxiLicense: 'TL 205613', osago: 'EAA 7716240' };
  return {
    kind, number: num[kind], issued: `14.03.${y - 2}`, expires: DOC_META[kind].expires ? `14.03.${y + (kind === 'license' ? 8 : 1)}` : undefined,
    categories: kind === 'license' ? 'B, C' : undefined, front: SAMPLE, back: DOC_META[kind].back ? SAMPLE : undefined, status: 'missing',
  };
}
