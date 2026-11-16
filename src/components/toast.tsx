// Tepadan tushadigan xabar — iPhone bildirishnomasi uslubida: shaffofroq yumaloq kartochka, chapda ilova
// belgisi (burchagida ma'nosiga qarab rangli kichik belgi: xato — qizil, muvaffaqiyat — yashil), yuqorida
// «YUMS · hozir», ostida matn. Prujinadek tushadi; bosilsa yoki yuqoriga surilsa yopiladi.
// Tashqi API o'zgarmagan: toast(matn, ikon).
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

const ND = Platform.OS !== 'web';

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const { colors: c, dark } = useStore();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [show] = useState(() => new Animated.Value(0));
  // barmoq bilan yuqoriga surish
  const [drag] = useState(() => new Animated.Value(0));
  // yopilish taymeri (ref emas: surish ishlovchisi uni chizish paytida yaratilgan yopilmada ishlatadi)
  const [timer] = useState<{ id?: ReturnType<typeof setTimeout> }>(() => ({}));

  const hide = () => {
    clearTimeout(timer.id);
    Animated.timing(show, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(({ finished }) => {
      if (finished) setMsg(null);
    });
  };

  // yuqoriga surilsa yopiladi, pastga — joyida qoladi (iPhone'dagidek)
  const [pan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
    onPanResponderMove: (_, g) => drag.setValue(Math.min(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy < -24 || g.vy < -0.5) {
        clearTimeout(timer.id);
        Animated.timing(drag, { toValue: -160, duration: 180, useNativeDriver: ND }).start(() => setMsg(null));
      } else {
        Animated.spring(drag, { toValue: 0, useNativeDriver: ND, friction: 7 }).start();
      }
    },
  }));

  useEffect(() => {
    const fn = (m: Msg) => {
      // xatolar o'qishga ulgurish uchun uzoqroq turadi
      const ms = toneOf(m.icon) === 'danger' ? 3600 : 2600;
      clearTimeout(timer.id);
      setMsg(m);
      show.setValue(0);
      drag.setValue(0);
      Animated.spring(show, { toValue: 1, friction: 9, tension: 70, useNativeDriver: ND }).start();
      timer.id = setTimeout(() => {
        Animated.timing(show, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(({ finished }) => {
          if (finished) setMsg(null);
        });
      }, ms);
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
      clearTimeout(timer.id);
    };
  }, [show, drag, timer]);

  if (!msg) return null;
  const tone = toneOf(msg.icon);
  const tint = { danger: c.danger, success: c.ok, neutral: c.muted, brand: '#E0A800' }[tone];

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 6 }]}>
      <Animated.View
        key={msg.id}
        {...pan.panHandlers}
        style={[
          styles.card,
          {
            // iPhone bildirishnomasi: yorug'da sutdek oq, qorong'ida to'q kulrang, biroz shaffof
            backgroundColor: dark ? 'rgba(44,44,48,0.985)' : 'rgba(250,250,252,0.99)',
            borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            shadowOpacity: dark ? 0.45 : 0.14,
            opacity: show,
            transform: [
              { translateY: Animated.add(show.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }), drag) },
            ],
          },
        ]}>
        <Pressable onPress={hide} accessibilityRole="alert" accessibilityLabel={msg.text} style={styles.row}>
          <View>
            <BrandMark size={38} style={{ borderRadius: 10 }} />
            <View style={[styles.badge, { backgroundColor: tint, borderColor: dark ? '#2C2C30' : '#FAFAFC' }]}>
              <Ionicons name={msg.icon} size={11} color="#FFFFFF" />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <View style={styles.head}>
              <Text style={[styles.app, { color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(60,60,67,0.6)' }]}>YUMS</Text>
              <Text style={[styles.when, { color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(60,60,67,0.45)' }]}>{tr('hozir')}</Text>
            </View>
            <Text style={[styles.text, { color: c.text }]} numberOfLines={4}>{msg.text}</Text>
          </View>
        </Pressable>
        {/* pastdagi tutqich — surib yopish mumkinligini ko'rsatadi */}
        <View style={[styles.grab, { backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 8, right: 8, zIndex: 100, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 13 },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  app: { fontFamily: F.semi, fontSize: 12.5, letterSpacing: 0.3, textTransform: 'uppercase' },
  when: { fontFamily: F.medium, fontSize: 12 },
  text: { fontFamily: F.semi, fontSize: 14.5, lineHeight: 19.5, letterSpacing: -0.1 },
  grab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 6 },
});
