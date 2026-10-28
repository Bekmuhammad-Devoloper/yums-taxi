// Ichki navigator: marshrut bo'ylab keyingi burilish, unga masofa va qolgan yo'l.
import type { LatLng } from '@/lib/data';
import { bearing, distanceKm } from '@/lib/geo';

export type ManeuverKind = 'left' | 'right' | 'sharpLeft' | 'sharpRight' | 'uturn' | 'straight' | 'arrive';
/** at — burilish nuqtasining marshrutdagi tartib raqami (ovozli xabar bir marta aytilishi uchun) */
export type Maneuver = { kind: ManeuverKind; distM: number; leftKm: number; at: number };

const turn = (a: number, b: number) => ((b - a + 540) % 360) - 180; // −180..180, musbat — o'ngga

/** Nuqtaga eng yaqin kesma raqami (path[i] → path[i + 1]); kichik masofada tekis koordinatalar yetarli */
function nearestSegment(path: LatLng[], pos: LatLng) {
  const kx = Math.cos((pos.latitude * Math.PI) / 180);
  let best = 0, bestD = Infinity;
  for (let k = 0; k < path.length - 1; k++) {
    const ax = (path[k].longitude - pos.longitude) * kx, ay = path[k].latitude - pos.latitude;
    const bx = (path[k + 1].longitude - pos.longitude) * kx, by = path[k + 1].latitude - pos.latitude;
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    const d = (ax + t * dx) ** 2 + (ay + t * dy) ** 2;
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

export function nextManeuver(path: LatLng[], pos: LatLng): Maneuver {
  if (path.length < 2) return { kind: 'arrive', distM: 0, leftKm: 0, at: -1 };
  // mashina turgan bo'lak: eng yaqin cho'qqi emas, eng yaqin kesma (aks holda burilish oldidan uni «o'tib ketgan» deb hisoblardi)
  const i = nearestSegment(path, pos);
  let left = distanceKm(pos, path[i + 1]);
  for (let k = i + 1; k < path.length - 1; k++) left += distanceKm(path[k], path[k + 1]);

  let acc = distanceKm(pos, path[i + 1]);
  for (let j = i + 1; j < path.length - 1; j++) {
    // chiquvchi yo'nalishni ~25 m oldindan olamiz — mayda egriliklar burilish hisoblanmaydi
    let k = j + 1;
    while (k < path.length - 1 && distanceKm(path[j], path[k]) < 0.025) k++;
    const t = turn(bearing(path[j - 1], path[j]), bearing(path[j], path[k]));
    const abs = Math.abs(t);
    if (abs >= 32) {
      const kind: ManeuverKind = abs >= 150 ? 'uturn' : abs >= 110 ? (t > 0 ? 'sharpRight' : 'sharpLeft') : t > 0 ? 'right' : 'left';
      return { kind, distM: Math.round(acc * 1000), leftKm: left, at: j };
    }
    acc += distanceKm(path[j], path[j + 1]);
  }
  return { kind: left < 0.05 ? 'arrive' : 'straight', distM: Math.round(left * 1000), leftKm: left, at: -1 };
}

export const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`);

export const MANEUVER_TEXT: Record<ManeuverKind, string> = {
  left: 'chapga buriling',
  right: "o'ngga buriling",
  sharpLeft: 'keskin chapga',
  sharpRight: "keskin o'ngga",
  uturn: 'orqaga qayriling',
  straight: "to'g'riga yuring",
  arrive: 'manzilga yetdingiz',
};
