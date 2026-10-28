import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

/** Kartalar uchun fon rasmlari (chap tomoni to'q — matn uchun) */
export const CARD_ART = {
  profile: require('@/assets/menu/card-profile.webp'),
  balance: require('@/assets/menu/card-balance.webp'),
};

/** Karta orqasidagi rasm: o'ng tomondagi tafsilotlar ko'rinadi, chapdagi matn o'qilishi uchun qorong'ilashtiriladi */
export function CardBg({ source }: { source: number }) {
  return (
    <>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" />
      <LinearGradient pointerEvents="none" colors={['rgba(8,13,28,0.85)', 'rgba(8,13,28,0.6)', 'rgba(8,13,28,0)']} locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </>
  );
}
