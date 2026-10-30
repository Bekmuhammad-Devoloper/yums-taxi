// Hujjatni avtomatik tekshirish: raqam formati, sanalar, muddat, toifa, rasmlar, boshqa haydovchida takrorlanishi.
// Natija: ball (0–100), belgilar va qaror — approve (hammasi joyida), manual (moderator ko'rsin), reject (aniq xato).
// Admin panel ham xuddi shu qoidalarni ko'rsatadi: src/site/lib/precheck.ts — ikkalasini birga o'zgartiring.

const PATTERN = {
  license: /^[A-Z]{2} \d{7}$/,
  techPassport: /^[A-Z]{3} \d{7}$/,
  taxiLicense: /^[A-Z]{2,3} \d{6,7}$/,
  osago: /^[A-Z]{2,4} \d{6,8}$/,
};
const EXPIRES = { license: true, techPassport: false, taxiLicense: true, osago: true };
const BACK = { license: true, techPassport: true, taxiLicense: false, osago: false };
export const SAMPLE = 'sample';
const DAY = 86400000;
const EXPIRED = "Hujjat muddati o'tgan";

/** «DD.MM.YYYY» → Date (noto'g'ri bo'lsa null) */
export function parseDate(s) {
  const m = typeof s === 'string' && s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null;
}

/**
 * @param doc hujjat (raqam, sanalar, rasmlar)
 * @param rec shu haydovchi yozuvi
 * @param all barcha haydovchilar (takrorlanishni tekshirish uchun)
 */
export function precheck(doc, rec, all, now = new Date()) {
  const flags = [];
  const sample = doc.front === SAMPLE;
  if (!PATTERN[doc.kind]?.test(doc.number ?? '')) flags.push({ level: 'error', text: "Raqam formati noto'g'ri" });
  const issued = parseDate(doc.issued);
  if (!issued || issued > now) flags.push({ level: 'error', text: "Berilgan sana noto'g'ri" });
  if (EXPIRES[doc.kind]) {
    const exp = parseDate(doc.expires);
    if (!exp) flags.push({ level: 'error', text: "Amal qilish muddati ko'rsatilmagan" });
    else {
      const days = Math.floor((exp - now) / DAY);
      if (days < 0) flags.push({ level: 'error', text: EXPIRED });
      else if (days <= 30) flags.push({ level: 'warn', text: `Muddati ${days} kunda tugaydi` });
    }
  }
  if (doc.kind === 'license' && !/\bB\b/.test(doc.categories ?? '')) flags.push({ level: 'error', text: '«B» toifasi yo\'q' });
  if (sample) {
    flags.push({ level: 'info', text: 'Namuna (demo) hujjat' });
  } else {
    if (!doc.front) flags.push({ level: 'error', text: "Old tomoni rasmi yo'q" });
    if (BACK[doc.kind] && !doc.back) flags.push({ level: 'error', text: "Orqa tomoni rasmi yo'q" });
    if (doc.kind === 'license' && issued && (now - issued) / (365.25 * DAY) < 3) flags.push({ level: 'warn', text: 'Haydovchilik staji 3 yildan kam' });
    const twin = all.find(o => o.id !== rec.id && o.docs?.[doc.kind]?.number === doc.number && o.docs[doc.kind].front !== SAMPLE);
    if (twin) flags.push({ level: 'warn', text: `Bu raqam ${twin.profile?.name ?? 'boshqa haydovchi'} (${twin.profile?.plate ?? '—'}) hujjatida ham bor` });
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
