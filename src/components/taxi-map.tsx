import Ionicons from '@expo/vector-icons/Ionicons';
import { useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';

import type { LatLng } from '@/lib/data';
import { bearing } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { darkMapStyle, lightMapStyle } from '@/lib/theme';

export type MapHandle = {
  center: (p: LatLng, zoomed?: boolean) => void;
  fit: (pts: LatLng[]) => void;
};

export type TaxiMapProps = {
  ref?: Ref<MapHandle>;
  initial: LatLng;
  pickup?: LatLng | null;
  destination?: LatLng | null;
  route?: LatLng[];
  driverPath?: LatLng[];
  driverPos?: LatLng;
  showPickup: boolean;
  showNearby: boolean;
  bottomPad: number;
  topPad: number;
  onCenterChange?: (p: LatLng) => void;
  onDragStart?: () => void;
  locationGranted: boolean;
};

const DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };

export default function TaxiMap(props: TaxiMapProps) {
  const { ref, initial, pickup, destination, route, driverPath, driverPos, showPickup, showNearby, bottomPad, topPad, onCenterChange, onDragStart, locationGranted } = props;
  const { colors: c, dark } = useStore();
  const map = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    center: (p, zoomed = true) => map.current?.animateToRegion({ ...p, ...(zoomed ? DELTA : { latitudeDelta: 0.02, longitudeDelta: 0.02 }) }, 450),
    fit: pts => map.current?.fitToCoordinates(pts, { edgePadding: { top: topPad + 40, right: 50, bottom: bottomPad + 40, left: 50 }, animated: true }),
  }), [bottomPad, topPad]);

  // Atrofdagi bo'sh mashinalar (vizual)
  const nearby = useMemo(() => {
    const base = pickup ?? initial;
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      latitude: base.latitude + Math.sin(i * 1.7) * 0.006 * (1 + (i % 3) * 0.4),
      longitude: base.longitude + Math.cos(i * 1.7) * 0.008 * (1 + (i % 2) * 0.5),
      rot: (i * 63) % 360,
    }));
    // faqat bir marta, atrof manzilini o'zgartirganda emas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const heading = useMemo(() => {
    if (!driverPos || !driverPath || driverPath.length < 2) return 0;
    let best = 0, bestD = Infinity;
    driverPath.forEach((p, i) => {
      const d = (p.latitude - driverPos.latitude) ** 2 + (p.longitude - driverPos.longitude) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    const i = Math.min(best, driverPath.length - 2);
    return bearing(driverPath[i], driverPath[i + 1]);
  }, [driverPos, driverPath]);

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={{ ...initial, ...DELTA }}
      customMapStyle={dark ? darkMapStyle : lightMapStyle}
      userInterfaceStyle={dark ? 'dark' : 'light'}
      showsUserLocation={locationGranted}
      showsMyLocationButton={false}
      showsCompass={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      mapPadding={{ top: topPad, right: 0, bottom: bottomPad, left: 0 }}
      onPanDrag={onDragStart}
      onRegionChangeComplete={(r: Region) => onCenterChange?.({ latitude: r.latitude, longitude: r.longitude })}>
      {showNearby && nearby.map(n => (
        <Marker key={n.id} coordinate={n} anchor={{ x: 0.5, y: 0.5 }} flat rotation={n.rot}>
          <View style={[styles.car, { backgroundColor: c.surface }]}><Ionicons name="car-sport" size={15} color="#E0A800" /></View>
        </Marker>
      ))}

      {driverPath && driverPath.length > 1 && (
        <Polyline coordinates={driverPath} strokeColor={c.accent} strokeWidth={4} lineDashPattern={[8, 8]} />
      )}
      {route && route.length > 1 && <Polyline coordinates={route} strokeColor={dark ? '#FFC800' : '#0F1E3D'} strokeWidth={5} />}

      {showPickup && pickup && (
        <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.dot, { borderColor: c.surface, backgroundColor: '#0F1E3D' }]}><View style={styles.dotInner} /></View>
        </Marker>
      )}
      {destination && (
        <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.flag, { backgroundColor: '#FFC800', borderColor: c.surface }]}><Ionicons name="flag" size={14} color="#0E1525" /></View>
            <View style={[styles.stick, { backgroundColor: '#0E1525' }]} />
          </View>
        </Marker>
      )}
      {driverPos && (
        <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }} flat rotation={heading}>
          <View style={[styles.driver, { borderColor: c.surface }]}><Ionicons name="car-sport" size={20} color="#0E1525" /></View>
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  car: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  flag: { width: 30, height: 30, borderRadius: 10, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  stick: { width: 3, height: 10, borderRadius: 2 },
  driver: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFC800', borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 },
});
