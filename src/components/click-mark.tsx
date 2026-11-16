// Click to'lov tizimining belgisi (click.uz'dagi rasmiy logotipdan) — oq doira ichida, har qanday fonda ko'rinadi
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '@/lib/store';
import { F } from '@/lib/theme';

export const CLICK_BLUE = '#0065FF';
const MARK = require('@/assets/logos/click-mark.webp');

export function ClickMark({ size = 40, round = 14 }: { size?: number; round?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: round, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <Image source={MARK} style={{ width: size * 0.62, height: size * 0.62 }} contentFit="contain" accessibilityLabel="Click" />
    </View>
  );
}

/** Click ranglaridagi to'lov tugmasi: ko'k fon, oq doirada Click belgisi */
export function ClickButton({ title, onPress, disabled, busy }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled || busy}
      onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => [styles.button, { opacity: disabled ? 0.55 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <ClickMark size={34} round={17} />
      <Text style={styles.text}>{title}</Text>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 18, paddingHorizontal: 16, backgroundColor: CLICK_BLUE },
  text: { color: '#FFFFFF', fontFamily: F.bold, fontSize: 16 },
});
