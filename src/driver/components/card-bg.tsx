import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useStore } from '@/lib/store';

type CardArt = { dark: number; light: number };

/** Kartalar uchun fon rasmlari: qorong'i mavzuda tungi, yorug' mavzuda kunduzgi (chap tomoni bo'sh — matn uchun) */
export const CARD_ART: Record<'profile' | 'balance', CardArt> = {
  profile: { dark: require('@/assets/menu/card-profile.webp'), light: require('@/assets/menu/card-profile-light.webp') },
  balance: { dark: require('@/assets/menu/card-balance.webp'), light: require('@/assets/menu/card-balance-light.webp') },
};

const INK = {
  dark: {
    base: '#0B1224', shade: '8,13,28', shadeAlpha: [0.85, 0.6],
    text: '#fff', sub: 'rgba(255,255,255,0.72)', faint: 'rgba(255,255,255,0.55)', danger: '#FF8A80',
    glass: 'rgba(8,13,28,0.55)', plateBg: 'rgba(8,13,28,0.35)',
    btn: '#FFC800', btnText: '#0E1525', btnShadow: '0 4px 14px rgba(0,0,0,0.45)', btnOff: '#2A3348', btnOffText: 'rgba(255,255,255,0.55)',
  },
  light: {
    base: '#F7F8FB', shade: '247,248,251', shadeAlpha: [0.8, 0.45],
    text: '#0E1525', sub: 'rgba(14,21,37,0.66)', faint: 'rgba(14,21,37,0.5)', danger: '#D92D20',
    glass: 'rgba(255,255,255,0.75)', plateBg: 'rgba(255,255,255,0.6)',
    btn: '#0E1525', btnText: '#FFC800', btnShadow: '0 4px 12px rgba(14,21,37,0.25)', btnOff: '#E9ECF2', btnOffText: 'rgba(14,21,37,0.4)',
  },
};

/** Rasmli karta ustidagi matn va tugma ranglari (joriy mavzuga mos) */
export function useCardInk() {
  return INK[useStore().dark ? 'dark' : 'light'];
}

/** Karta orqasidagi rasm: o'ng tomondagi tafsilotlar ko'rinadi, chapdagi matn o'qilishi uchun soya beriladi */
export function CardBg({ art }: { art: CardArt }) {
  const { dark } = useStore();
  const ink = INK[dark ? 'dark' : 'light'];
  const [a0, a1] = ink.shadeAlpha;
  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: ink.base }]} />
      <Image source={dark ? art.dark : art.light} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" />
      <LinearGradient pointerEvents="none" colors={[`rgba(${ink.shade},${a0})`, `rgba(${ink.shade},${a1})`, `rgba(${ink.shade},0)`]} locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </>
  );
}
