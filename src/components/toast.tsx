import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from './ui';

type Msg = { id: number; text: string; icon: IconName };
const listeners = new Set<(m: Msg) => void>();

export function toast(text: string, icon: IconName = 'checkmark-circle') {
  const m = { id: Date.now(), text, icon };
  listeners.forEach(fn => fn(m));
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const fn = (m: Msg) => {
      setMsg(m);
      clearTimeout(timer);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      timer = setTimeout(() => Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMsg(null)), 2400);
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); clearTimeout(timer); };
  }, [anim]);

  if (!msg) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      <Ionicons name={msg.icon} size={20} color="#FFC800" />
      <Text style={styles.text}>{msg.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', alignSelf: 'center', zIndex: 100, maxWidth: '90%',
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 16, backgroundColor: '#0F1E3D',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 14, flexShrink: 1 },
});
