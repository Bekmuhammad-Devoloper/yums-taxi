import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoosingSheet, DriverSheet, IdleSheet, OptionsModal, RatingModal, RideSheet, SearchingSheet } from '@/components/order-sheets';
import TaxiMap, { type MapHandle } from '@/components/taxi-map';
import { BrandMark, IconButton } from '@/components/ui';
import { DEFAULT_CENTER, type LatLng, type Place } from '@/lib/data';
import { addressOf } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F, shadow } from '@/lib/theme';

export default function Taxi() {
  const s = useStore();
  const { colors: c, order, user } = s;
  const insets = useSafeAreaInsets();
  const map = useRef<MapHandle>(null);
  const [sheetH, setSheetH] = useState(320);
  const [granted, setGranted] = useState(false);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [lift] = useState(() => new Animated.Value(0));
  const fromDrag = useRef<Place | null>(null);
  const skipRegion = useRef(false);
  const geoReq = useRef(0);

  const idle = order.phase === 'idle';
  const topPad = insets.top + 70;

  // Joylashuvni aniqlash
  const locate = async (recenter = true) => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error('denied');
      setLocating(true);
      setGranted(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserPos(p);
      if (recenter) map.current?.center(p);
      if (!order.pickup || recenter) s.setPickup(await addressOf(p));
    } catch {
      if (!order.pickup) s.setPickup(await addressOf(DEFAULT_CENTER));
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    // xarita chizilib bo'lgach joylashuvni so'raymiz (faqat birinchi ochilishda)
    const t = setTimeout(() => locate(true), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Olish manzili qidiruvdan tanlansa — xaritani o'sha yerga suramiz
  useEffect(() => {
    if (order.pickup && order.pickup !== fromDrag.current && idle) {
      skipRegion.current = true;
      map.current?.center(order.pickup);
    }
  }, [order.pickup, idle]);

  // Holatga qarab kamerani moslash
  useEffect(() => {
    const t = setTimeout(() => {
      if (order.phase === 'choosing' && order.route) map.current?.fit(order.route.coords);
      else if (order.phase === 'accepted' && order.pickup && order.driverPos) map.current?.fit([order.pickup, order.driverPos]);
      else if (order.phase === 'inride' && order.route) map.current?.fit(order.route.coords);
      else if ((order.phase === 'searching' || order.phase === 'arrived') && order.pickup) map.current?.center(order.pickup);
      else if (order.phase === 'idle' && order.pickup) { skipRegion.current = true; map.current?.center(order.pickup); }
    }, 250);
    return () => clearTimeout(t);
    // driverPos har soniyada o'zgaradi — kamerani faqat holat o'zgarganda suramiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.phase, order.route]);

  if (!user) return <Redirect href="/login" />;

  const onCenterChange = (p: LatLng) => {
    Animated.spring(lift, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
    if (!idle) return;
    if (skipRegion.current) { skipRegion.current = false; return; }
    const req = ++geoReq.current;
    addressOf(p).then(place => {
      if (req !== geoReq.current) return;
      fromDrag.current = place;
      s.setPickup(place);
    });
  };

  const onDragStart = () => {
    if (idle) Animated.spring(lift, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  };

  const sheet = {
    idle: <IdleSheet />,
    choosing: <ChoosingSheet onOptions={() => setOptionsOpen(true)} />,
    searching: <SearchingSheet />,
    accepted: <DriverSheet />,
    arrived: <DriverSheet />,
    inride: <RideSheet />,
    done: <RideSheet />,
  }[order.phase];

  const inTrip = ['accepted', 'arrived', 'inride', 'done'].includes(order.phase);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TaxiMap
        ref={map}
        initial={DEFAULT_CENTER}
        pickup={order.pickup}
        destination={order.destination}
        route={order.phase === 'choosing' || order.phase === 'searching' || order.phase === 'inride' ? order.route?.coords : undefined}
        driverPath={order.phase === 'accepted' ? order.driverPath : undefined}
        driverPos={inTrip ? order.driverPos : undefined}
        showPickup={!idle && order.phase !== 'inride'}
        showNearby={idle || order.phase === 'choosing' || order.phase === 'searching'}
        bottomPad={idle ? 0 : sheetH}
        topPad={idle ? 0 : topPad}
        onCenterChange={onCenterChange}
        onDragStart={onDragStart}
        locationGranted={granted}
      />

      {/* Markaziy pin — xaritani surib olish nuqtasini tanlash */}
      {idle && (
        <View pointerEvents="none" style={styles.pinWrap}>
          <Animated.View style={{ alignItems: 'center', transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }}>
            <View style={[styles.pinLabel, { backgroundColor: '#0F1E3D' }]}>
              <Text style={styles.pinLabelText}>{order.pickup ? '3 daq' : '…'}</Text>
            </View>
            <View style={[styles.pinHead, { borderColor: '#0F1E3D' }]}><View style={styles.pinDot} /></View>
            <View style={styles.pinStick} />
          </Animated.View>
          <Animated.View style={[styles.pinShadow, { transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }] }]} />
        </View>
      )}

      {/* Yuqori panel */}
      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        {order.phase === 'choosing' ? (
          <IconButton name="arrow-back" onPress={() => s.setDestination(null)} />
        ) : (
          <IconButton name="grid-outline" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        )}
        <View style={[styles.brand, { backgroundColor: c.surface }, shadow(c)]}>
          <BrandMark size={34} style={{ borderRadius: 17 }} />
          <Text style={[styles.brandText, { color: c.text }]}>YUMS <Text style={{ color: '#E0A800' }}>Taxi</Text></Text>
        </View>
        {inTrip ? (
          <IconButton name="shield-checkmark" color={c.ok} onPress={() => router.push('/safety')} />
        ) : (
          <IconButton name="menu" badge={!!s.promo} onPress={() => router.push('/menu')} />
        )}
      </View>

      {/* Joylashuv tugmasi */}
      {(idle || order.phase === 'choosing') && (
        <IconButton
          name={locating ? 'hourglass-outline' : 'locate'}
          onPress={() => (idle || !userPos ? locate(true) : map.current?.center(userPos))}
          style={{ position: 'absolute', right: 16, bottom: sheetH + 14 }}
        />
      )}

      {/* Pastki panel */}
      <View
        onLayout={e => setSheetH(e.nativeEvent.layout.height)}
        style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 14 }, shadow(c, 2)]}>
        <View style={[styles.grab, { backgroundColor: c.surface3 }]} />
        <View key={order.phase === 'arrived' ? 'accepted' : order.phase}>{sheet}</View>
      </View>

      <OptionsModal visible={optionsOpen} onClose={() => setOptionsOpen(false)} />
      <RatingModal />
      {!granted && idle && order.pickup && (
        <View pointerEvents="none" style={[styles.hint, { top: insets.top + 74, backgroundColor: c.surface }, shadow(c)]}>
          <Ionicons name="navigate-circle-outline" size={18} color={c.muted} />
          <Text style={{ color: c.muted, fontSize: 12.5, fontFamily: F.semi }}>Xaritani surib olish nuqtasini tanlang</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingLeft: 6, paddingRight: 16, borderRadius: 23 },
  brandText: { fontFamily: F.brand, fontSize: 15, letterSpacing: 0.4 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 16, paddingTop: 8 },
  grab: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  // paddingBottom pin uchini (tayoqcha oxirini) aynan xarita markaziga to'g'rilaydi
  pinWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 76 },
  pinLabel: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 4 },
  pinLabelText: { color: '#fff', fontFamily: F.heavy, fontSize: 12.5 },
  pinHead: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFC800', borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0F1E3D' },
  pinStick: { width: 4, height: 18, borderRadius: 2, backgroundColor: '#0F1E3D' },
  pinShadow: { width: 14, height: 5, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.3)', marginTop: 1 },
  hint: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
});
