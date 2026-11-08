// Talab xaritasi: server so'nggi buyurtmalar bo'yicha ~1 km kataklarni beradi (GET /driver/demand).
import type { LatLng } from '@/lib/data';
import type { DemandCell } from '@/lib/driver-api';
import { distanceKm } from '@/lib/geo';

export type DemandZone = { id: string; center: LatLng; ring: LatLng[]; level: 1 | 2 | 3; surge: number; radiusKm: number; orders: number };

/** Doira chegarasi (xaritada ko'pburchak sifatida chiziladi) */
export function zoneRing(center: LatLng, radiusKm: number, n = 28): LatLng[] {
  const kLat = radiusKm / 111.32;
  const kLng = radiusKm / (111.32 * Math.cos((center.latitude * Math.PI) / 180));
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { latitude: center.latitude + Math.sin(a) * kLat, longitude: center.longitude + Math.cos(a) * kLng };
  });
}

export const toZones = (cells: DemandCell[]): DemandZone[] =>
  cells.map(c => {
    const center = { latitude: c.latitude, longitude: c.longitude };
    const level = (Math.min(3, Math.max(1, c.level)) as 1 | 2 | 3);
    return { id: c.id, center, ring: zoneRing(center, c.radiusKm), level, surge: c.surge, radiusKm: c.radiusKm, orders: c.orders };
  });

/** Nuqta tushgan talab hududi koeffitsienti (hududdan tashqarida — 1) */
export function surgeAt(zones: DemandZone[], p: LatLng | null | undefined) {
  if (!p) return 1;
  return zones.reduce((m, z) => (distanceKm(z.center, p) <= z.radiusKm ? Math.max(m, z.surge) : m), 1);
}

/** Eng yaqin gavjum hudud (2-daraja va undan yuqori) */
export function nearestHot(zones: DemandZone[], p: LatLng) {
  let best: { zone: DemandZone; km: number } | null = null;
  for (const z of zones) {
    if (z.level < 2) continue;
    const km = distanceKm(z.center, p);
    if (!best || km < best.km) best = { zone: z, km };
  }
  return best;
}

export const ZONE_COLOR: Record<1 | 2 | 3, string> = { 1: '#FFD23F', 2: '#FF9A1F', 3: '#FF4D2E' };
