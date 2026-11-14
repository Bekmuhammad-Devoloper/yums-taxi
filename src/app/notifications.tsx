import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { alpha, Screen, Txt } from '@/components/ui';
import type { Notice } from '@/lib/platform-data';
import { dayLabel } from '@/lib/format';
import { ago, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, tx } from '@/lib/i18n';

type IconName = Notice['icon'];

// Bildirishnoma turi ikonkasidan rangi: safar — sariq, xabar — ko'k, tasdiq — yashil, xato — qizil, uchrashuv — binafsha
const TINT: Partial<Record<IconName, string>> = {
  car: '#F5B400', flag: '#12A150',
  'checkmark-circle': '#12A150', 'shield-checkmark': '#12A150',
  'alert-circle': '#E5484D', 'close-circle': '#E5484D', warning: '#E8890C',
  chatbubbles: '#3B82F6', 'chatbubble-ellipses': '#3B82F6', people: '#3B82F6',
  calendar: '#8B5CF6', megaphone: '#E8890C', diamond: '#D946EF', headset: '#14B8A6',
};

/** Bildirishnoma belgisi: mashina — tomida «TAXI» yozuvi bor taksi, qolganlari — Ionicons */
function Glyph({ icon, size, color }: { icon: IconName; size: number; color: string }) {
  if (icon === 'car') return <MaterialCommunityIcons name="taxi" size={size + 3} color={color} />;
  return <Ionicons name={icon} size={size} color={color} />;
}

// Bo'sh holatda — bu yerda nimalar chiqishi
const EXPECT: { icon: IconName; text: string }[] = [
  { icon: 'car', text: tx("Haydovchi yo'lga chiqdi, yetib keldi, safar tugadi") },
  { icon: 'chatbubbles', text: tx("Yangi xabarlar va hamkorlik so'rovlari") },
  { icon: 'calendar', text: tx('Uchrashuvlar va muhim yangiliklar') },
];

export default function Notifications() {
  const { colors: c } = useStore();
  const p = usePlatform();
  const { markNoticesRead } = p;
  // Ekran yopilganda hammasi o'qilgan deb belgilanadi — ochilganda yangilari ajralib turadi
  useEffect(() => () => markNoticesRead(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const unread = p.notices.filter(n => !n.read).length;
  // kunlar bo'yicha guruhlar (ro'yxat serverdan yangisi birinchi keladi)
  const groups: { day: string; items: Notice[] }[] = [];
  for (const n of p.notices) {
    const day = dayLabel(n.at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(n);
    else groups.push({ day, items: [n] });
  }

  return (
    <Screen
      title={tr('Bildirishnomalar')}
      subtitle={unread ? tr('{n} ta yangi', { n: unread }) : undefined}
      right={unread ? (
        <Pressable onPress={() => { haptic.tap(); markNoticesRead(); }} hitSlop={6} accessibilityRole="button" accessibilityLabel={tr("Hammasini o'qildi qilish")}
          style={({ pressed }) => [styles.readAll, { backgroundColor: alpha(c.accent, 0.14), opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="checkmark-done" size={17} color={c.accent} />
          <Text style={[styles.readAllText, { color: c.accent }]}>{tr("O'qildi")}</Text>
        </Pressable>
      ) : undefined}>
      {p.notices.length === 0 ? <Empty /> : groups.map(g => (
        <View key={g.day} style={{ gap: 8 }}>
          <Text style={[styles.day, { color: c.muted }]}>{g.day}</Text>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }]}>
            {g.items.map((n, i) => <Row key={n.id} n={n} last={i === g.items.length - 1} />)}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function Row({ n, last }: { n: Notice; last: boolean }) {
  const { colors: c } = useStore();
  const tint = TINT[n.icon] ?? c.muted;
  return (
    <Pressable
      disabled={!n.href}
      onPress={() => { haptic.tap(); if (n.href) router.push(n.href as Href); }}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surface2 : n.read ? 'transparent' : alpha(c.brand, 0.07) }]}>
      {/* o'qilmagan — chap chekkada brend rangli chiziq */}
      {!n.read && <View style={[styles.unreadBar, { backgroundColor: c.brand }]} />}
      <View style={[styles.ico, { backgroundColor: alpha(tint, 0.15) }]}><Glyph icon={n.icon} size={20} color={tint} /></View>
      <View style={[styles.body, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.text, fontFamily: n.read ? F.semi : F.bold }]} numberOfLines={1}>{n.title}</Text>
          <Text style={[styles.time, { color: n.read ? c.faint : c.accent }]}>{ago(n.at)}</Text>
        </View>
        <Txt v="small" muted numberOfLines={2} style={{ lineHeight: 19 }}>{n.text}</Txt>
      </View>
      {n.href ? <Ionicons name="chevron-forward" size={16} color={c.faint} style={{ alignSelf: 'center' }} /> : null}
    </Pressable>
  );
}

// Orbitadagi kichik belgilar — pastdagi ro'yxatdagi bildirishnoma turlari
const ORBIT_R = 86;
const SATELLITES: { icon: IconName; angle: number }[] = [
  { icon: 'car', angle: -145 },
  { icon: 'chatbubbles', angle: -25 },
  { icon: 'calendar', angle: 105 },
];

/** Bo'sh holat rasmi: sariq gradient kartochkada qo'ng'iroq (vaqti-vaqti bilan jiringlaydi), atrofida orbita */
function BellArt() {
  const { colors: c, dark } = useStore();
  const [swing] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let alive = true;
    // harakatni kamaytirish yoqilgan bo'lsa — qo'ng'iroq jim turadi
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!alive || reduce) return;
        const step = (toValue: number, duration: number) => Animated.timing(swing, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
        loop = Animated.loop(Animated.sequence([Animated.delay(1400), step(1, 110), step(-1, 170), step(0.6, 150), step(-0.35, 130), step(0, 120)]));
        loop.start();
      });
    return () => { alive = false; loop?.stop(); };
  }, [swing]);
  const rotate = swing.interpolate({ inputRange: [-1, 1], outputRange: ['-16deg', '16deg'] });

  return (
    <View style={styles.art}>
      <View style={[styles.glow, { backgroundColor: alpha(c.brand, dark ? 0.08 : 0.12) }]} />
      <View style={[styles.orbit, { borderColor: alpha(c.brand, dark ? 0.32 : 0.5) }]} />
      {SATELLITES.map(sat => {
        const rad = (sat.angle * Math.PI) / 180;
        const tint = TINT[sat.icon] ?? c.muted;
        return (
          <View key={sat.icon} style={[styles.sat, { left: 100 + ORBIT_R * Math.cos(rad) - 17, top: 100 + ORBIT_R * Math.sin(rad) - 17, backgroundColor: c.surface, borderColor: alpha(tint, 0.45), shadowColor: tint }]}>
            <Glyph icon={sat.icon} size={16} color={tint} />
          </View>
        );
      })}
      <LinearGradient colors={['#FFE066', '#FFC800', '#F5A300']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.tile, { shadowColor: c.brand }]}>
        {/* yaltirash: yuqori chap burchakda yumshoq oq dog' */}
        <View style={styles.sheen} />
        <Animated.View style={{ transform: [{ translateY: -12 }, { rotate }, { translateY: 12 }] }}>
          <Ionicons name="notifications" size={44} color="#3B2A00" />
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

// Ro'yxatdagi ikonkalar: qo'ng'iroq kartochkasi kabi — o'z rangida gradient, yaltirash, ustida oq (sariqda to'q) belgi
const GRADIENT: Partial<Record<IconName, { colors: [string, string, string]; glyph: IconName; fg: string }>> = {
  car: { colors: ['#FFE066', '#FFC800', '#F5A300'], glyph: 'car', fg: '#3B2A00' },
  chatbubbles: { colors: ['#8AB8FF', '#3B82F6', '#2563EB'], glyph: 'chatbubbles', fg: '#FFFFFF' },
  calendar: { colors: ['#C4B5FD', '#8B5CF6', '#6D28D9'], glyph: 'calendar', fg: '#FFFFFF' },
};

function GradientIcon({ kind }: { kind: IconName }) {
  const g = GRADIENT[kind];
  if (!g) return null;
  return (
    <LinearGradient colors={g.colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.gIco, { shadowColor: g.colors[1] }]}>
      <View style={styles.gSheen} />
      <Glyph icon={g.glyph} size={19} color={g.fg} />
    </LinearGradient>
  );
}

function Empty() {
  const { colors: c } = useStore();
  return (
    <View style={styles.empty}>
      <BellArt />
      <Txt v="h2" style={{ textAlign: 'center' }}>{tr("Hozircha bildirishnoma yo'q")}</Txt>
      <Txt muted style={{ textAlign: 'center', lineHeight: 21, maxWidth: 300 }}>{tr("Yangi narsa bo'lishi bilan shu yerda xabar beramiz")}</Txt>
      <View style={[styles.expect, { backgroundColor: c.surface, borderColor: c.line }]}>
        {EXPECT.map((e, i) => (
          <View key={e.icon} style={[styles.expectRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
            <GradientIcon kind={e.icon} />
            <Txt v="small" style={{ flex: 1, fontFamily: F.semi }}>{tr(e.text)}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readAll: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  readAllText: { fontFamily: F.bold, fontSize: 13 },
  day: { fontFamily: F.bold, fontSize: 12.5, letterSpacing: 0.4, textTransform: 'uppercase', marginLeft: 4 },
  group: { borderRadius: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingLeft: 14, paddingRight: 12, position: 'relative' },
  unreadBar: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  ico: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  body: { flex: 1, gap: 3, paddingVertical: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15 },
  time: { fontFamily: F.semi, fontSize: 12 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 24 },
  art: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  glow: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  orbit: { position: 'absolute', width: ORBIT_R * 2, height: ORBIT_R * 2, borderRadius: ORBIT_R, borderWidth: 1.5, borderStyle: 'dashed' },
  sat: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  tile: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'visible', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  sheen: { position: 'absolute', top: 8, left: 12, width: 40, height: 18, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-18deg' }] },
  expect: { alignSelf: 'stretch', marginTop: 14, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  expectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  gIco: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  gSheen: { position: 'absolute', top: 3, left: 4, width: 18, height: 9, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ rotate: '-18deg' }] },
});
