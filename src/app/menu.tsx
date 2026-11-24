import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RotatingName } from '@/components/rotating-name';
import { toast } from '@/components/toast';
import { Avatar, Card, DEFAULT_AVATAR, ListItem, Screen, SectionTitle, Txt } from '@/components/ui';
import { FINANCE_FEATURES } from '@/lib/distribution';
import { som } from '@/lib/geo';
import { SECTION_ART } from '@/lib/section-art';
import { SECTOR_ART } from '@/lib/sector-art';
import { haptic, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';
import { flipRTL, tr } from '@/lib/i18n';

// Bo'limlarning 3D belgilari (haydovchi ilovasi menyusidagi bilan bir xil uslub)
const ART = {
  history: require('@/assets/menu/car.webp'),
  safety: require('@/assets/menu/safety.webp'),
  support: require('@/assets/menu/support.webp'),
  settings: require('@/assets/menu/settings.webp'),
};

// telefonda shrift kattalashtirilgan bo'lsa ham kartochkalar buzilmaydi
const MAX_SCALE = 1.2;

/** +998901234567 → +998 90 123 45 67 (boshqa raqamlar o'z holicha) */
const prettyPhone = (phone?: string) => {
  const m = phone?.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone ?? '';
};

export default function Menu() {
  const { colors: c, user, balance, rides, logout } = useStore();
  const done = rides.filter(r => r.status === 'done');
  const km = done.reduce((s, r) => s + r.distanceKm, 0);

  return (
    <Screen title="YUMS Taxi" subtitle={tr("Safarlar, to'lovlar va sozlamalar")}>
      {/* Profil: rasm, ism-familiya (navbat bilan), telefon va reyting — reyting ism ostida turadi,
          kenglik ism va raqamga qoladi */}
      <Card style={styles.profile}>
        <View style={[styles.avatarRing, { borderColor: c.brand }]}>
          <Avatar name={user?.name ?? '?'} size={58} uri={user?.avatar} fallback={DEFAULT_AVATAR} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <RotatingName name={user?.name ?? ''} />
          <View style={styles.phoneRow}>
            <Ionicons name="call" size={13} color={c.muted} />
            <Text style={[styles.phone, { color: c.muted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={MAX_SCALE}>{prettyPhone(user?.phone)}</Text>
          </View>
          <View style={[styles.rating, { backgroundColor: c.brandSoft }]}>
            <Ionicons name="star" size={13} color="#F5A524" />
            <Text style={[styles.ratingValue, { color: c.text }]} maxFontSizeMultiplier={MAX_SCALE}>{(user?.rating ?? 5).toFixed(1)}</Text>
            <Text style={[styles.ratingLabel, { color: c.muted }]} maxFontSizeMultiplier={MAX_SCALE}>{tr('reyting')}</Text>
          </View>
        </View>
      </Card>

      {/* Balans va safarlar (Play yig'ilishida balans yo'q — faqat safarlar) */}
      <View style={styles.stats}>
        {FINANCE_FEATURES && <Pressable style={({ pressed }) => [{ flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]} onPress={() => { haptic.tap(); router.push('/payment'); }} accessibilityRole="button">
          <LinearGradient colors={['#FFE27A', '#FFC800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balance}>
            <View style={styles.tileHead}>
              <View style={styles.tileIconDark}><Ionicons name="wallet" size={16} color="#FFC800" /></View>
              <Text style={styles.balanceLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={MAX_SCALE}>{tr('YUMS balans')}</Text>
            </View>
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={MAX_SCALE}>{som(balance)}</Text>
            <View style={styles.cashback}>
              <Ionicons name="gift" size={12} color="#0E1525" />
              <Text style={styles.cashbackText} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{tr('Har safardan 3% keshbek')}</Text>
            </View>
          </LinearGradient>
        </Pressable>}
        <Pressable style={({ pressed }) => [{ flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]} onPress={() => { haptic.tap(); router.push('/history'); }} accessibilityRole="button">
          <View style={[styles.trips, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={styles.tileHead}>
              <View style={[styles.tileIcon, { backgroundColor: c.accentSoft }]}><Ionicons name="car-sport" size={16} color={c.accent} /></View>
              <Text style={[styles.tripsLabel, { color: c.muted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={MAX_SCALE}>{tr('Safarlar')}</Text>
            </View>
            <Text style={[styles.tripsValue, { color: c.text }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{done.length}</Text>
            <View style={styles.kmRow}>
              <Ionicons name="navigate" size={12} color={c.faint} />
              <Text style={[styles.km, { color: c.muted }]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE}>{tr("{v2} km yo'l bosildi", { v2: km.toFixed(0) })}</Text>
              <Ionicons name="chevron-forward" size={14} color={c.faint} style={flipRTL()} />
            </View>
          </View>
        </Pressable>
      </View>

      <SectionTitle>{tr('Safar')}</SectionTitle>
      <Card style={styles.list}>
        <ListItem icon="time-outline" art={ART.history} title={tr('Safarlar tarixi')} sub={done.length ? tr('{n} ta safar', { n: done.length }) : tr("Hali safar yo'q")} onPress={() => router.push('/history')} />
        <ListItem icon="card-outline" art={SECTOR_ART.finance} title={tr("To'lov usullari")} sub={FINANCE_FEATURES ? tr('Kartalar, balans, promokodlar') : tr('Kartalar va promokodlar')} onPress={() => router.push('/payment')} />
        <ListItem icon="bookmark-outline" art={SECTION_ART.world} title={tr('Manzillarim')} sub={tr('Uy, ish')} onPress={() => router.push('/places')} />
        <ListItem icon="shield-checkmark-outline" art={ART.safety} title={tr('Xavfsizlik')} sub={tr("SOS va ishonchli kontaktlar")} onPress={() => router.push('/safety')} />
      </Card>

      <SectionTitle>{tr('Yordam va sozlamalar')}</SectionTitle>
      <Card style={styles.list}>
        <ListItem icon="help-buoy-outline" art={ART.support} title={tr('Yordam')} sub={tr("24/7 qo'llab-quvvatlash")} onPress={() => router.push('/support')} />
        <ListItem icon="settings-outline" art={ART.settings} title={tr('Sozlamalar')} sub={tr('Til, mavzu va bildirishnomalar')} onPress={() => router.push('/settings')} />
        <ListItem icon="car-sport-outline" art={SECTION_ART.taxi} title={tr("Haydovchi bo'lish")} sub={tr('YUMS Driver bilan daromad qiling')} onPress={() => toast(tr('YUMS Driver ilovasi tez orada'), 'car-sport')} />
      </Card>

      <Card style={styles.list}>
        <ListItem icon="grid-outline" art={SECTION_ART.project} title={tr('YUMS platformasi')} sub={FINANCE_FEATURES ? tr('Loyihalar, biznes, investitsiya, bozor') : tr('Loyihalar, biznes, bozor')} onPress={() => router.dismissTo('/')} />
        <ListItem icon="log-out-outline" title={tr('Chiqish')} danger onPress={() => { logout(); router.replace('/login'); }} />
      </Card>

      <Txt v="tiny" faint style={styles.footer}>{tr("YUMS Taxi 1.0 · YUMS xalqaro raqamli platformasining transport yo'nalishi")}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarRing: { padding: 2, borderRadius: 26, borderWidth: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  phone: { flexShrink: 1, fontFamily: F.semi, fontSize: 13.5, letterSpacing: 0.2, fontVariant: ['tabular-nums'] },
  rating: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, marginTop: 2 },
  ratingValue: { fontFamily: F.bold, fontSize: 13 },
  ratingLabel: { fontFamily: F.semi, fontSize: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  balance: { flex: 1, borderRadius: radius.l, padding: 14, gap: 6, minHeight: 128 },
  trips: { flex: 1, borderRadius: radius.l, padding: 14, gap: 6, minHeight: 128, borderWidth: StyleSheet.hairlineWidth },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  tileIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileIconDark: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1525' },
  balanceLabel: { flexShrink: 1, color: 'rgba(14,21,37,0.72)', fontFamily: F.bold, fontSize: 13 },
  balanceValue: { color: '#0E1525', fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 },
  // yozuv uzun bo'lsa kartochka ichida ikkinchi qatorga o'tadi, chetidan chiqmaydi
  cashback: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'rgba(255,255,255,0.45)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  cashbackText: { flexShrink: 1, color: '#0E1525', fontFamily: F.semi, fontSize: 11.5, lineHeight: 15 },
  tripsLabel: { flexShrink: 1, fontFamily: F.bold, fontSize: 13 },
  tripsValue: { fontFamily: F.display, fontSize: 30, letterSpacing: -0.8, lineHeight: 34 },
  kmRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  km: { flex: 1, fontFamily: F.semi, fontSize: 12 },
  list: { padding: 6 },
  footer: { textAlign: 'center', marginTop: 4, lineHeight: 16 },
});
