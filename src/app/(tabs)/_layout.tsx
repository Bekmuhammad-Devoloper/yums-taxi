import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/components/ui';
import { isRTL, type TKey } from '@/lib/i18n';
import { usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F, shadow } from '@/lib/theme';

const TABS: Record<string, { icon: IconName; active: IconName; label: TKey }> = {
  index: { icon: 'home-outline', active: 'home', label: 'tab.home' },
  world: { icon: 'earth-outline', active: 'earth', label: 'tab.world' },
  connect: { icon: 'chatbubbles-outline', active: 'chatbubbles', label: 'tab.connect' },
  profile: { icon: 'person-circle-outline', active: 'person-circle', label: 'tab.profile' },
};

// 4 ta bo'lim va o'rtada «+» tugmasi — 5 ta teng joy
const SLOTS = 5;
const PILL_W = 58;
const PILL_H = 34;
const BAR_TOP = 8;
const slotOf = (i: number) => (i < 2 ? i : i + 1);

/** Telefonda «harakatni kamaytirish» yoqilgan bo'lsa — kapsula sakramaydi, joyiga darhol o'tadi */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(v => { if (alive) setReduce(!!v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setReduce(!!v));
    return () => { alive = false; sub?.remove(); };
  }, []);
  return reduce;
}

/** Tanlangan bo'lim belgisi: tanlanganda bir lahza kichrayib, prujinadek joyiga qaytadi */
function TabIcon({ on, name, reduce, children }: { on: boolean; name: IconName; reduce: boolean; children?: ReactNode }) {
  const { colors: c } = useStore();
  const [pop] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!on || reduce) return;
    pop.setValue(0.72);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 170, useNativeDriver: true }).start();
  }, [on, reduce, pop]);
  return (
    <View style={styles.iconWrap}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Ionicons name={name} size={23} color={on ? c.brandText : c.muted} />
      </Animated.View>
      {children}
    </View>
  );
}

function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { colors: c, t, lang } = useStore();
  const { unread } = usePlatform();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  const placed = useRef(false);

  // Sariq kapsula tanlangan bo'lim ostiga suzib o'tadi (arab tilida qatorlar teskari)
  const targetFor = (w: number, index: number) => {
    const slotW = w / SLOTS;
    const slot = slotOf(index);
    return (isRTL(lang) ? SLOTS - 1 - slot : slot) * slotW + (slotW - PILL_W) / 2;
  };
  const target = width ? targetFor(width, state.index) : 0;
  useEffect(() => {
    if (!width) return;
    // birinchi o'lchovda kapsula joyida paydo bo'ladi (chapdan suzib kelmaydi)
    if (!placed.current || reduce) { placed.current = true; x.setValue(target); return; }
    Animated.spring(x, { toValue: target, damping: 17, stiffness: 210, mass: 0.9, useNativeDriver: true }).start();
  }, [target, width, reduce, x]);

  return (
    <View
      onLayout={e => {
        const w = e.nativeEvent.layout.width;
        if (!placed.current) x.setValue(targetFor(w, state.index));
        setWidth(w);
      }}
      style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {width ? (
        <Animated.View pointerEvents="none" style={[styles.pill, { transform: [{ translateX: x }] }]}>
          <LinearGradient colors={['#FFE36E', '#FFC800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pillFill} />
        </Animated.View>
      ) : null}
      {state.routes.map((r, i) => {
        const meta = TABS[r.name];
        if (!meta) return null;
        const on = state.index === i;
        const badge = r.name === 'connect' && unread > 0 ? unread : 0;
        return (
          <Fragment key={r.key}>
            {i === 2 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tab.create')}
                onPress={() => { haptic.tap(); router.push('/project/edit'); }}
                style={styles.item}>
                <View style={[styles.plus, { backgroundColor: c.brand }, shadow(c, 0.8)]}>
                  <Ionicons name="add" size={28} color={c.brandText} />
                </View>
                <Text style={[styles.label, { color: c.muted }]}>{t('tab.create')}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => { if (!on) haptic.tap(); navigateToTab(r.key); }}
              style={styles.item}>
              <TabIcon on={on} name={on ? meta.active : meta.icon} reduce={reduce}>
                {badge ? <View style={[styles.badge, { backgroundColor: c.danger, borderColor: c.surface }]}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
              </TabIcon>
              <Text style={[styles.label, { color: on ? c.text : c.muted, fontFamily: on ? F.heavy : F.semi }]} numberOfLines={1}>{t(meta.label)}</Text>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { user, colors: c } = useStore();
  if (!user) return <Redirect href="/login" />;
  return (
    <Tabs tabBar={p => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="world" />
      <Tabs.Screen name="connect" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: BAR_TOP, borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: PILL_W, height: PILL_H, alignItems: 'center', justifyContent: 'center' },
  // kapsula: tashqi qatlam — yorug' soya, ichki — gradient (soya kesilib qolmasin).
  // Android'da elevation berilmaydi: u kapsulani belgilar ustiga chiqarib qo'yadi
  pill: {
    position: 'absolute', top: BAR_TOP, left: 0, width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2, backgroundColor: '#FFC800',
    shadowColor: '#FFB800', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  pillFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: PILL_H / 2, overflow: 'hidden' },
  label: { fontSize: 11 },
  plus: { width: 52, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  badge: { position: 'absolute', top: -3, right: 6, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: F.heavy },
});
