// Tariflar talablari (Yandex Pro kabi): har bir tarif o'z shartlari bajarilgandagina yoqiladi.
// Shartlar: hujjatlar tasdiqlangan, avtomobil sinfi va yili, reyting, safarlar soni, faollik.

export type CarClass = 'economy' | 'comfort' | 'business' | 'minivan' | 'cargo';
export type CarModel = { brand: string; model: string; cls: CarClass; seats: number };

/** O'zbekistonda keng tarqalgan avtomobillar va ularning sinfi */
export const CAR_MODELS: CarModel[] = [
  // Ekonom
  { brand: 'Chevrolet', model: 'Cobalt', cls: 'economy', seats: 4 },
  { brand: 'Chevrolet', model: 'Nexia 3', cls: 'economy', seats: 4 },
  { brand: 'Chevrolet', model: 'Lacetti (Gentra)', cls: 'economy', seats: 4 },
  { brand: 'Chevrolet', model: 'Spark', cls: 'economy', seats: 4 },
  { brand: 'Ravon', model: 'R4', cls: 'economy', seats: 4 },
  { brand: 'Kia', model: 'Rio', cls: 'economy', seats: 4 },
  { brand: 'Hyundai', model: 'Accent', cls: 'economy', seats: 4 },
  // Komfort
  { brand: 'Chevrolet', model: 'Onix', cls: 'comfort', seats: 4 },
  { brand: 'Chevrolet', model: 'Tracker', cls: 'comfort', seats: 4 },
  { brand: 'Chevrolet', model: 'Equinox', cls: 'comfort', seats: 4 },
  { brand: 'Kia', model: 'Cerato', cls: 'comfort', seats: 4 },
  { brand: 'Kia', model: 'Sportage', cls: 'comfort', seats: 4 },
  { brand: 'Hyundai', model: 'Elantra', cls: 'comfort', seats: 4 },
  { brand: 'Hyundai', model: 'Tucson', cls: 'comfort', seats: 4 },
  { brand: 'Toyota', model: 'Corolla', cls: 'comfort', seats: 4 },
  { brand: 'BYD', model: 'Song Plus', cls: 'comfort', seats: 4 },
  // Biznes
  { brand: 'Chevrolet', model: 'Malibu', cls: 'business', seats: 4 },
  { brand: 'Kia', model: 'K5', cls: 'business', seats: 4 },
  { brand: 'Kia', model: 'K8', cls: 'business', seats: 4 },
  { brand: 'Hyundai', model: 'Sonata', cls: 'business', seats: 4 },
  { brand: 'Hyundai', model: 'Grandeur', cls: 'business', seats: 4 },
  { brand: 'Toyota', model: 'Camry', cls: 'business', seats: 4 },
  { brand: 'BYD', model: 'Han', cls: 'business', seats: 4 },
  { brand: 'Mercedes-Benz', model: 'E-Class', cls: 'business', seats: 4 },
  // Miniven
  { brand: 'Chevrolet', model: 'Orlando', cls: 'minivan', seats: 7 },
  { brand: 'Chevrolet', model: 'Captiva', cls: 'minivan', seats: 7 },
  { brand: 'Kia', model: 'Carnival', cls: 'minivan', seats: 8 },
  { brand: 'Hyundai', model: 'Staria', cls: 'minivan', seats: 9 },
  { brand: 'Toyota', model: 'Alphard', cls: 'minivan', seats: 7 },
  // Yuk / yetkazish
  { brand: 'Chevrolet', model: 'Damas', cls: 'cargo', seats: 2 },
  { brand: 'Chevrolet', model: 'Labo', cls: 'cargo', seats: 2 },
];

export const CLASS_NAME: Record<CarClass, string> = { economy: 'Ekonom', comfort: 'Komfort', business: 'Biznes', minivan: 'Miniven', cargo: 'Yuk' };
export const carTitle = (m: CarModel) => `${m.brand} ${m.model}`;

/** Profildagi avtomobil nomidan katalog yozuvini topish (eski profillar uchun ham) */
export function findCar(name: string | undefined): CarModel | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  return CAR_MODELS.find(m => n === carTitle(m).toLowerCase())
    ?? CAR_MODELS.find(m => n.includes(m.model.toLowerCase().split(' ')[0]) && n.includes(m.brand.toLowerCase().split('-')[0]))
    ?? CAR_MODELS.find(m => n.includes(m.model.toLowerCase().split(' ')[0]));
}

export type Stats = { docsApproved: boolean; rating: number; trips: number; activity: number; deliveryTerms: boolean };
/** fix — shartni bajarish uchun qayerga borish kerak */
export type Check = { label: string; ok: boolean; now?: string; fix?: 'documents' | 'car' | 'terms' };

const CLASS_OK: Record<string, CarClass[]> = {
  start: ['economy', 'comfort', 'business', 'minivan'],
  comfort: ['comfort', 'business'],
  business: ['business'],
  minivan: ['minivan'],
  delivery: ['economy', 'comfort', 'business', 'minivan', 'cargo'],
};
const MIN_YEAR: Record<string, number> = { start: 2008, comfort: 2016, business: 2019, minivan: 2012, delivery: 2005 };

/** Tarif uchun shartlar ro'yxati va har birining holati */
export function tariffChecks(tariffId: string, carName: string | undefined, year: number | undefined, s: Stats): Check[] {
  const car = findCar(carName);
  const classes = CLASS_OK[tariffId] ?? [];
  const checks: Check[] = [
    { label: "Hujjatlar tasdiqlangan", ok: s.docsApproved, fix: 'documents' },
    {
      label: `Avtomobil sinfi: ${[...new Set(classes.map(c => CLASS_NAME[c]))].join(' / ')}`,
      ok: !!car && classes.includes(car.cls),
      now: car ? `${carTitle(car)} — ${CLASS_NAME[car.cls]}` : (carName ? `${carName} — katalogda yo'q` : 'tanlanmagan'),
      fix: 'car',
    },
    { label: `Ishlab chiqarilgan yili: ${MIN_YEAR[tariffId]} va yangiroq`, ok: !!year && year >= MIN_YEAR[tariffId], now: year ? String(year) : "ko'rsatilmagan", fix: 'car' },
  ];
  if (tariffId === 'comfort') {
    checks.push({ label: 'Reyting 4.70 dan yuqori', ok: s.rating >= 4.7, now: s.rating.toFixed(2) });
    checks.push({ label: 'Faollik 50 dan yuqori', ok: s.activity >= 50, now: String(s.activity) });
  }
  if (tariffId === 'business') {
    checks.push({ label: 'Reyting 4.85 dan yuqori', ok: s.rating >= 4.85, now: s.rating.toFixed(2) });
    checks.push({ label: 'Kamida 200 ta safar', ok: s.trips >= 200, now: `${s.trips} ta` });
    checks.push({ label: 'Faollik 70 dan yuqori', ok: s.activity >= 70, now: String(s.activity) });
  }
  if (tariffId === 'minivan') {
    checks.push({ label: "Kamida 6 o'rindiq", ok: !!car && car.seats >= 6, now: car ? `${car.seats} ta` : '—', fix: 'car' });
    checks.push({ label: 'Reyting 4.70 dan yuqori', ok: s.rating >= 4.7, now: s.rating.toFixed(2) });
  }
  if (tariffId === 'delivery') {
    checks.push({ label: 'Yetkazish qoidalari qabul qilingan', ok: s.deliveryTerms, fix: 'terms' });
  }
  return checks;
}

export const eligible = (tariffId: string, carName: string | undefined, year: number | undefined, s: Stats) =>
  tariffChecks(tariffId, carName, year, s).every(c => c.ok);
