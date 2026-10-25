import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TaxiMap, { type MapHandle } from '@/components/taxi-map';
import { toast } from '@/components/toast';
import { ActionSheet, Avatar, Button, IOSSwitch, Row, Txt, alpha } from '@/components/ui';
import { useDriver, type Offer, type Trip } from '@/driver/lib/driver-store';
import { TARIFF_ART } from '@/lib/cars';
import { TARIFFS } from '@/lib/data';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const PAY: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  cash: { label: 'Naqd', icon: 'cash-outline' },
  card: { label: 'Karta', icon: 'card-outline' },
  balance: { label: 'Balans', icon: 'wallet-outline' },
};

const go = (path: string) => router.push(path as never);

export default function DriverHome() {
  const { colors: c } = useStore();
  const d = useDriver();
  const insets = useSafeAreaInsets();
  const map = useRef<MapHandle>(null);
  const [sheetH, setSheetH] = useState(260);
  const [menu, setMenu] = useState(false);
  const { trip, offer, pos } = d;

  // Xaritani mashinaga ergashtirish
  const follow = useRef(true);
  useEffect(() => {
    if (follow.current && !offer) map.current?.center(pos, true);
  }, [pos, offer]);
  // Taklif kelganda butun yo'lni ko'rsatish
  useEffect(() => {
    if (offer) map.current?.fit([pos, offer.order.pickup, offer.order.destination]);
    // faqat yangi taklifda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer?.order.id]);

  // Yo'lovchi bahosi
  const { lastRating, clearRating } = d;
  useEffect(() => {
    if (!lastRating) return;
    toast(`Yo'lovchi ${'★'.repeat(lastRating.stars)} baho berdi${lastRating.tip ? ` · +${som(lastRating.tip)} choy puli` : ''}`, 'star');
    clearRating();
  }, [lastRating, clearRating]);

  const shown = offer?.order ?? trip?.order;
  const stage = trip?.stage;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TaxiMap
        ref={map}
        initial={pos}
        pickup={shown?.pickup}
        destination={shown?.destination}
        route={offer ? offer.order.route.coords : stage === 'inride' ? trip?.order.route.coords : undefined}
        driverPath={stage === 'toPickup' ? trip?.approach : stage === 'inride' ? trip?.order.route.coords : undefined}
        driverPos={pos}
        showPickup={!!shown && stage !== 'inride'}
        showNearby={false}
        bottomPad={sheetH}
        overlayBottom={sheetH}
        topPad={insets.top + 70}
        onDragStart={() => { follow.current = false; }}
        locationGranted={!d.autopilot}
      />

      {/* Yuqori panel */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => setMenu(true)} style={[styles.round, { backgroundColor: c.surface }]} accessibilityLabel="Menyu">
          <Avatar name={d.profile?.name ?? 'H'} size={40} />
        </Pressable>
        <View style={[styles.status, { backgroundColor: d.online ? '#12A66A' : c.surface }]}>
          <View style={[styles.statusDot, { backgroundColor: d.online ? '#fff' : c.faint }]} />
          <Text style={[styles.statusText, { color: d.online ? '#fff' : c.text }]}>{trip ? 'Buyurtmada' : d.online ? 'Liniyada' : 'Liniyada emas'}</Text>
          <View style={[styles.mode, { backgroundColor: d.online ? 'rgba(255,255,255,0.22)' : c.surface2 }]}>
            <Text style={[styles.modeText, { color: d.online ? '#fff' : c.muted }]}>{d.live ? 'LIVE' : d.conn === 'connecting' ? '…' : 'DEMO'}</Text>
          </View>
        </View>
        <Pressable onPress={() => go('/earnings')} style={[styles.earn, { backgroundColor: c.surface }]} accessibilityLabel="Daromad">
          <Text style={[styles.earnText, { color: c.text }]}>{som(d.today.sum)}</Text>
        </Pressable>
      </View>

      {/* Joylashuvga qaytish */}
      <Pressable onPress={() => { follow.current = true; map.current?.center(pos, true); }} style={[styles.locate, { bottom: sheetH + 14, backgroundColor: c.surface }]} accessibilityLabel="Mashinamga qaytish">
        <Ionicons name="navigate" size={20} color={c.text} />
      </Pressable>

      {/* Pastki panel */}
      <View onLayout={e => setSheetH(e.nativeEvent.layout.height)} style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 14, shadowColor: c.shadow }]}>
        <View style={[styles.grab, { backgroundColor: c.line }]} />
        {offer ? <OfferCard offer={offer} /> : trip ? <TripPanel trip={trip} /> : <IdlePanel />}
      </View>

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        header={
          <Row>
            <Avatar name={d.profile?.name ?? 'H'} size={44} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{d.profile?.name}</Txt>
              <Txt v="small" muted>{d.profile?.car} · {d.profile?.plate}</Txt>
            </View>
          </Row>
        }
        groups={[
          [
            { icon: 'wallet-outline', title: 'Daromad', sub: `Bugun ${som(d.today.sum)} · ${d.today.count} ta safar`, onPress: () => go('/earnings') },
            { icon: 'person-circle-outline', title: 'Profil va mashina', onPress: () => go('/profile') },
          ],
          [
            { icon: d.autopilot ? 'navigate-circle' : 'locate', title: d.autopilot ? 'Demo harakat: yoqilgan' : 'GPS: haqiqiy joylashuv', sub: 'Almashtirish', onPress: () => d.setAutopilot(!d.autopilot) },
            { icon: 'link-outline', title: 'YUMS yo\'lovchi ilovasi bilan bog\'langan', sub: d.live ? 'Dispetcher serveri: ulangan' : 'Server yo\'q — demo buyurtmalar', onPress: () => {} },
          ],
        ]}
      />
    </View>
  );
}

/* ---------- Liniyada / emas ---------- */
function IdlePanel() {
  const { colors: c } = useStore();
  const d = useDriver();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!d.online) return;
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => { loop.stop(); pulse.setValue(0); };
  }, [d.online, pulse]);

  return (
    <View style={{ gap: 14 }}>
      <Row>
        <View style={{ flex: 1 }}>
          <Txt v="h2">{d.online ? 'Buyurtma kutilmoqda' : 'Siz liniyada emassiz'}</Txt>
          <Txt v="small" muted>{d.online ? 'Yaqin atrofdagi YUMS yo\'lovchilari sizni ko\'radi' : 'Buyurtma olish uchun liniyaga chiqing'}</Txt>
        </View>
        <IOSSwitch value={d.online} onChange={d.setOnline} label="Liniyada" />
      </Row>
      {d.online && (
        <View style={[styles.radarBox, { backgroundColor: c.surface2 }]}>
          <View style={styles.radar}>
            <Animated.View style={[styles.radarRing, { borderColor: c.brand, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }) }] }]} />
            <Ionicons name="radio" size={18} color={c.brandDeep} />
          </View>
          <Txt v="small" muted style={{ flex: 1 }}>{d.live ? 'Real buyurtmalar YUMS ilovasidan keladi' : 'Demo rejim: sinov buyurtmalari bir necha soniyada keladi'}</Txt>
        </View>
      )}
      <Row gap={10}>
        <Stat label="Bugun" value={som(d.today.sum)} />
        <Stat label="Safarlar" value={String(d.today.count)} />
        <Stat label="Reyting" value={`★ ${d.profile?.rating.toFixed(2)}`} />
      </Row>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors: c } = useStore();
  return (
    <View style={[styles.stat, { backgroundColor: c.surface2 }]}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Txt v="tiny" muted>{label}</Txt>
    </View>
  );
}

/* ---------- Buyurtma taklifi ---------- */
function OfferCard({ offer }: { offer: Offer }) {
  const { colors: c } = useStore();
  const d = useDriver();
  const o = offer.order;
  const tariff = TARIFFS.find(t => t.id === o.tariffId);
  const [left] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const ms = Math.max(0, offer.expiresAt - Date.now());
    left.setValue(ms / 15000);
    const a = Animated.timing(left, { toValue: 0, duration: ms, easing: Easing.linear, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [offer, left]);

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.timer, { backgroundColor: c.surface2 }]}>
        <Animated.View style={[styles.timerFill, { backgroundColor: c.brand, width: left.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Txt v="tiny" muted style={{ fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.6 }}>Yangi buyurtma · {tariff?.name}</Txt>
          <Text style={[styles.price, { color: c.text }]}>{som(o.price)}</Text>
          <Row gap={6}>
            <Ionicons name={PAY[o.payment]?.icon ?? 'cash-outline'} size={15} color={c.muted} />
            <Txt v="small" muted>{PAY[o.payment]?.label} · {o.route.km.toFixed(1)} km · {o.route.min} daq</Txt>
          </Row>
        </View>
        <Image source={TARIFF_ART[o.tariffId] ?? TARIFF_ART.start} style={{ width: 96, height: 52 }} contentFit="contain" />
      </Row>

      <View style={{ gap: 2 }}>
        <Stop color="#0F1E3D" title={o.pickup.title} sub={`${offer.distanceKm} km · ~${Math.max(1, Math.round(offer.distanceKm * 2.2))} daq uzoqlikda`} />
        <View style={[styles.stopLine, { backgroundColor: c.line }]} />
        <Stop color={c.brand} title={o.destination.title} sub={o.destination.subtitle} />
      </View>

      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Pill icon="person" text={`${o.passenger.name} · ★ ${o.passenger.rating.toFixed(1)}`} />
        {o.options.includes('ac') && <Pill icon="snow" text="Konditsioner" />}
        {o.options.includes('child') && <Pill icon="happy" text="Bolalar o'rindig'i" />}
        {o.comment ? <Pill icon="chatbubble-ellipses" text={o.comment} /> : null}
      </Row>

      <Row gap={10}>
        <Button title="O'tkazib yuborish" kind="ghost" onPress={d.decline} style={{ flex: 1 }} />
        <Button title="Qabul qilish" icon="checkmark" onPress={d.accept} style={{ flex: 1.6 }} />
      </Row>
    </View>
  );
}

/* ---------- Faol safar ---------- */
function TripPanel({ trip }: { trip: Trip }) {
  const { colors: c } = useStore();
  const d = useDriver();
  const o = trip.order;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (trip.stage !== 'waiting' && trip.stage !== 'inride') return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [trip.stage]);
  const [sure, setSure] = useState(false);

  const target = trip.stage === 'inride' ? o.destination : o.pickup;
  const navigate = () => Linking.openURL(`https://yandex.uz/maps/?rtext=~${target.latitude},${target.longitude}&rtt=auto`).catch(() => toast('Navigator ochilmadi', 'alert-circle'));
  const call = () => Linking.openURL(`tel:${(o.passenger.phone ?? '').replace(/\s/g, '')}`).catch(() => toast(`Qo'ng'iroq: ${o.passenger.phone}`, 'call'));
  const waitSec = trip.arrivedAt ? Math.floor((now - trip.arrivedAt) / 1000) : 0;
  const rideMin = trip.startedAt ? Math.floor((now - trip.startedAt) / 60000) : 0;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const head = {
    toPickup: { title: 'Yo\'lovchiga boring', sub: o.pickup.title, icon: 'navigate' as const },
    waiting: { title: `Kutilmoqda · ${mmss(waitSec)}`, sub: waitSec < 180 ? `Bepul kutish: ${mmss(180 - waitSec)} qoldi` : 'Pullik kutish boshlandi', icon: 'time' as const },
    inride: { title: 'Yo\'ldamiz', sub: `${o.destination.title} · ${rideMin} daq`, icon: 'flag' as const },
  }[trip.stage];

  const action = {
    toPickup: { title: 'Yetib keldim', onPress: d.arrived, icon: 'location' as const },
    waiting: { title: 'Safarni boshlash', onPress: d.startRide, icon: 'play' as const },
    inride: { title: `Yakunlash · ${som(o.price)}`, onPress: d.finishRide, icon: 'checkmark-done' as const },
  }[trip.stage];

  return (
    <View style={{ gap: 14 }}>
      <Row>
        <View style={[styles.stageIcon, { backgroundColor: alpha(c.brand, 0.18) }]}>
          <Ionicons name={head.icon} size={20} color={c.brandDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="h2" numberOfLines={1}>{head.title}</Txt>
          <Txt v="small" muted numberOfLines={1}>{head.sub}</Txt>
        </View>
        <Pressable onPress={navigate} style={[styles.navBtn, { backgroundColor: c.accentSoft }]} accessibilityLabel="Navigator">
          <Ionicons name="navigate-circle" size={20} color={c.accent} />
          <Txt v="tiny" color={c.accent} style={{ fontFamily: F.bold }}>Navigator</Txt>
        </Pressable>
      </Row>

      <View style={[styles.passenger, { backgroundColor: c.surface2 }]}>
        <Avatar name={o.passenger.name} size={42} />
        <View style={{ flex: 1 }}>
          <Txt v="h3">{o.passenger.name}</Txt>
          <Txt v="small" muted>★ {o.passenger.rating.toFixed(1)} · {PAY[o.payment]?.label} · {som(o.price)}</Txt>
        </View>
        <Pressable onPress={call} style={[styles.circle, { backgroundColor: c.okSoft }]} accessibilityLabel="Qo'ng'iroq"><Ionicons name="call" size={18} color={c.ok} /></Pressable>
      </View>
      {o.comment ? <Txt v="small" muted>💬 {o.comment}</Txt> : null}

      <Button title={action.title} icon={action.icon} onPress={action.onPress} />
      {trip.stage !== 'inride' && (
        <Pressable onPress={() => setSure(true)} hitSlop={6} style={{ alignSelf: 'center' }}>
          <Txt v="small" color={c.danger} style={{ fontFamily: F.bold }}>Buyurtmani bekor qilish</Txt>
        </Pressable>
      )}
      <ActionSheet
        visible={sure}
        onClose={() => setSure(false)}
        header={<Txt v="small" muted style={{ textAlign: 'center' }}>Tez-tez bekor qilish reytingingizga ta'sir qiladi. Yo'lovchi yangi haydovchi qidiradi.</Txt>}
        groups={[[{ icon: 'close-circle', title: 'Ha, bekor qilish', danger: true, onPress: d.cancelTrip }]]}
      />
    </View>
  );
}

function Stop({ color, title, sub }: { color: string; title: string; sub?: string }) {
  return (
    <Row gap={12}>
      <View style={[styles.stopDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Txt v="h3" numberOfLines={1}>{title}</Txt>
        {sub ? <Txt v="tiny" muted numberOfLines={1}>{sub}</Txt> : null}
      </View>
    </Row>
  );
}

function Pill({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors: c } = useStore();
  return (
    <View style={[styles.pill, { backgroundColor: c.surface2 }]}>
      <Ionicons name={icon} size={13} color={c.muted} />
      <Txt v="tiny" muted numberOfLines={1} style={{ fontFamily: F.semi, flexShrink: 1 }}>{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  status: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { flex: 1, fontFamily: F.bold, fontSize: 15 },
  mode: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  modeText: { fontFamily: F.heavy, fontSize: 10, letterSpacing: 0.8 },
  earn: { height: 48, borderRadius: 24, paddingHorizontal: 14, justifyContent: 'center', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  earnText: { fontFamily: F.heavy, fontSize: 14 },
  locate: { position: 'absolute', right: 14, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: -6 }, elevation: 16 },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  radarBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  radar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  radarRing: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 2 },
  stat: { flex: 1, padding: 12, borderRadius: 16, gap: 2 },
  statValue: { fontFamily: F.heavy, fontSize: 16 },
  timer: { height: 6, borderRadius: 3, overflow: 'hidden' },
  timerFill: { height: 6, borderRadius: 3 },
  price: { fontFamily: F.heavy, fontSize: 30, letterSpacing: -0.8, marginVertical: 2 },
  stopDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 4 },
  stopLine: { width: 2, height: 14, marginLeft: 9 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, maxWidth: '100%' },
  stageIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navBtn: { alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 },
  passenger: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18 },
  circle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
