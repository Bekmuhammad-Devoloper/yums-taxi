// Tepadan tushadigan xabar — iPhone bildirishnomasi uslubida: ixcham yumaloq kartochka, chapda ilova belgisi
// (burchagida ma'nosiga qarab rangli kichik belgi: xato — qizil, muvaffaqiyat — yashil), yuqorida «YUMS · hozir»,
// ostida matn. Prujinadek tushadi; bosilsa yoki yuqoriga surilsa yopiladi, barmoq tekkanda yopilmay turadi.
// Qancha turishi matn uzunligiga qarab (o'qishga ulgurish uchun). Tashqi API o'zgarmagan: toast(matn, ikon).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import { BrandMark, type IconName } from './ui';

type Msg = { id: number; text: string; icon: IconName };
const listeners = new Set<(m: Msg) => void>();
let seq = 0;

export function toast(text: string, icon: IconName = 'checkmark-circle') {
  const m = { id: ++seq, text, icon };
  listeners.forEach(fn => fn(m));
}

type Tone = 'danger' | 'success' | 'neutral' | 'brand';

const DANGER = new Set<string>(['alert-circle', 'close-circle', 'warning', 'ban', 'cloud-offline-outline']);
const SUCCESS = new Set<string>(['checkmark-circle', 'shield-checkmark', 'checkmark-done', 'star', 'hand-right', 'diamond']);
const NEUTRAL = new Set<string>(['trash', 'person-remove', 'unlink', 'remove-circle-outline', 'time-outline']);

const toneOf = (icon: string): Tone => (DANGER.has(icon) ? 'danger' : SUCCESS.has(icon) ? 'success' : NEUTRAL.has(icon) ? 'neutral' : 'brand');

/** Kichik belgida doira ichidagi doira nuqtaga aylanib qoladi — «alert-circle» o'rniga yalang'och «alert» */
const badgeIcon = (icon: IconName): IconName => {
  const bare = icon.replace(/-circle(-outline)?$/, '');
  return bare !== icon && bare in Ionicons.glyphMap ? (bare as IconName) : icon;
};

/** Ko'rinib turish vaqti: qisqa «Saqlandi» ~2 s, uzun xato ~5 s (ko'pi bilan 6 s) */
const durationOf = (m: Msg) => Math.min(6000, (toneOf(m.icon) === 'danger' ? 2800 : 2000) + m.text.length * 30);

const ND = Platform.OS !== 'web';
// telefonda shrift kattalashtirilgan bo'lsa ham kartochka ixcham qoladi
const MAX_SCALE = 1.15;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const { colors: c, dark } = useStore();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [show] = useState(() => new Animated.Value(0));
  // barmoq bilan surish (yuqoriga — yopiladi, pastga — rezinadek ozgina cho'ziladi)
  const [drag] = useState(() => new Animated.Value(0));
  // bosib turilganda biroz kichrayadi
  const [press] = useState(() => new Animated.Value(1));
  // avto-yopilish (ref emas: surish ishlovchisi uni chizish paytida yaratilgan yopilmada ishlatadi)
  const [auto] = useState(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    const out = (duration: number) => {
      clearTimeout(id);
      Animated.timing(show, { toValue: 0, duration, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(({ finished }) => {
        if (finished) setMsg(null);
      });
    };
    return {
      out,
      arm: (ms: number) => { clearTimeout(id); id = setTimeout(() => out(220), ms); },
      stop: () => clearTimeout(id),
    };
  });

  const hide = () => auto.out(240);

  const [pan] = useState(() => {
    const settle = () => {
      Animated.spring(drag, { toValue: 0, useNativeDriver: ND, friction: 7 }).start();
      auto.arm(1800);
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => auto.stop(),
      onPanResponderMove: (_, g) => drag.setValue(g.dy < 0 ? g.dy : Math.sqrt(g.dy) * 2.5),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -24 || g.vy < -0.5) {
          auto.stop();
          Animated.timing(drag, { toValue: -180, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(({ finished }) => {
            if (finished) setMsg(null);
          });
        } else {
          settle();
        }
      },
      onPanResponderTerminate: settle,
    });
  });

  useEffect(() => {
    const fn = (m: Msg) => {
      setMsg(m);
      show.setValue(0);
      drag.setValue(0);
      press.setValue(1);
      Animated.spring(show, { toValue: 1, friction: 8.5, tension: 75, useNativeDriver: ND }).start();
      auto.arm(durationOf(m));
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
      auto.stop();
    };
  }, [show, drag, press, auto]);

  if (!msg) return null;
  const tone = toneOf(msg.icon);
  const tint = { danger: c.danger, success: c.ok, neutral: c.muted, brand: '#E0A800' }[tone];
  const surface = dark ? '#26262A' : '#FCFCFD';
  const secondary = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const pressTo = (toValue: number) => Animated.spring(press, { toValue, friction: 7, tension: 160, useNativeDriver: ND }).start();

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 6 }]}>
      <Animated.View
        key={msg.id}
        {...pan.panHandlers}
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          {
            // iPhone bildirishnomasi: yorug'da sutdek oq, qorong'ida to'q kulrang
            backgroundColor: surface,
            borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
            shadowOpacity: dark ? 0.4 : 0.11,
            opacity: show.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateY: Animated.add(show.interpolate({ inputRange: [0, 1], outputRange: [-110, 0] }), drag) },
              { scale: Animated.multiply(press, show.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] })) },
            ],
          },
        ]}>
        <Pressable
          onPress={hide}
          onPressIn={() => pressTo(0.97)}
          onPressOut={() => pressTo(1)}
          accessibilityRole="alert"
          accessibilityLabel={msg.text}
          style={styles.row}>
          <View>
            <BrandMark size={36} style={{ borderRadius: 9 }} />
            <View style={[styles.badge, { backgroundColor: tint, borderColor: surface }]}>
              <Ionicons name={badgeIcon(msg.icon)} size={11} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.body}>
            <View style={styles.head}>
              <Text style={[styles.app, { color: secondary }]} maxFontSizeMultiplier={MAX_SCALE}>YUMS</Text>
              <Text style={[styles.when, { color: secondary }]} maxFontSizeMultiplier={MAX_SCALE}>{tr('hozir')}</Text>
            </View>
            <Text style={[styles.text, { color: c.text }]} numberOfLines={3} maxFontSizeMultiplier={MAX_SCALE}>{msg.text}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 8, right: 8, zIndex: 100, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingLeft: 12, paddingRight: 14 },
  badge: { position: 'absolute', right: -3, bottom: -3, width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 1 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  app: { fontFamily: F.semi, fontSize: 13, lineHeight: 17 },
  when: { fontFamily: F.medium, fontSize: 12, lineHeight: 17 },
  text: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 19.5, letterSpacing: -0.1 },
});
