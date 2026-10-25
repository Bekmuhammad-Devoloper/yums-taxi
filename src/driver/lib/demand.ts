// Talab xaritasi: shahar olti burchakli kataklarga bo'linadi, har biriga talab darajasi va narx koeffitsienti beriladi.
// Hozircha talab mashhur joylar (vokzal, bozor, aeroport…) atrofida va kun vaqtiga qarab hisoblanadi;
// server talab ma'lumotini bera boshlasa, shu turdagi kataklar ro'yxati yuboriladi.
import { DEFAULT_CENTER, PLACES, type LatLng } from '@/lib/data';
import { distanceKm } from '@/lib/geo';

export type DemandZone = { id: string; center: LatLng; ring: LatLng[]; level: 1 | 2 | 3; surge: number };

const R_KM = 0.42; // katak radiusi (markazdan uchigacha)
const N = 6; // markazdan nechta katak uzoqlikkacha
const SURGE: Record<1 | 2 | 3, number> = { 1: 1.2, 2: 1.4, 3: 1.8 };

const kmToLat = (km: number) => km / 111.32;
const kmToLng = (km: number, lat: number) => km / (111.32 * Math.cos((lat * Math.PI) / 180));

const noise = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** 10 daqiqalik vaqt bo'lagi — talab shu oraliqda o'zgarmaydi */
export const demandSlot = (t = Date.now()) => Math.floor(t / 600000);

export function demandZones(slot: number, origin: LatLng = DEFAULT_CENTER): DemandZone[] {
  const hour = new Date(slot * 600000).getHours();
  // ertalab va kechqurun tig'iz soatlar
  const rush = hour >= 7 && hour <= 10 ? 1.25 : hour >= 17 && hour <= 20 ? 1.35 : hour >= 23 || hour <= 5 ? 0.8 : 1;
  const hot = PLACES.map((p, i) => ({ p, w: (0.55 + noise(i, slot) * 0.6) * rush }));
  const out: DemandZone[] = [];
  for (let q = -N; q <= N; q++) {
    for (let r = Math.max(-N, -q - N); r <= Math.min(N, -q + N); r++) {
      const xKm = R_KM * Math.sqrt(3) * (q + r / 2);
      const yKm = R_KM * 1.5 * r;
      const center = { latitude: origin.latitude - kmToLat(yKm), longitude: origin.longitude + kmToLng(xKm, origin.latitude) };
      let score = 0;
      for (const h of hot) {
        const d = distanceKm(center, h.p);
        score += h.w * Math.exp(-(d * d) / 0.9);
      }
      score += (noise(q * 3.1 + slot, r * 1.7) - 0.5) * 0.25;
      const level = score > 0.95 ? 3 : score > 0.68 ? 2 : score > 0.45 ? 1 : 0;
      if (!level) continue;
      const ring = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 180) * (60 * k - 30);
        return { latitude: center.latitude - kmToLat(R_KM * Math.sin(a)), longitude: center.longitude + kmToLng(R_KM * Math.cos(a), center.latitude) };
      });
      out.push({ id: `${q}:${r}`, center, ring, level, surge: SURGE[level] });
    }
  }
  return out;
}

/** Nuqta joylashgan katak koeffitsienti (katakdan tashqarida — 1) */
export function surgeAt(zones: DemandZone[], p: LatLng) {
  let best: DemandZone | null = null, bestD = Infinity;
  for (const z of zones) {
    const d = distanceKm(z.center, p);
    if (d < bestD) { bestD = d; best = z; }
  }
  return best && bestD <= R_KM * 0.95 ? best.surge : 1;
}

/** Eng yaqin yuqori talab katagi (×1.4 va undan yuqori) */
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
