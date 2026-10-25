// YUMS Market: mahsulot kartasi, narx, reyting va savat tugmalari (Yandex Market uslubida)
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MarketItem } from '@/lib/platform-data';
import { sectorOf, short, usd, usePlatform } from '@/lib/platform';
import { SECTOR_ART } from '@/lib/sector-art';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import { toast } from './toast';
import { Txt, Verified, alpha } from './ui';

export const STAR = '#FFB800';
export const SALE = '#F2295B';

/** Chegirma foizi (butun son) yoki null */
export const discountOf = (m: Pick<MarketItem, 'price' | 'oldPrice'>) =>
  m.oldPrice && m.oldPrice > m.price ? Math.round((1 - m.price / m.oldPrice) * 100) : null;

/** Yetkazish haqida qisqa yozuv */
export const deliveryShort = (m: Pick<MarketItem, 'kind' | 'delivery'>) =>
  m.kind === 'digital' ? 'Raqamli · darhol' : m.kind === 'service' ? 'Xizmat · kelishuv bo\'yicha' : (m.delivery ?? 'Yetkazish kelishiladi');

/** E'lon rasmi; rasm bo'lmasa soha rangidagi fon va 3D belgi. Ota-ona o'lchamini to'ldiradi */
export function MarketVisual({ m, icon = 40, plain }: { m: Pick<MarketItem, 'image' | 'sector' | 'title'>; icon?: number; plain?: boolean }) {
  const s = sectorOf(m.sector);
  if (m.image) return <Image source={{ uri: m.image }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={m.title} />;
  const art = SECTOR_ART[s.id]
    ? <Image source={SECTOR_ART[s.id]} style={{ width: icon * 1.6, height: icon * 1.6 }} contentFit="contain" accessibilityLabel={m.title} />
    : <Ionicons name={s.icon} size={icon} color={s.color} />;
  if (plain) return <View style={[StyleSheet.absoluteFill, styles.center]}>{art}</View>;
  return (
    <LinearGradient colors={[alpha(s.color, 0.2), alpha(s.color, 0.06)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
      {art}
    </LinearGradient>
  );
}

/** ★ 4.8 (126) */
export function Stars({ m, size = 12.5 }: { m: Pick<MarketItem, 'rating' | 'reviews'>; size?: number }) {
  const { colors: c } = useStore();
  if (!m.rating) return <Txt v="tiny" style={{ color: c.ok, fontFamily: F.bold }}>Yangi</Txt>;
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={size} color={STAR} />
      <Text style={[styles.rating, { color: c.text, fontSize: size }]}>{m.rating.toFixed(1)}</Text>
      {m.reviews ? <Text style={[styles.reviews, { color: c.faint, fontSize: size - 0.5 }]}>({short(m.reviews)})</Text> : null}
    </View>
  );
}

/** Yurakcha — sevimlilarga qo'shish */
export function HeartButton({ id, size = 22, style }: { id: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useStore();
  const { isFav, toggleFav } = usePlatform();
  const k = 'market:' + id;
  const on = isFav(k);
  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}
      onPress={() => { haptic.tap(); const v = toggleFav(k); toast(v ? 'Sevimlilarga qo\'shildi' : 'Sevimlilardan olib tashlandi', v ? 'heart' : 'heart-outline'); }}
      style={style}>
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={size} color={on ? SALE : c.faint} />
    </Pressable>
  );
}

/** Savat tugmasi: bo'sh bo'lsa «Savatga», bo'lsa − son + */
export function CartControl({ m, big, style }: { m: MarketItem; big?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useStore();
  const { cartQty, setCartQty } = usePlatform();
  const qty = cartQty(m.id);
  const h = big ? 52 : 36;
  if (!qty) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => { haptic.tap(); setCartQty(m.id, 1); toast('Savatga qo\'shildi', 'cart'); }}
        style={({ pressed }) => [styles.cartBtn, { height: h, borderRadius: big ? 16 : 12, backgroundColor: c.brand, opacity: pressed ? 0.85 : 1 }, style]}>
        {big && <Ionicons name="cart-outline" size={19} color={c.brandText} />}
        <Text style={[styles.cartText, { color: c.brandText, fontSize: big ? 15.5 : 13.5 }]}>{big ? 'Savatga qo\'shish' : 'Savatga'}</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.stepper, { height: h, borderRadius: big ? 16 : 12, backgroundColor: c.brandSoft }, style]}>
      <Pressable accessibilityLabel="Kamaytirish" hitSlop={6} onPress={() => { haptic.tap(); setCartQty(m.id, qty - 1); }} style={[styles.stepBtn, { width: h }]}>
        <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={big ? 20 : 17} color={c.text} />
      </Pressable>
      <Text style={[styles.qty, { color: c.text, fontSize: big ? 16 : 14 }]}>{qty}</Text>
      <Pressable accessibilityLabel="Ko'paytirish" hitSlop={6} onPress={() => { haptic.tap(); setCartQty(m.id, qty + 1); }} style={[styles.stepBtn, { width: h }]}>
        <Ionicons name="add" size={big ? 21 : 18} color={c.text} />
      </Pressable>
    </View>
  );
}

/** Narx: katta qalin narx, birlik, eski narx chizilgan */
export function PriceLine({ m, size = 18 }: { m: Pick<MarketItem, 'price' | 'oldPrice' | 'unit'>; size?: number }) {
  const { colors: c } = useStore();
  const off = discountOf(m);
  return (
    <View style={[styles.row, { flexWrap: 'wrap', columnGap: 6, alignItems: 'baseline' }]}>
      <Text style={[styles.price, { color: off ? SALE : c.text, fontSize: size }]}>{usd(m.price)}</Text>
      {m.unit ? <Text style={[styles.unit, { color: c.faint, fontSize: size * 0.68 }]}>/ {m.unit}</Text> : null}
      {off ? <Text style={[styles.old, { color: c.faint, fontSize: size * 0.68 }]}>{usd(m.oldPrice!)}</Text> : null}
    </View>
  );
}

/** Mahsulot kartasi (2 ustunli to'r uchun) */
export function MarketCard({ m, style }: { m: MarketItem; style?: StyleProp<ViewStyle> }) {
  const { colors: c, dark } = useStore();
  const off = discountOf(m);
  const open = () => { haptic.tap(); router.push({ pathname: '/market/[id]', params: { id: m.id } }); };
  return (
    <View style={[{ gap: 8 }, style]}>
      <Pressable onPress={open} style={({ pressed }) => [styles.img, { backgroundColor: dark ? c.surface : '#FFFFFF', opacity: pressed ? 0.9 : 1 }]}>
        <MarketVisual m={m} icon={44} plain />
        {off ? <View style={styles.sale}><Text style={styles.saleText}>−{off}%</Text></View> : null}
        <HeartButton id={m.id} style={styles.heart} />
      </Pressable>
      <Pressable onPress={open} style={{ gap: 4, flex: 1 }}>
        <PriceLine m={m} />
        <Txt v="small" numberOfLines={2} style={{ minHeight: 36, lineHeight: 18 }}>{m.title}</Txt>
        <Stars m={m} />
        <View style={styles.row}>
          <Ionicons name={m.kind === 'goods' ? 'cube-outline' : m.kind === 'digital' ? 'flash-outline' : 'briefcase-outline'} size={12} color={c.muted} />
          <Txt v="tiny" muted numberOfLines={1} style={{ flexShrink: 1 }}>{deliveryShort(m)}</Txt>
        </View>
        <View style={styles.row}>
          <Txt v="tiny" faint numberOfLines={1} style={{ flexShrink: 1 }}>{m.sellerName}</Txt>
          {m.sellerVerified && <Verified size={11} />}
        </View>
      </Pressable>
      <CartControl m={m} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  img: { aspectRatio: 1, borderRadius: 18, overflow: 'hidden' },
  sale: { position: 'absolute', left: 8, top: 8, backgroundColor: SALE, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  saleText: { color: '#fff', fontFamily: F.heavy, fontSize: 11.5 },
  heart: { position: 'absolute', right: 8, top: 8 },
  rating: { fontFamily: F.bold },
  reviews: { fontFamily: F.semi },
  price: { fontFamily: F.heavy, letterSpacing: -0.4 },
  unit: { fontFamily: F.semi },
  old: { fontFamily: F.semi, textDecorationLine: 'line-through' },
  cartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  cartText: { fontFamily: F.bold },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: F.heavy, minWidth: 24, textAlign: 'center' },
});
