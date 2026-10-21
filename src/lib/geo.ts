import * as Location from 'expo-location';

import { PLACES, type LatLng, type Place, type Tariff } from './data';

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

/** Ikki nuqta orasida yumshoq egri chiziq — marshrut serveri javob bermasa ishlatiladi */
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

/** OSRM orqali haqiqiy yo'l marshruti, xatolikda — egri chiziq */
export async function fetchRoute(a: LatLng, b: LatLng): Promise<RouteInfo> {
  const fallback = (): RouteInfo => {
    const coords = curve(a, b);
    const km = pathLength(coords) * 1.25;
    return { coords, km, min: Math.max(3, Math.round((km / 28) * 60)) };
  };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const url = `https://router.project-osrm.org/route/v1/driving/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json();
    const r = json?.routes?.[0];
    if (!r) return fallback();
    const coords: LatLng[] = r.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));
    // Toshkent tirbandligi uchun o'rtacha tezlikni hisobga olamiz
    return { coords, km: r.distance / 1000, min: Math.max(3, Math.round((r.duration / 60) * 1.35)) };
  } catch {
    return fallback();
  }
}

export function nearestPlace(p: LatLng): Place {
  return PLACES.reduce((best, x) => (distanceKm(p, x) < distanceKm(p, best) ? x : best), PLACES[0]);
}

export async function addressOf(p: LatLng): Promise<Place> {
  try {
    const [r] = await Location.reverseGeocodeAsync(p);
    if (r) {
      const street = [r.street, r.streetNumber].filter(Boolean).join(', ');
      const title = street || r.name || r.district || '';
      if (title) return { ...p, title, subtitle: [r.district, r.city].filter(Boolean).join(', ') || 'Toshkent' };
    }
  } catch {
    // geokoder mavjud emas — eng yaqin joyni ko'rsatamiz
  }
  const n = nearestPlace(p);
  const near = distanceKm(p, n) < 0.25;
  return { ...p, title: near ? n.title : `${n.title} yaqinida`, subtitle: n.subtitle };
}

export function priceFor(t: Tariff, km: number, min: number, surge = 1) {
  const raw = (t.base + km * t.perKm + min * t.perMin) * surge;
  return Math.ceil(Math.max(raw, t.minFare) / 500) * 500;
}

export const som = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

/** Haydovchining boshlang'ich joyi: yo'lovchidan ~1–2 km uzoqda */
export function nearbyPoint(p: LatLng): LatLng {
  const ang = Math.random() * Math.PI * 2;
  const d = 0.009 + Math.random() * 0.008;
  return { latitude: p.latitude + Math.sin(ang) * d, longitude: p.longitude + Math.cos(ang) * d * 1.3 };
}
