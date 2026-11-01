import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { haptic } from '@/lib/store';
import { F } from '@/lib/theme';

const KNOB = 58;
const PAD = 5;

/**
 * Surib tasdiqlanadigan tugma: tasodifiy bosilishdan himoya (yetib keldim, safarni boshlash, yakunlash).
 * Tugmani o'ngga oxirigacha surish kerak; yarim yo'lda qo'yib yuborilsa joyiga qaytadi.
 */
export function SlideButton({ title, onConfirm, color = '#FFC800', textColor = '#0E1525', icon = 'chevron-forward' }: {
  title: string; onConfirm: () => void; color?: string; textColor?: string; icon?: keyof typeof Ionicons.glyphMap;
}) {
  const [x] = useState(() => new Animated.Value(0));
  const [max, setMax] = useState(0);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(max, g.dx))),
    onPanResponderRelease: (_, g) => {
      if (max > 0 && g.dx >= max * 0.82) {
        Animated.timing(x, { toValue: max, duration: 120, useNativeDriver: false }).start(() => {
          haptic.success();
          onConfirm();
          setTimeout(() => x.setValue(0), 350);
        });
      } else {
        Animated.spring(x, { toValue: 0, useNativeDriver: false, friction: 6 }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(),
  }), [x, max, onConfirm]);

  const onLayout = (e: LayoutChangeEvent) => setMax(Math.max(0, e.nativeEvent.layout.width - KNOB - PAD * 2));
  const fade = x.interpolate({ inputRange: [0, 120], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View onLayout={onLayout} style={[styles.track, { backgroundColor: color }]} accessibilityRole="adjustable" accessibilityLabel={title}
      accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={onConfirm}>
      <Animated.View pointerEvents="none" style={[styles.fill, { width: Animated.add(x, KNOB + PAD * 2), backgroundColor: 'rgba(0,0,0,0.08)' }]} />
      <Animated.View pointerEvents="none" style={[styles.labelWrap, { opacity: fade }]}>
        <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>{title}</Text>
        <Ionicons name="chevron-forward" size={16} color={textColor} style={{ opacity: 0.35, marginLeft: 4 }} />
        <Ionicons name="chevron-forward" size={16} color={textColor} style={{ opacity: 0.6, marginLeft: -8 }} />
      </Animated.View>
      <Animated.View {...pan.panHandlers} testID="slide-knob" style={[styles.knob, { transform: [{ translateX: x }] }]}>
        <Ionicons name={icon} size={26} color="#0E1525" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: KNOB + PAD * 2, borderRadius: (KNOB + PAD * 2) / 2, justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: (KNOB + PAD * 2) / 2 },
  labelWrap: { position: 'absolute', left: KNOB + PAD * 2, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: F.heavy, fontSize: 17, letterSpacing: -0.2 },
  knob: { position: 'absolute', left: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
});
