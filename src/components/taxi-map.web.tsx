// Veb-ko'rinish uchun soddalashtirilgan xarita (react-native-maps faqat iOS/Android'da ishlaydi)
import Ionicons from '@expo/vector-icons/Ionicons';
import { useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LatLng } from '@/lib/data';
import { useStore } from '@/lib/store';

import type { TaxiMapProps } from './taxi-map';

export type { MapHandle } from './taxi-map';

export default function TaxiMap({ ref, initial, pickup, destination, route, driverPos, showPickup, bottomPad, topPad }: TaxiMapProps) {
  const { colors: c, dark } = useStore();
  const [size, setSize] = useState({ w: 400, h: 800 });
  useImperativeHandle(ref, () => ({ center: () => {}, fit: () => {} }), []);

  const pts = [pickup, destination, ...(route ?? [])].filter(Boolean) as LatLng[];
  const all = pts.length > 1 ? pts : [initial];
  const lat = all.map(p => p.latitude), lng = all.map(p => p.longitude);
  const span = Math.max(Math.max(...lat) - Math.min(...lat), Math.max(...lng) - Math.min(...lng), 0.01);
  const cy = (Math.max(...lat) + Math.min(...lat)) / 2, cx = (Math.max(...lng) + Math.min(...lng)) / 2;
  const usableH = size.h - bottomPad - topPad;
  const scale = (Math.min(size.w, usableH) * 0.7) / span;
  const proj = (p: LatLng) => ({ left: size.w / 2 + (p.longitude - cx) * scale, top: topPad + usableH / 2 - (p.latitude - cy) * scale });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? '#1a1f2b' : '#EAE7E1', overflow: 'hidden' }]} onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {Array.from({ length: 14 }, (_, i) => (
        <View key={'h' + i} style={{ position: 'absolute', left: 0, right: 0, top: i * 64 + 20, height: i % 3 ? 3 : 8, backgroundColor: dark ? '#2a3140' : '#FFFFFF' }} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <View key={'v' + i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * 70 + 10, width: i % 3 ? 3 : 8, backgroundColor: dark ? '#2a3140' : '#FFFFFF' }} />
      ))}
      {route?.filter((_, i) => i % 2 === 0).map((p, i) => (
        <View key={'r' + i} style={[styles.rdot, proj(p), { backgroundColor: dark ? '#FFC800' : '#0F1E3D' }]} />
      ))}
      {showPickup && pickup && <View style={[styles.pin, proj(pickup), { backgroundColor: '#0F1E3D', borderColor: c.surface }]} />}
      {destination && <View style={[styles.flag, proj(destination)]}><Ionicons name="flag" size={14} color="#0E1525" /></View>}
      {driverPos && <View style={[styles.driver, proj(driverPos)]}><Ionicons name="car-sport" size={18} color="#0E1525" /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  rdot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, marginLeft: -3, marginTop: -3 },
  pin: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 3, marginLeft: -11, marginTop: -11 },
  flag: { position: 'absolute', width: 30, height: 30, borderRadius: 10, backgroundColor: '#FFC800', alignItems: 'center', justifyContent: 'center', marginLeft: -15, marginTop: -15 },
  driver: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFC800', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', marginLeft: -18, marginTop: -18 },
});
