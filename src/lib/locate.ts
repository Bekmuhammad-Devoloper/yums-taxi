import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { LatLng } from './data';

export type Fix = LatLng & { accuracy: number };

/**
 * Aniq joylashuv: GPS bir necha soniya kuzatiladi, har safar aniqroq nuqta kelganda `onFix` chaqiriladi.
 * Aniqlik `goodEnough` metrdan yaxshi bo'lsa yoki `maxMs` o'tsa to'xtaydi. Qaytgan funksiya — qo'lda to'xtatish.
 * Veb: keshlangan (eski, IP bo'yicha) nuqta olinmaydi — maximumAge 0, enableHighAccuracy.
 */
export function trackPrecise(onFix: (f: Fix) => void, onDone: (ok: boolean) => void, { goodEnough = 25, maxMs = 20000 } = {}) {
  let best = Infinity;
  let stopped = false;
  let stopWatch: (() => void) | undefined;

  const handle = (lat: number, lng: number, acc: number | null | undefined) => {
    const accuracy = acc ?? 9999;
    if (stopped || accuracy >= best) return;
    best = accuracy;
    onFix({ latitude: lat, longitude: lng, accuracy });
    if (accuracy <= goodEnough) stop(true);
  };

  const stop = (ok = best < Infinity) => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    stopWatch?.();
    onDone(ok);
  };
  const timer = setTimeout(() => stop(), maxMs);

  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { stop(false); return () => stop(); }
    const id = navigator.geolocation.watchPosition(
      pos => handle(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      err => { if (err.code === err.PERMISSION_DENIED) stop(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxMs },
    );
    stopWatch = () => navigator.geolocation.clearWatch(id);
  } else {
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      loc => handle(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy),
    ).then(sub => {
      if (stopped) sub.remove();
      else stopWatch = () => sub.remove();
    }).catch(() => stop(false));
  }
  return () => stop();
}
