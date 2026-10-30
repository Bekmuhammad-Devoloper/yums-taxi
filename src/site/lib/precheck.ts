// Hujjatni avtomatik tekshirish (admin panel ko'rinishi). Qoidalar server/precheck.mjs bilan bir xil —
// server shu natija bo'yicha aniq holatlarni o'zi tasdiqlaydi yoki rad etadi, qolganini moderator ko'radi.
import { DOC_META, parseDate, type DocKind } from '@/driver/lib/docs';

import type { AdminDriver, DocMeta } from './admin-types';

export type Flag = { level: 'error' | 'warn' | 'info'; text: string };
export type Precheck = { score: number; flags: Flag[]; decision: 'approve' | 'manual' | 'reject'; note?: string };

const DAY = 86400000;
const EXPIRED = "Hujjat muddati o'tgan";

export const daysLeft = (doc: Pick<DocMeta, 'expires'>, now = new Date()) => {
  const exp = parseDate(doc.expires);
  return exp ? Math.floor((exp.getTime() - now.getTime()) / DAY) : null;
};

export function precheck(doc: DocMeta, driver: AdminDriver, all: AdminDriver[], now = new Date()): Precheck {
  const meta = DOC_META[doc.kind];
  const flags: Flag[] = [];
  if (!meta.pattern.test(doc.number ?? '')) flags.push({ level: 'error', text: "Raqam formati noto'g'ri" });
  const issued = parseDate(doc.issued);
  if (!issued || issued > now) flags.push({ level: 'error', text: "Berilgan sana noto'g'ri" });
  if (meta.expires) {
    const left = daysLeft(doc, now);
    if (left == null) flags.push({ level: 'error', text: "Amal qilish muddati ko'rsatilmagan" });
    else if (left < 0) flags.push({ level: 'error', text: EXPIRED });
    else if (left <= 30) flags.push({ level: 'warn', text: `Muddati ${left} kunda tugaydi` });
  }
  if (doc.kind === 'license' && !/\bB\b/.test(doc.categories ?? '')) flags.push({ level: 'error', text: "«B» toifasi yo'q" });
  if (doc.sample) {
    flags.push({ level: 'info', text: 'Namuna (demo) hujjat' });
  } else {
    if (!doc.hasFront) flags.push({ level: 'error', text: "Old tomoni rasmi yo'q" });
    if (meta.back && !doc.hasBack) flags.push({ level: 'error', text: "Orqa tomoni rasmi yo'q" });
    if (doc.kind === 'license' && issued && (now.getTime() - issued.getTime()) / (365.25 * DAY) < 3) flags.push({ level: 'warn', text: 'Haydovchilik staji 3 yildan kam' });
    const twin = all.find(o => o.id !== driver.id && o.docs[doc.kind as DocKind]?.number === doc.number && !o.docs[doc.kind as DocKind]?.sample);
    if (twin) flags.push({ level: 'warn', text: `Bu raqam ${twin.name} (${twin.plate ?? '—'}) hujjatida ham bor` });
  }
  const errors = flags.filter(f => f.level === 'error');
  const warns = flags.filter(f => f.level === 'warn');
  return {
    score: Math.max(0, 100 - errors.length * 45 - warns.length * 20),
    flags,
    decision: errors.length ? 'reject' : warns.length ? 'manual' : 'approve',
    note: errors[0] ? `${errors[0].text} — ${errors[0].text === EXPIRED ? 'yangisini yuklang' : 'tuzatib qayta yuboring'}` : undefined,
  };
}

/** Rad etish uchun tayyor sabablar */
export const REJECT_REASONS = [
  "Rasm aniq emas — yorug' joyda qayta suratga oling",
  "Hujjat muddati o'tgan — yangisini yuklang",
  "Ma'lumotlar rasmdagi hujjatga mos emas",
  "Hujjatning bir tomoni yo'q — ikkala tomonini yuklang",
  'Avtomobil profildagi ma\'lumotlarga mos emas',
];
