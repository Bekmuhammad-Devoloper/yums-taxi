import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TaxiMap, { type MapHandle } from '@/components/taxi-map';
import { toast } from '@/components/toast';
import { ActionSheet, Avatar, Row, Sheet, Txt, alpha } from '@/components/ui';
import { SlideButton } from '@/driver/components/slide-button';
import { nearestHot, surgeAt, ZONE_COLOR } from '@/driver/lib/demand';
import { ACTIVITY, COMMISSION, FREE_WAIT_SEC, HOME_USES_PER_DAY, WAIT_PER_MIN, useDriver, type Offer, type Trip } from '@/driver/lib/driver-store';
import { fmtDist, MANEUVER_TEXT, nextManeuver, type ManeuverKind } from '@/driver/lib/nav';
import { activityColor, GREEN, ORANGE } from '@/driver/lib/theme';
import { TARIFF_ART } from '@/lib/cars';
import { PLACES, TARIFFS, type LatLng } from '@/lib/data';
import { distanceKm, som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const PAY: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  cash: { label: 'Naqd', icon: 'cash-outline' },
  card: { label: 'Karta', icon: 'card-outline' },
  balance: { label: 'Balans', icon: 'wallet-outline' },
};
const go = (path: string) => router.push(path as never);
const etaMin = (km: number, kmh = 30) => Math.max(1, Math.round((km / kmh) * 60));
const clock = (min: number) => { const d = new Date(Date.now() + min * 60000); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Sekundiga bir marta yangilanadigan vaqt */
function useNow(active = true, every = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(iv);
  }, [active, every]);
  return now;
}

export default function DriverHome() {
  const { colors: c } = useStore();
  const d = useDriver();
  const insets = useSafeAreaInsets();
  const map = useRef<MapHandle>(null);
  const [sheetH, setSheetH] = useState(300);
  const [demand, setDemand] = useState(true);
  const { trip, offer, pos, summary } = d;

  // Xaritani mashinaga ergashtirish
  const [follow, setFollow] = useState(true);
  // safarda yaqinroq, bo'sh paytda talab xaritasi ko'rinadigan masshtab
  const inTrip = !!trip;
  useEffect(() => {
    if (follow && !offer) map.current?.center(pos, inTrip);
  }, [pos, offer, follow, inTrip]);
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
  const path = stage === 'toPickup' ? trip?.approach : stage === 'inride' ? trip?.order.route.coords : undefined;
  const showZones = demand && !trip && !offer && !summary;
  const hot = d.online && showZones ? nearestHot(d.zones, pos) : null;
  const hereSurge = surgeAt(d.zones, pos);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TaxiMap
        ref={map}
        initial={pos}
        pickup={shown?.pickup}
        destination={shown?.destination}
        route={offer ? offer.order.route.coords : path}
        driverPath={path}
        driverPos={pos}
        driverHeading={d.heading}
        showPickup={!!shown && stage !== 'inride'}
        showNearby={false}
        zones={showZones ? d.zones : undefined}
        bottomPad={sheetH}
        overlayBottom={sheetH}
        topPad={insets.top + (trip ? 150 : 70)}
        onDragStart={() => setFollow(false)}
        locationGranted={!d.autopilot}
      />

      {/* Yuqori panel */}
      {trip ? (
        <NavBanner trip={trip} path={path} pos={pos} top={insets.top + 8} />
      ) : (
        <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable onPress={() => go('/menu')} style={[styles.round, { backgroundColor: c.surface }]} accessibilityLabel="Menyu">
            <Ionicons name="menu" size={24} color={c.text} />
            <View style={[styles.actBadge, { backgroundColor: activityColor(d.activity), borderColor: c.surface }]}><Text style={styles.actBadgeText}>{d.activity}</Text></View>
          </Pressable>
          <Pressable onPress={() => go('/earnings')} style={[styles.balance, { backgroundColor: c.surface }]} accessibilityLabel="Balans">
            <Ionicons name="wallet" size={18} color={c.brandDeep} />
            <Text style={[styles.balanceText, { color: c.text }]} numberOfLines={1}>{som(d.balance)}</Text>
          </Pressable>
          <Pressable onPress={() => setDemand(v => !v)} style={[styles.round, { backgroundColor: demand ? ORANGE : c.surface }]} accessibilityLabel="Talab xaritasi">
            <Ionicons name="flame" size={22} color={demand ? '#fff' : c.text} />
          </Pressable>
        </View>
      )}

      {/* Talab haqida maslahat */}
      {hot && !trip && !offer && !summary && (
        <Pressable
          onPress={() => { setFollow(false); map.current?.center(hot.zone.center, false); }}
          style={[styles.hint, { bottom: sheetH + 30, backgroundColor: c.surface }]}>
          <View style={[styles.hintDot, { backgroundColor: ZONE_COLOR[hereSurge > 1 ? (hereSurge >= 1.8 ? 3 : hereSurge >= 1.4 ? 2 : 1) : hot.zone.level] }]}>
            <Ionicons name="flame" size={13} color="#fff" />
          </View>
          <Txt v="small" style={{ fontFamily: F.bold }}>
            {hereSurge > 1 ? `Siz yuqori talab hududidasiz · ×${hereSurge.toFixed(1)}` : `Talab ×${hot.zone.surge.toFixed(1)} · ${hot.km.toFixed(1)} km`}
          </Txt>
        </Pressable>
      )}

      {/* Joylashuvga qaytish */}
      <Pressable onPress={() => { setFollow(true); map.current?.center(pos, true); }} style={[styles.locate, { bottom: sheetH + 30, backgroundColor: c.surface }]} accessibilityLabel="Mashinamga qaytish">
        <Ionicons name={follow ? 'navigate' : 'navigate-outline'} size={20} color={follow ? c.accent : c.text} />
      </Pressable>

      {/* Pastki panel */}
      <View onLayout={e => setSheetH(e.nativeEvent.layout.height)} style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 14, shadowColor: c.shadow }]}>
        <View style={[styles.grab, { backgroundColor: c.line }]} />
        {summary ? <SummaryPanel /> : offer ? <OfferPanel offer={offer} /> : trip ? <TripPanel trip={trip} /> : <HomePanel />}
      </View>
    </View>
  );
}

/* ---------- Navigator banneri ---------- */
const MANEUVER_ICON: Record<ManeuverKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  left: 'arrow-left-top-bold', right: 'arrow-right-top-bold', sharpLeft: 'arrow-left-top-bold', sharpRight: 'arrow-right-top-bold',
  uturn: 'arrow-u-left-top-bold', straight: 'arrow-up-bold', arrive: 'flag-checkered',
};

function NavBanner({ trip, path, pos, top }: { trip: Trip; path?: LatLng[]; pos: LatLng; top: number }) {
  const d = useDriver();
  const m = nextManeuver(path ?? [], pos);
  const target = trip.stage === 'inride' ? trip.order.destination : trip.order.pickup;
  const min = etaMin(m.leftKm);
  const external = () => {
    const { latitude: la, longitude: lo } = target;
    const app = d.navApp === 'yandex' ? `yandexnavi://build_route_on_map?lat_to=${la}&lon_to=${lo}` : `google.navigation:q=${la},${lo}`;
    const web = d.navApp === 'yandex' ? `https://yandex.uz/maps/?rtext=~${la},${lo}&rtt=auto` : `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}&travelmode=driving`;
    Linking.openURL(app).catch(() => Linking.openURL(web).catch(() => toast('Navigator ochilmadi', 'alert-circle')));
  };
  if (trip.stage === 'waiting' || !path) {
    return (
      <View style={[styles.navWrap, { top }]} pointerEvents="none">
        <View style={[styles.nav, { backgroundColor: '#11161F' }]}>
          <View style={styles.navIcon}><Ionicons name="person" size={30} color="#7CE0A8" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.navDist, { fontSize: 20 }]}>Mijozni kutyapsiz</Text>
            <Text style={styles.navText} numberOfLines={2}>«Haydovchi yetib keldi» xabari yuborildi · {trip.order.pickup.title}</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.navWrap, { top }]} pointerEvents="box-none">
      <View style={styles.nav}>
        <View style={styles.navIcon}><MaterialCommunityIcons name={MANEUVER_ICON[m.kind]} size={40} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.navDist}>{m.kind === 'arrive' ? 'Yetib keldingiz' : fmtDist(m.distM)}</Text>
          <Text style={styles.navText} numberOfLines={1}>{m.kind === 'arrive' ? target.title : `dan keyin ${MANEUVER_TEXT[m.kind]}`}</Text>
        </View>
        <Pressable onPress={external} style={styles.navExt} accessibilityLabel="Tashqi navigator">
          <Ionicons name="navigate-circle" size={26} color="#fff" />
          <Text style={styles.navExtText}>{d.navApp === 'yandex' ? 'Yandex' : 'Google'}</Text>
        </Pressable>
      </View>
      <View style={styles.navEta}>
        <Text style={styles.navEtaBig}>{min} daq</Text>
        <Text style={styles.navEtaText}>{m.leftKm.toFixed(1)} km · {clock(min)} da</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.navEtaText} numberOfLines={1}>{trip.stage === 'inride' ? 'Manzilga' : 'Mijozga'}</Text>
      </View>
    </View>
  );
}

/* ---------- Bosh panel: liniyaga chiqish va vidjetlar ---------- */
function HomePanel() {
  const { colors: c } = useStore();
  const d = useDriver();
  const now = useNow(d.online, 15000);
  const [sure, setSure] = useState(false);
  const [homeSheet, setHomeSheet] = useState(false);
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!d.online) return;
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => { loop.stop(); pulse.setValue(0); };
  }, [d.online, pulse]);
  const ms = d.onlineMsToday(now);
  const hm = `${Math.floor(ms / 3600000)} s ${Math.floor((ms % 3600000) / 60000)} d`;
  const tariffNames = d.profile?.tariffs.map(id => TARIFFS.find(t => t.id === id)?.name ?? id) ?? [];

  return (
    <View style={{ gap: 14 }}>
      {d.online ? (
        <Pressable onPress={() => setSure(true)} style={[styles.mainBtn, { backgroundColor: alpha(GREEN, 0.12), borderColor: GREEN, borderWidth: 2 }]} accessibilityLabel="Liniyada">
          <View style={styles.pulseWrap}>
            <Animated.View style={[styles.pulseRing, { borderColor: GREEN, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }] }]} />
            <View style={[styles.pulseDot, { backgroundColor: GREEN }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mainTitle, { color: GREEN }]}>Liniyadasiz</Text>
            <Txt v="small" muted>{d.live ? 'Buyurtma qidirilmoqda · YUMS yo\'lovchilari' : 'Buyurtma qidirilmoqda · demo'}{d.homeDest ? ` · uyga: ${d.homeDest.title}` : ''}</Txt>
          </View>
          <Ionicons name="power" size={22} color={GREEN} />
        </Pressable>
      ) : (
        <Pressable onPress={() => d.setOnline(true)} style={({ pressed }) => [styles.mainBtn, { backgroundColor: c.brand, transform: [{ scale: pressed ? 0.98 : 1 }] }]} accessibilityLabel="Liniyaga chiqish">
          <View style={[styles.powerIcon, { backgroundColor: 'rgba(14,21,37,0.1)' }]}><Ionicons name="power" size={22} color="#0E1525" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mainTitle, { color: '#0E1525' }]}>Liniyaga chiqish</Text>
            <Text style={styles.mainSub}>{d.activity < 40 ? 'Faollik past — buyurtmalar kamroq keladi' : 'Buyurtmalarni qabul qilishni boshlang'}</Text>
          </View>
        </Pressable>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }} style={{ marginHorizontal: -2 }}>
        <Widget label="Faollik" onPress={() => go('/quality')}>
          <Text style={[styles.wValue, { color: activityColor(d.activity) }]}>{d.activity}</Text>
          <View style={[styles.wBar, { backgroundColor: c.surface3 }]}><View style={{ width: `${d.activity}%`, height: 4, borderRadius: 2, backgroundColor: activityColor(d.activity) }} /></View>
        </Widget>
        <Widget label={`Bugun · ${d.today.count} ta`} onPress={() => go('/earnings')}>
          <Text style={[styles.wValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{som(d.today.sum)}</Text>
        </Widget>
        <Widget label="Liniyada" onPress={() => go('/earnings')}>
          <Text style={[styles.wValue, { color: c.text }]}>{hm}</Text>
        </Widget>
        <Widget label="Reyting" onPress={() => go('/quality')}>
          <Text style={[styles.wValue, { color: c.text }]}>★ {d.rating.toFixed(2)}</Text>
        </Widget>
        <Widget label={d.homeDest ? `Uyga · ${d.homeUsesLeft} ta qoldi` : `Uyga · kuniga ${d.homeUsesLeft} marta`} onPress={() => setHomeSheet(true)} active={!!d.homeDest}>
          <Row gap={6}><Ionicons name="home" size={16} color={d.homeDest ? c.accent : c.muted} /><Text style={[styles.wSmall, { color: d.homeDest ? c.accent : c.text }]} numberOfLines={1}>{d.homeDest?.title ?? "O'chiq"}</Text></Row>
        </Widget>
        <Widget label="Tariflar" onPress={() => go('/profile')}>
          <Text style={[styles.wSmall, { color: c.text }]} numberOfLines={2}>{tariffNames.join(', ')}</Text>
        </Widget>
      </ScrollView>

      <ActionSheet
        visible={sure}
        onClose={() => setSure(false)}
        header={<View style={{ alignItems: 'center', gap: 4 }}><Txt v="h3">Liniyadan chiqasizmi?</Txt><Txt v="small" muted style={{ textAlign: 'center' }}>Bugun liniyada: {hm}. Yangi buyurtmalar kelmaydi.</Txt></View>}
        groups={[[{ icon: 'power', title: 'Liniyadan chiqish', danger: true, onPress: () => { setSure(false); d.setOnline(false); } }]]}
      />
      <Sheet visible={homeSheet} onClose={() => setHomeSheet(false)} title="Uyga yo'nalish">
        <Txt v="small" muted>Buyurtmalar tanlagan manzilingiz tomonga taklif qilinadi. Kuniga {HOME_USES_PER_DAY} marta yoqish mumkin — bugun {d.homeUsesLeft} ta qoldi.</Txt>
        {d.homeDest && (
          <Pressable onPress={() => { d.setHomeDest(null); setHomeSheet(false); toast("«Uyga» rejimi o'chirildi", 'home-outline'); }} style={[styles.placeRow, { backgroundColor: c.dangerSoft }]}>
            <Ionicons name="close-circle" size={20} color={c.danger} /><Txt v="h3" color={c.danger}>O&apos;chirish · {d.homeDest.title}</Txt>
          </Pressable>
        )}
        {PLACES.slice(0, 8).map(p => (
          <Pressable key={p.title} disabled={d.homeDest?.title === p.title}
            onPress={() => {
              if (!d.setHomeDest(p)) { toast('Bugungi «Uyga» imkoniyati tugadi', 'alert-circle'); return; }
              setHomeSheet(false);
              toast(`Buyurtmalar «${p.title}» tomonga`, 'home');
            }}
            style={[styles.placeRow, { backgroundColor: d.homeDest?.title === p.title ? c.accentSoft : c.surface2 }]}>
            <Ionicons name="location" size={18} color={c.accent} />
            <View style={{ flex: 1 }}><Txt v="h3" numberOfLines={1}>{p.title}</Txt>{p.subtitle ? <Txt v="tiny" muted numberOfLines={1}>{p.subtitle}</Txt> : null}</View>
            <Txt v="tiny" muted>{distanceKm(d.pos, p).toFixed(1)} km</Txt>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

function Widget({ label, children, onPress, active }: { label: string; children: React.ReactNode; onPress?: () => void; active?: boolean }) {
  const { colors: c } = useStore();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.widget, { backgroundColor: active ? c.accentSoft : c.surface2, opacity: pressed ? 0.8 : 1 }]} accessibilityLabel={label}>
      <Txt v="tiny" muted numberOfLines={1}>{label}</Txt>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>{children}</View>
    </Pressable>
  );
}

/* ---------- Buyurtma taklifi ---------- */
function OfferPanel({ offer }: { offer: Offer }) {
  const { colors: c } = useStore();
  const d = useDriver();
  const o = offer.order;
  const tariff = TARIFFS.find(t => t.id === o.tariffId);
  const now = useNow(true, 250);
  const leftMs = Math.max(0, offer.expiresAt - now);
  const [left] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const ms = Math.max(0, offer.expiresAt - Date.now());
    left.setValue(ms / offer.total);
    const a = Animated.timing(left, { toValue: 0, duration: ms, easing: Easing.linear, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [offer, left]);
  const toHome = d.homeDest && distanceKm(o.destination, d.homeDest) < 3;
  const pickupMin = Math.max(1, Math.round(offer.distanceKm * 2.2));

  return (
    <View style={{ gap: 14 }}>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <Tag text={tariff?.name ?? o.tariffId} bg={c.ink} fg={c.bg} />
        <Tag icon={PAY[o.payment]?.icon} text={PAY[o.payment]?.label ?? o.payment} bg={c.surface2} fg={c.text} />
        {o.surge ? <Tag icon="flame" text={`×${o.surge.toFixed(1)}`} bg={ORANGE} fg="#fff" /> : null}
        {toHome ? <Tag icon="home" text="Uyga yo'lda" bg={c.accentSoft} fg={c.accent} /> : null}
        {o.options.includes('ac') ? <Tag icon="snow" text="Konditsioner" bg={c.surface2} fg={c.text} /> : null}
      </Row>

      <Row style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.price, { color: c.text }]}>{som(o.price)}</Text>
          <Txt v="small" muted>Sizga ≈ {som(Math.round(o.price * (1 - COMMISSION)))} · komissiya {COMMISSION * 100}%</Txt>
        </View>
        <Image source={TARIFF_ART[o.tariffId] ?? TARIFF_ART.start} style={{ width: 92, height: 50 }} contentFit="contain" />
      </Row>

      <View style={[styles.routeBox, { backgroundColor: c.surface2 }]}>
        <Stop color="#0F1E3D" big={`${pickupMin} daq · ${offer.distanceKm} km`} title={o.pickup.title} />
        <View style={[styles.stopLine, { backgroundColor: c.line }]} />
        <Stop color={c.brand} big={`${o.route.min} daq · ${o.route.km.toFixed(1)} km`} title={o.destination.title} />
      </View>

      <Row gap={10}>
        <Avatar name={o.passenger.name} size={34} />
        <Txt v="h3">{o.passenger.name}</Txt>
        <Txt v="small" muted>★ {o.passenger.rating.toFixed(1)}</Txt>
        {o.comment ? <Txt v="small" muted numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>💬 {o.comment}</Txt> : null}
      </Row>

      <Row gap={10}>
        <Pressable onPress={d.decline} style={[styles.declineBtn, { backgroundColor: c.surface2 }]} accessibilityLabel="Rad etish">
          <Ionicons name="close" size={28} color={c.text} />
        </Pressable>
        <Pressable onPress={d.accept} style={({ pressed }) => [styles.acceptBtn, { backgroundColor: alpha(c.brand, 0.45), transform: [{ scale: pressed ? 0.98 : 1 }] }]} accessibilityLabel="Qabul qilish">
          <Animated.View style={[styles.acceptFill, { backgroundColor: c.brand, width: left.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          <Text style={styles.acceptText}>Qabul qilish</Text>
          <Text style={styles.acceptSec}>{Math.ceil(leftMs / 1000)}</Text>
        </Pressable>
      </Row>
      <Txt v="tiny" faint style={{ textAlign: 'center', marginTop: -6 }}>Qabul qilish: faollik +{ACTIVITY.accept} · rad etish yoki o&apos;tkazib yuborish: {ACTIVITY.decline}</Txt>
    </View>
  );
}

function Tag({ text, icon, bg, fg }: { text: string; icon?: keyof typeof Ionicons.glyphMap; bg: string; fg: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={[styles.tagText, { color: fg }]}>{text}</Text>
    </View>
  );
}

function Stop({ color, big, title }: { color: string; big: string; title: string }) {
  return (
    <Row gap={12}>
      <View style={[styles.stopDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Txt v="h3">{big}</Txt>
        <Txt v="small" muted numberOfLines={1}>{title}</Txt>
      </View>
    </Row>
  );
}

/* ---------- Faol safar ---------- */
const QUICK = ['Yetib keldim, kutyapman', '5 daqiqada boraman', 'Qayerdasiz?', "Tirbandlik, biroz kechikaman"];

function TripPanel({ trip }: { trip: Trip }) {
  const { colors: c } = useStore();
  const d = useDriver();
  const o = trip.order;
  const now = useNow(trip.stage !== 'toPickup');
  const [more, setMore] = useState(false);
  const [chat, setChat] = useState(false);
  const call = () => Linking.openURL(`tel:${(o.passenger.phone ?? '').replace(/\s/g, '')}`).catch(() => toast(`Qo'ng'iroq: ${o.passenger.phone}`, 'call'));
  const waited = trip.arrivedAt ? Math.max(0, (now - trip.arrivedAt) / 1000) : 0;
  const paid = Math.max(0, waited - FREE_WAIT_SEC);
  const waitFee = trip.stage === 'waiting' ? Math.ceil(paid / 60) * WAIT_PER_MIN : trip.waitFee;
  const total = o.price + waitFee;

  return (
    <View style={{ gap: 14 }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Txt v="tiny" muted style={styles.caps}>{trip.stage === 'toPickup' ? 'Mijozga boring' : trip.stage === 'waiting' ? 'Mijozni kutish' : "Yo'lda · manzilga"}</Txt>
          <Txt v="h2" numberOfLines={1}>{trip.stage === 'inride' ? o.destination.title : o.pickup.title}</Txt>
        </View>
        <Pressable onPress={() => setMore(true)} style={[styles.moreBtn, { backgroundColor: c.surface2 }]} accessibilityLabel="Ko'proq">
          <Ionicons name="ellipsis-horizontal" size={20} color={c.text} />
        </Pressable>
      </Row>

      {trip.stage === 'waiting' && (
        <View style={[styles.waitBox, { backgroundColor: paid > 0 ? '#FEF3E2' : alpha(GREEN, 0.1) }]}>
          <View style={{ flex: 1 }}>
            <Txt v="small" color={paid > 0 ? '#B45309' : GREEN} style={{ fontFamily: F.bold }}>{paid > 0 ? 'Pullik kutish' : 'Bepul kutish'}</Txt>
            <Text style={[styles.waitTime, { color: paid > 0 ? '#B45309' : GREEN }]}>{paid > 0 ? mmss(paid) : mmss(FREE_WAIT_SEC - waited)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt v="tiny" muted>{paid > 0 ? `${som(WAIT_PER_MIN)}/daq` : 'keyin pullik'}</Txt>
            {paid > 0 ? <Txt v="h3" color="#B45309">+{som(waitFee)}</Txt> : <Txt v="small" muted>Mijozga xabar yuborildi</Txt>}
          </View>
        </View>
      )}

      {trip.stage === 'inride' && (
        <View style={[styles.meter, { backgroundColor: c.surface2 }]}>
          <View style={{ flex: 1 }}>
            <Txt v="tiny" muted style={styles.caps}>Taksometr · {PAY[o.payment]?.label}</Txt>
            <Text style={[styles.meterPrice, { color: c.text }]}>{som(total)}</Text>
            {trip.waitFee ? <Txt v="tiny" muted>shundan kutish: {som(trip.waitFee)}</Txt> : <Txt v="tiny" muted>qat&apos;iy narx{o.surge ? ` · ×${o.surge.toFixed(1)}` : ''}</Txt>}
          </View>
          <Ionicons name="speedometer-outline" size={34} color={c.faint} />
        </View>
      )}

      <View style={[styles.passenger, { backgroundColor: c.surface2 }]}>
        <Avatar name={o.passenger.name} size={42} />
        <View style={{ flex: 1 }}>
          <Txt v="h3">{o.passenger.name}</Txt>
          <Txt v="small" muted numberOfLines={1}>★ {o.passenger.rating.toFixed(1)} · {PAY[o.payment]?.label}{o.comment ? ` · ${o.comment}` : ''}</Txt>
        </View>
        <Pressable onPress={() => setChat(true)} style={[styles.circle, { backgroundColor: c.accentSoft }]} accessibilityLabel="Xabar"><Ionicons name="chatbubble" size={18} color={c.accent} /></Pressable>
        <Pressable onPress={call} style={[styles.circle, { backgroundColor: c.okSoft }]} accessibilityLabel="Qo'ng'iroq"><Ionicons name="call" size={18} color={c.ok} /></Pressable>
      </View>

      {trip.stage === 'toPickup' && <SlideButton title="Yetib keldim" onConfirm={d.arrived} icon="location" />}
      {trip.stage === 'waiting' && <SlideButton title="Safarni boshlash" onConfirm={d.startRide} icon="play" />}
      {trip.stage === 'inride' && <SlideButton title={`Yakunlash · ${som(total)}`} onConfirm={d.finishRide} color={GREEN} textColor="#fff" icon="checkmark" />}

      <ActionSheet
        visible={more}
        onClose={() => setMore(false)}
        header={<Txt v="small" muted style={{ textAlign: 'center' }}>{o.pickup.title} → {o.destination.title} · {som(o.price)}</Txt>}
        groups={[
          [
            { icon: 'call', title: "Mijozga qo'ng'iroq", onPress: () => { setMore(false); call(); } },
            { icon: 'shield-checkmark', title: 'Xavfsizlik · 112', sub: 'Favqulodda vaziyatda', onPress: () => { setMore(false); Linking.openURL('tel:112').catch(() => toast("Qo'ng'iroq: 112", 'call')); } },
          ],
          trip.stage === 'inride' ? [] : [{ icon: 'close-circle', title: 'Buyurtmani bekor qilish', sub: `Faollik ${ACTIVITY.cancel}`, danger: true, onPress: () => { setMore(false); d.cancelTrip(); } }],
        ]}
      />
      <ActionSheet
        visible={chat}
        onClose={() => setChat(false)}
        header={<Txt v="h3" style={{ textAlign: 'center' }}>{o.passenger.name}ga xabar</Txt>}
        groups={[QUICK.map(q => ({ icon: 'chatbubble-ellipses-outline' as const, title: q, onPress: () => { setChat(false); toast('Xabar yuborildi', 'paper-plane'); } }))]}
      />
    </View>
  );
}

/* ---------- Safar yakuni: hisob-kitob ---------- */
function SummaryPanel() {
  const { colors: c } = useStore();
  const d = useDriver();
  const [stars, setStars] = useState(0);
  if (!d.summary) return null;
  const e = d.summary.earning;
  const total = e.price + (e.waitFee ?? 0);
  const fee = e.fee ?? Math.round(total * COMMISSION);
  const cash = e.payment === 'cash';
  return (
    <View style={{ gap: 14 }}>
      <Row>
        <View style={[styles.doneIcon, { backgroundColor: alpha(GREEN, 0.14) }]}><Ionicons name="checkmark" size={26} color={GREEN} /></View>
        <View style={{ flex: 1 }}>
          <Txt v="h2">Safar yakunlandi</Txt>
          <Txt v="small" muted numberOfLines={1}>{e.from} → {e.to} · {e.km} km · {e.min} daq</Txt>
        </View>
      </Row>
      <View style={[styles.payBox, { backgroundColor: cash ? c.brand : alpha(GREEN, 0.12) }]}>
        <Ionicons name={cash ? 'cash' : 'card'} size={26} color={cash ? '#0E1525' : GREEN} />
        <View style={{ flex: 1 }}>
          <Txt v="small" color={cash ? '#0E1525' : GREEN} style={{ fontFamily: F.bold }}>{cash ? "Yo'lovchidan naqd oling" : 'Kartadan to\'landi — balansga tushadi'}</Txt>
          <Text style={[styles.payTotal, { color: cash ? '#0E1525' : c.text }]}>{som(total)}</Text>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Line label="Safar narxi" value={som(e.price)} />
        {e.waitFee ? <Line label="Pullik kutish" value={som(e.waitFee)} /> : null}
        <Line label={`YUMS komissiyasi ${COMMISSION * 100}%`} value={`−${som(fee)}`} color={c.danger} />
        <Line label="Sizning daromadingiz" value={som(total - fee)} bold />
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Txt v="small" muted>{d.summary.passenger}ni baholang</Txt>
        <Row gap={8}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable key={n} onPress={() => setStars(n)} hitSlop={4} accessibilityLabel={`${n} yulduz`}>
              <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={34} color={n <= stars ? '#F5A524' : c.faint} />
            </Pressable>
          ))}
        </Row>
      </View>
      <Pressable onPress={() => d.closeSummary(stars || undefined)} style={({ pressed }) => [styles.mainBtn, { backgroundColor: c.brand, justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] }]} accessibilityLabel="Davom etish">
        <Text style={[styles.mainTitle, { color: '#0E1525' }]}>{d.online ? 'Keyingi buyurtma' : 'Davom etish'}</Text>
      </Pressable>
    </View>
  );
}

function Line({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt v={bold ? 'h3' : 'small'} muted={!bold}>{label}</Txt>
      <Txt v={bold ? 'h3' : 'small'} color={color} style={{ fontFamily: F.bold }}>{value}</Txt>
    </Row>
  );
}

const shadow = { shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 };

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  round: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', ...shadow },
  actBadge: { position: 'absolute', right: -4, bottom: -4, minWidth: 26, height: 20, borderRadius: 10, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  actBadgeText: { color: '#fff', fontFamily: F.heavy, fontSize: 10 },
  balance: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, ...shadow },
  balanceText: { fontFamily: F.heavy, fontSize: 17, letterSpacing: -0.3 },
  hint: { position: 'absolute', left: 14, right: 74, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, ...shadow },
  hintDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  locate: { position: 'absolute', right: 14, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', ...shadow },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 10, shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: -6 }, elevation: 16 },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  // navigator
  navWrap: { position: 'absolute', left: 10, right: 10, gap: 6 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1B5E3A', borderRadius: 22, padding: 12, ...shadow },
  navIcon: { width: 58, height: 58, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  navDist: { color: '#fff', fontFamily: F.heavy, fontSize: 28, letterSpacing: -0.8 },
  navText: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi, fontSize: 14 },
  navExt: { alignItems: 'center', gap: 1, paddingHorizontal: 6 },
  navExtText: { color: 'rgba(255,255,255,0.8)', fontFamily: F.bold, fontSize: 10 },
  navEta: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#11161F', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, minWidth: '62%', ...shadow },
  navEtaBig: { color: '#7CE0A8', fontFamily: F.heavy, fontSize: 16 },
  navEtaText: { color: 'rgba(255,255,255,0.75)', fontFamily: F.semi, fontSize: 13 },
  // bosh panel
  mainBtn: { height: 72, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  mainTitle: { fontFamily: F.heavy, fontSize: 19, letterSpacing: -0.4 },
  mainSub: { fontFamily: F.semi, fontSize: 12.5, color: 'rgba(14,21,37,0.65)' },
  powerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pulseWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 3 },
  pulseDot: { width: 14, height: 14, borderRadius: 7 },
  widget: { width: 124, height: 84, borderRadius: 18, padding: 12, gap: 4 },
  wValue: { fontFamily: F.heavy, fontSize: 19, letterSpacing: -0.4 },
  wSmall: { fontFamily: F.bold, fontSize: 13.5, flexShrink: 1 },
  wBar: { height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  // taklif
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontFamily: F.bold, fontSize: 12.5 },
  price: { fontFamily: F.heavy, fontSize: 38, letterSpacing: -1.2 },
  routeBox: { borderRadius: 18, padding: 14 },
  stopDot: { width: 12, height: 12, borderRadius: 6 },
  stopLine: { width: 2, height: 16, marginLeft: 5, marginVertical: 2 },
  declineBtn: { width: 66, height: 66, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { flex: 1, height: 66, borderRadius: 22, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  acceptFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  acceptText: { fontFamily: F.heavy, fontSize: 19, color: '#0E1525' },
  acceptSec: { fontFamily: F.heavy, fontSize: 15, color: '#0E1525', opacity: 0.6, minWidth: 22 },
  // safar
  caps: { fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  moreBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  waitBox: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18 },
  waitTime: { fontFamily: F.heavy, fontSize: 34, letterSpacing: -1 },
  meter: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18 },
  meterPrice: { fontFamily: F.heavy, fontSize: 32, letterSpacing: -1 },
  passenger: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18 },
  circle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  // yakun
  doneIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  payBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20 },
  payTotal: { fontFamily: F.heavy, fontSize: 30, letterSpacing: -1 },
});
