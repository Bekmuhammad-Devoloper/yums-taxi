import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polygon, Polyline, type Region } from 'react-native-maps';

import { CAR_TOP } from '@/lib/cars';
import type { LatLng } from '@/lib/data';
import { bearing } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { darkMapStyle, lightMapStyle } from '@/lib/theme';

export type MapHandle = {
  center: (p: LatLng, zoomed?: boolean) => void;
  fit: (pts: LatLng[]) => void;
  /** Navigator rejimi: kamera mashina ortidan, harakat yo'nalishiga burilib (vebda — oddiy markazlash) */
  follow: (p: LatLng, heading: number) => void;
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
  /** Haydovchi qidirilmoqda — olish nuqtasi atrofida radar to'lqini */
  searching?: boolean;
  bottomPad: number;
  topPad: number;
  /** Xarita ustidagi pastki panel balandligi (mualliflik yozuvi uchun, faqat veb) */
  overlayBottom?: number;
  onCenterChange?: (p: LatLng) => void;
  onDragStart?: () => void;
  locationGranted: boolean;
  /** Foydalanuvchining aniq joylashuvi (veb xaritada ko'k nuqta va aniqlik doirasi) */
  userPos?: (LatLng & { accuracy?: number }) | null;
  /** Dispetcher serveridan kelgan haqiqiy bo'sh haydovchilar — berilsa namunaviy mashinalar o'rniga ko'rsatiladi */
  fleet?: { id: string; pos: LatLng; heading: number }[];
  /** Haydovchi mashinasining yo'nalishi (berilmasa marshrutdan hisoblanadi) */
  driverHeading?: number;
  /** Haydovchi atrofida qidiruv to'lqini (liniyada buyurtma kutilmoqda) */
  radar?: boolean;
  /** Talab xaritasi kataklari (haydovchi ilovasi): live — hozirgi talab, usual — odatda gavjum joylar */
  zones?: { id: string; kind?: 'live' | 'usual'; title?: string; center: LatLng; ring: LatLng[]; level: 1 | 2 | 3; surge: number }[];
  /** Jonli tirbandlik qatlami */
  traffic?: boolean;
};

/** Telefonda tirbandlikni xaritaning o'zi beradi (Android — Google, iOS — Apple) */
export const TRAFFIC_AVAILABLE = true;

const ZONE_FILL: Record<1 | 2 | 3, string> = { 1: '#FFD23F', 2: '#FF9A1F', 3: '#FF4D2E' };
const USUAL_COLOR = '#8B7CF6';

const DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };

export default function TaxiMap(props: TaxiMapProps) {
  const { ref, initial, pickup, destination, route, driverPath, driverPos, showPickup, showNearby, searching, bottomPad, topPad, onCenterChange, onDragStart, locationGranted, fleet, driverHeading, zones, radar, traffic } = props;
  const { colors: c, dark } = useStore();
  const map = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    // navigator rejimidan keyin xarita shimolga qaytadi va qiyalik olinadi
    center: (p, zoomed = true) => map.current?.animateCamera({ center: p, heading: 0, pitch: 0, zoom: zoomed ? 16 : 15 }, { duration: 450 }),
    fit: pts => map.current?.fitToCoordinates(pts, { edgePadding: { top: topPad + 40, right: 50, bottom: bottomPad + 40, left: 50 }, animated: true }),
    follow: (p, heading) => map.current?.animateCamera({ center: p, heading, pitch: 45, zoom: 17 }, { duration: 600 }),
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
    if (driverHeading != null) return driverHeading;
    if (!driverPos || !driverPath || driverPath.length < 2) return 0;
    let best = 0, bestD = Infinity;
    driverPath.forEach((p, i) => {
      const d = (p.latitude - driverPos.latitude) ** 2 + (p.longitude - driverPos.longitude) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    const i = Math.min(best, driverPath.length - 2);
    return bearing(driverPath[i], driverPath[i + 1]);
  }, [driverPos, driverPath, driverHeading]);

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
      showsTraffic={!!traffic}
      toolbarEnabled={false}
      mapPadding={{ top: topPad, right: 0, bottom: bottomPad, left: 0 }}
      onPanDrag={onDragStart}
      onRegionChangeComplete={(r: Region) => onCenterChange?.({ latitude: r.latitude, longitude: r.longitude })}>
      {zones?.map(z => (z.kind === 'usual' ? (
        // odatda gavjum joy: shtrixli chegara, och to'ldirish — jonli talabdan ajralib tursin
        <Polygon key={z.id} coordinates={z.ring} fillColor={USUAL_COLOR + '22'} strokeColor={USUAL_COLOR + 'CC'} strokeWidth={1.5} lineDashPattern={[6, 6]} tappable={false} />
      ) : (
        <Polygon key={z.id} coordinates={z.ring} fillColor={ZONE_FILL[z.level] + (z.level === 3 ? '55' : z.level === 2 ? '44' : '33')} strokeColor={ZONE_FILL[z.level] + '99'} strokeWidth={1} tappable={false} />
      )))}
      {zones?.filter(z => z.kind !== 'usual' && z.level >= 2).map(z => (
        <Marker key={'l' + z.id} coordinate={z.center} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={[styles.surge, { backgroundColor: ZONE_FILL[z.level] }]}><Text style={styles.surgeText}>{z.surge > 1 ? `×${z.surge.toFixed(1)}` : '🔥'}</Text></View>
        </Marker>
      ))}
      {zones?.filter(z => z.kind === 'usual' && z.title).map(z => (
        <Marker key={'u' + z.id} coordinate={z.center} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.usual}><Text style={styles.usualText} numberOfLines={1}>{z.title}</Text></View>
        </Marker>
      ))}
      {showNearby && fleet?.map(f => (
        <Marker key={f.id} coordinate={f.pos} anchor={{ x: 0.5, y: 0.5 }} flat rotation={f.heading} tracksViewChanges={false}>
          <Image source={CAR_TOP.taxi} style={styles.car} contentFit="contain" />
        </Marker>
      ))}
      {showNearby && !fleet && nearby.map(n => (
        <Marker key={n.id} coordinate={n} anchor={{ x: 0.5, y: 0.5 }} flat rotation={n.rot} tracksViewChanges={false}>
          <Image source={n.id % 3 === 2 ? CAR_TOP.car : CAR_TOP.taxi} style={styles.car} contentFit="contain" />
        </Marker>
      ))}

      {driverPath && driverPath.length > 1 && (
        <Polyline coordinates={driverPath} strokeColor={c.accent} strokeWidth={4} lineDashPattern={[8, 8]} />
      )}
      {route && route.length > 1 && <Polyline coordinates={route} strokeColor={dark ? '#0B0E13' : '#FFFFFF'} strokeWidth={10} />}
      {route && route.length > 1 && <Polyline coordinates={route} strokeColor={dark ? '#FFC800' : '#0F1E3D'} strokeWidth={6} />}

      {searching && pickup && <Circle center={pickup} radius={350} strokeColor="rgba(255,200,0,0.6)" strokeWidth={2} fillColor="rgba(255,200,0,0.15)" />}
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
      {radar && driverPos && <Circle center={driverPos} radius={420} strokeColor="rgba(18,166,106,0.55)" strokeWidth={2} fillColor="rgba(18,166,106,0.10)" />}
      {driverPos && (
        <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }} flat rotation={heading} zIndex={1000}>
          {/* o'z mashinasi: sariq nur ustida, soya bilan — kichik masshtabda ham darhol topiladi */}
          <View style={styles.meWrap}>
            <View style={styles.meGlow} />
            <View style={styles.meGlowCore} />
            <Image source={CAR_TOP.taxi} style={styles.driver} contentFit="contain" />
          </View>
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  car: { width: 21, height: 38 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  flag: { width: 30, height: 30, borderRadius: 10, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  stick: { width: 3, height: 10, borderRadius: 2 },
  driver: { width: 32, height: 57 },
  meWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  meGlow: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,200,0,0.16)' },
  meGlowCore: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,200,0,0.28)' },
  surge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  surgeText: { color: '#1A1205', fontSize: 11, fontWeight: '800' },
  usual: { maxWidth: 140, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(139,124,246,0.92)' },
  usualText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },
});
