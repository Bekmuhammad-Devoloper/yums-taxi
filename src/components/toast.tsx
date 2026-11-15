// Tepadan chiqadigan qisqa xabar. Rangi ma'nosiga qarab (xato — qizil, muvaffaqiyat — yashil, o'chirish
// — kulrang, qolgani — brend oltin), kartochka mavzuga mos, pastida yopilishgacha qolgan vaqt chizig'i.
// Bosilsa darhol yopiladi. Tashqi API o'zgarmagan: toast(matn, ikon).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import type { IconName } from './ui';

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
  const [life] = useState(() => new Animated.Value(1));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = () => {
    clearTimeout(timer.current);
    Animated.timing(show, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(({ finished }) => {
      if (finished) setMsg(null);
    });
  };

  useEffect(() => {
    const fn = (m: Msg) => {
      // xatolar o'qishga ulgurish uchun uzoqroq turadi
      const ms = toneOf(m.icon) === 'danger' ? 3600 : 2600;
      clearTimeout(timer.current);
      setMsg(m);
      show.setValue(0);
      Animated.spring(show, { toValue: 1, friction: 7, tension: 90, useNativeDriver: ND }).start();
      life.setValue(1);
      Animated.timing(life, { toValue: 0, duration: ms, easing: Easing.linear, useNativeDriver: ND }).start();
      timer.current = setTimeout(() => {
        Animated.timing(show, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(({ finished }) => {
          if (finished) setMsg(null);
        });
      }, ms);
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
      clearTimeout(timer.current);
    };
  }, [show, life]);

  if (!msg) return null;
  const tone = toneOf(msg.icon);
  const tint = { danger: c.danger, success: c.ok, neutral: c.muted, brand: c.brandDeep }[tone];
  const soft = { danger: c.dangerSoft, success: c.okSoft, neutral: c.surface3, brand: c.brandSoft }[tone];

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      <Animated.View
        key={msg.id}
        style={[
          styles.card,
          {
            backgroundColor: c.surface,
            borderColor: c.line,
            shadowOpacity: dark ? 0.5 : 0.16,
            opacity: show,
            transform: [
              { translateY: show.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) },
              { scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}>
        <Pressable onPress={hide} accessibilityRole="alert" accessibilityLabel={msg.text} style={styles.row}>
          <View style={[styles.badge, { backgroundColor: soft }]}>
            <Ionicons name={msg.icon} size={19} color={tint} />
          </View>
          <Text style={[styles.text, { color: c.text }]} numberOfLines={3}>{msg.text}</Text>
        </Pressable>
        {/* yopilishgacha qolgan vaqt */}
        <Animated.View style={[styles.life, { backgroundColor: tint, transform: [{ scaleX: life }] }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 14, right: 14, zIndex: 100, alignItems: 'center' },
  card: {
    maxWidth: 440,
    minWidth: 220,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingLeft: 11, paddingRight: 16 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flexShrink: 1, fontFamily: F.semi, fontSize: 14.5, lineHeight: 19, letterSpacing: -0.1 },
  life: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2.5, opacity: 0.85, transformOrigin: 'left' },
});
