// Ism-familiya bitta qatorda navbat bilan: avval ism, ~2.5 soniyadan keyin familiya, keyin yana ism.
// Almashganda eski so'z yuqoriga chiqib yo'qoladi, yangisi pastdan chiqadi. Bitta so'zli nom bir qatorda
// (sig'masa shrift kichrayadi — so'z o'rtasidan bo'linmaydi); «harakatni kamaytirish» yoqilganda to'liq nom
// ikki qatorgacha oddiy ko'rinadi. Telefonda shrift kattalashtirilgan bo'lsa ham kartochkadan oshmaydi.
import { useEffect, useMemo, useState } from 'react';
import { Animated, Platform, View } from 'react-native';

import { Txt } from '@/components/ui';
import { useReduceMotion } from '@/lib/motion';

const ND = Platform.OS !== 'web';
const HOLD_MS = 2600;
const SLIDE = 14;
const MAX_SCALE = 1.2;

export function RotatingName({ name }: { name: string }) {
  const parts = useMemo(() => name.trim().split(/\s+/).filter(Boolean), [name]);
  const reduce = useReduceMotion();
  const [index, setIndex] = useState(0);
  // 0 — joyida; 1 — yuqoriga chiqib ketgan; -1 — pastda, chiqishga tayyor
  const [shift] = useState(() => new Animated.Value(0));
  const rotate = parts.length > 1 && !reduce;

  useEffect(() => {
    // nom o'zgarsa yoki animatsiya yarmida to'xtagan bo'lsa ham — so'z joyida, to'liq ko'rinadi
    shift.setValue(0);
    if (!rotate) return;
    let alive = true;
    const timer = setInterval(() => {
      Animated.timing(shift, { toValue: 1, duration: 220, useNativeDriver: ND }).start(({ finished }) => {
        if (!alive || !finished) return;
        setIndex(i => (i + 1) % parts.length);
        shift.setValue(-1);
        Animated.spring(shift, { toValue: 0, useNativeDriver: ND, friction: 8, tension: 90 }).start();
      });
    }, HOLD_MS);
    return () => { alive = false; clearInterval(timer); shift.stopAnimation(); };
  }, [rotate, parts.length, shift]);

  if (!rotate) {
    return (
      <Txt v="h2" numberOfLines={parts.length > 1 ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={MAX_SCALE}>
        {name}
      </Txt>
    );
  }

  return (
    <View style={{ overflow: 'hidden' }} accessible accessibilityRole="header" accessibilityLabel={name}>
      <Animated.View
        style={{
          opacity: shift.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
          transform: [{ translateY: shift.interpolate({ inputRange: [-1, 0, 1], outputRange: [SLIDE, 0, -SLIDE] }) }],
        }}>
        <Txt v="h2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={MAX_SCALE}>{parts[index % parts.length]}</Txt>
      </Animated.View>
    </View>
  );
}
