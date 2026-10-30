// Server ma'lumotlari: haydovchilar reyestri, buyurtmalar tarixi, arizalar, sozlamalar, sayt matni, jurnal.
// Fayl: server/data/db.json (YUMS_DB bilan boshqa joy ko'rsatiladi). O'zgarishlar 0.8 s kechikish bilan,
// vaqtinchalik faylga yozilib nomi almashtiriladi — yozish paytida server to'xtasa ham fayl buzilmaydi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const DB_FILE = process.env.YUMS_DB ? path.resolve(process.env.YUMS_DB) : path.join(DIR, 'data', 'db.json');

/** Tarixda saqlanadigan yozuvlar soni (eskilari o'chadi) */
const LIMITS = { orders: 5000, log: 1000, leads: 2000 };

const empty = () => ({
  version: 1,
  /** id → { id, profile, docs, blocked?, stats, createdAt, lastSeen } */
  drivers: {},
  /** buyurtmalar tarixi, eng yangisi oxirida */
  orders: [],
  /** saytdan kelgan haydovchilik arizalari */
  leads: [],
  /** tariflar narxi (faqat o'zgartirilgan maydonlar), komissiya, yuqori talab hududlari, hujjatlarni avtomatik tekshirish */
  config: { tariffs: {}, commission: null, zones: [], autoApprove: true },
  /** sayt matni (faqat o'zgartirilgan maydonlar) */
  content: {},
  log: [],
});

function load() {
  try {
    const j = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const e = empty();
    return { ...e, ...j, config: { ...e.config, ...j.config } };
  } catch {
    return empty();
  }
}

export const db = load();

let timer = null;
export function save() {
  if (!timer) timer = setTimeout(flush, 800);
}

export function flush() {
  clearTimeout(timer);
  timer = null;
  for (const [k, n] of Object.entries(LIMITS)) if (db[k].length > n) db[k].splice(0, db[k].length - n);
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('Ma\'lumotlarni saqlab bo\'lmadi:', e.message);
  }
}

// To'xtatilganda kutilayotgan o'zgarishlar yo'qolmasin
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { if (timer) flush(); process.exit(0); });
