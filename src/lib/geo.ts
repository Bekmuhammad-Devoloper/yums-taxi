import type { LatLng } from './data';
import { tr } from './i18n';

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bearing(a: LatLng, b: LatLng) {
  const y = Math.sin(rad(b.longitude - a.longitude)) * Math.cos(rad(b.latitude));
  const x = Math.cos(rad(a.latitude)) * Math.sin(rad(b.latitude)) - Math.sin(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.cos(rad(b.longitude - a.longitude));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Ikki nuqta orasida yumshoq egri chiziq — marshrut chizig'i hali kelmaganda ko'rsatiladi */
export function curve(a: LatLng, b: LatLng, n = 40): LatLng[] {
  const mid = { latitude: (a.latitude + b.latitude) / 2, longitude: (a.longitude + b.longitude) / 2 };
  const ctrl = { latitude: mid.latitude + (b.longitude - a.longitude) * 0.18, longitude: mid.longitude - (b.latitude - a.latitude) * 0.18 };
  const pts: LatLng[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({
      latitude: (1 - t) ** 2 * a.latitude + 2 * (1 - t) * t * ctrl.latitude + t ** 2 * b.latitude,
      longitude: (1 - t) ** 2 * a.longitude + 2 * (1 - t) * t * ctrl.longitude + t ** 2 * b.longitude,
    });
  }
  return pts;
}

export function pathLength(pts: LatLng[]) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += distanceKm(pts[i - 1], pts[i]);
  return s;
}

/** Yo'l bo'ylab t (0..1) ulushdagi nuqta */
export function pointAt(pts: LatLng[], t: number): LatLng {
  if (pts.length < 2) return pts[0];
  const total = pathLength(pts);
  let target = total * Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < pts.length; i++) {
    const seg = distanceKm(pts[i - 1], pts[i]);
    if (target <= seg) {
      const k = seg ? target / seg : 0;
      return {
        latitude: pts[i - 1].latitude + (pts[i].latitude - pts[i - 1].latitude) * k,
        longitude: pts[i - 1].longitude + (pts[i].longitude - pts[i - 1].longitude) * k,
      };
    }
    target -= seg;
  }
  return pts[pts.length - 1];
}

export type RouteInfo = { coords: LatLng[]; km: number; min: number };

/** Server marshrutlari Google Encoded Polyline (aniqlik 5) ko'rinishida keladi */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length + 1);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/** Pul: «12 500 so'm» (valyuta nomi joriy tilda) */
/** Minglar bo'linmaydigan bo'shliq bilan: qator uzilmaydi, arab tilida esa raqam bir butun (chapdan o'ngga) qoladi */
export const groupDigits = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const som = (n: number) => tr("{n} so'm", { n: groupDigits(n) });
