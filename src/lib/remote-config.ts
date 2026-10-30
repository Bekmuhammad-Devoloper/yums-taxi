// Admin paneldan keladigan narx sozlamalari: tariflar narxi, komissiya va yuqori talab hududlari.
// Server ulangan bo'lsa yo'lovchi, haydovchi ilovalari va sayt shu qiymatlar bilan hisoblaydi,
// aks holda src/lib/data.ts dagi standart tariflar ishlatiladi.
import { TARIFFS, type LatLng, type Tariff } from './data';
import { distanceKm } from './geo';

export type TariffPatch = Partial<Pick<Tariff, 'base' | 'perKm' | 'perMin' | 'minFare'>>;

/** Yuqori talab hududi: markaz atrofidagi doira, narx koeffitsienti va (ixtiyoriy) amal qilish muddati */
export type SurgeZone = { id: string; center: LatLng; radiusKm: number; surge: number; label?: string; until?: string };

export type RemoteConfig = { tariffs: Record<string, TariffPatch>; commission: number | null; zones: SurgeZone[] };

export const DEFAULT_COMMISSION = 0.1;

/** Standart tariflar ustiga admin o'zgartirgan narxlar */
export const tariffsWith = (cfg?: RemoteConfig | null): Tariff[] => TARIFFS.map(t => ({ ...t, ...cfg?.tariffs?.[t.id] }));

export const tariffOf = (id: string, cfg?: RemoteConfig | null): Tariff => {
  const t = TARIFFS.find(x => x.id === id) ?? TARIFFS[0];
  return { ...t, ...cfg?.tariffs?.[t.id] };
};

export const commissionOf = (cfg?: RemoteConfig | null) => cfg?.commission ?? DEFAULT_COMMISSION;

export const zoneActive = (z: SurgeZone, now = Date.now()) => !z.until || Date.parse(z.until) > now;

/** Nuqta tushgan hududlar ichida eng katta koeffitsient (hududdan tashqarida — 1) */
export function zoneSurgeAt(zones: SurgeZone[] | undefined, p: LatLng | null | undefined, now = Date.now()) {
  if (!p || !zones?.length) return 1;
  return zones.reduce((m, z) => (zoneActive(z, now) && distanceKm(z.center, p) <= z.radiusKm ? Math.max(m, z.surge) : m), 1);
}

/** Doira chegarasi (xaritada ko'pburchak sifatida chiziladi) */
export function zoneRing(z: Pick<SurgeZone, 'center' | 'radiusKm'>, n = 28): LatLng[] {
  const kLat = z.radiusKm / 111.32;
  const kLng = z.radiusKm / (111.32 * Math.cos((z.center.latitude * Math.PI) / 180));
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { latitude: z.center.latitude + Math.sin(a) * kLat, longitude: z.center.longitude + Math.cos(a) * kLng };
  });
}

/** Koeffitsient bo'yicha daraja (xaritadagi rang): ×1.3 gacha sariq, ×1.6 gacha to'q sariq, undan yuqori qizil */
export const surgeLevel = (surge: number): 1 | 2 | 3 => (surge >= 1.6 ? 3 : surge >= 1.3 ? 2 : 1);
