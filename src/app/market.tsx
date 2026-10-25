import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarketCard, MarketVisual } from '@/components/market-ui';
import { StatusBadge } from '@/components/platform-ui';
import { ActionSheet, Card, EmptyState, NavButton, Row, Screen, Txt, type IconName } from '@/components/ui';
import { MARKET_KINDS, type MarketItem, type MarketKind } from '@/lib/platform-data';
import { sectorOf, usd, usePlatform } from '@/lib/platform';
import { SECTION_ART } from '@/lib/section-art';
import { SECTOR_ART } from '@/lib/sector-art';
import { haptic, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';

type Sort = 'popular' | 'cheap' | 'expensive' | 'rating' | 'new';
const SORTS: { id: Sort; label: string; icon: IconName }[] = [
  { id: 'popular', label: 'Ommabop', icon: 'flame-outline' },
  { id: 'cheap', label: 'Avval arzonlari', icon: 'arrow-down-outline' },
  { id: 'expensive', label: 'Avval qimmatlari', icon: 'arrow-up-outline' },
  { id: 'rating', label: 'Yuqori baholangan', icon: 'star-outline' },
  { id: 'new', label: 'Yangilari', icon: 'time-outline' },
];

const sorter: Record<Sort, (a: MarketItem, b: MarketItem) => number> = {
  popular: (a, b) => (b.sold ?? 0) - (a.sold ?? 0),
  cheap: (a, b) => a.price - b.price,
  expensive: (a, b) => b.price - a.price,
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviews ?? 0) - (a.reviews ?? 0),
  new: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

export default function Market() {
  const params = useLocalSearchParams<{ tab?: string }>();
  if (params.tab === 'mine') return <MyListings />;
  return <Storefront />;
}

/* ---------- Bozor ---------- */

function Storefront() {
  const { colors: c, dark } = useStore();
  const insets = useSafeAreaInsets();
  const p = usePlatform();
  const [q, setQ] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [kind, setKind] = useState<MarketKind | null>(null);
  const [verified, setVerified] = useState(false);
  const [sale, setSale] = useState(false);
  const [sort, setSort] = useState<Sort>('popular');
  const [sortOpen, setSortOpen] = useState(false);

  // Bozorda bor sohalar — kategoriya plitkalari uchun
  const sectors = useMemo(() => [...new Set(p.publicMarket.map(m => m.sector))].map(sectorOf), [p.publicMarket]);

  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    return p.publicMarket
      .filter(m => (!sector || m.sector === sector) && (!kind || m.kind === kind) && (!verified || m.sellerVerified) && (!sale || (m.oldPrice ?? 0) > m.price))
      .filter(m => !t || [m.title, m.sellerName, m.desc, sectorOf(m.sector).name].some(x => x.toLowerCase().includes(t)))
      .sort(sorter[sort]);
  }, [p.publicMarket, q, sector, kind, verified, sale, sort]);

  const rows: MarketItem[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  const sortItem = SORTS.find(x => x.id === sort)!;
  const filtered = !!(sector || kind || verified || sale || q);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Yuqori panel: orqaga, qidiruv, savat */}
      <View style={[styles.top, { paddingTop: insets.top + 8, backgroundColor: c.bg }]}>
        <NavButton icon="chevron-back" label="Orqaga" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.brand }]}>
          <Ionicons name="search" size={18} color={c.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="YUMS Market'da qidirish"
            placeholderTextColor={c.faint}
            returnKeyType="search"
            style={[styles.searchInput, { color: c.text }]}
          />
          {q ? <Pressable hitSlop={8} onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color={c.faint} /></Pressable> : null}
        </View>
        <CartIcon />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Kategoriyalar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          <CatTile label="Hammasi" art={SECTION_ART.market} active={!sector} onPress={() => setSector(null)} />
          {sectors.map(s => (
            <CatTile key={s.id} label={s.name.split(' ')[0]} art={SECTOR_ART[s.id]} active={sector === s.id} onPress={() => setSector(sector === s.id ? null : s.id)} />
          ))}
        </ScrollView>

        {/* Aksiya bannerlari */}
        {!filtered && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={300 + 10} decelerationRate="fast" contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            <Promo
              colors={['#F2295B', '#FF7A45']}
              kicker="CHEGIRMALAR"
              title={'−30% gacha\nhaftaning eng yaxshisi'}
              art={SECTOR_ART.ecommerce}
              onPress={() => { setSale(true); setSort('cheap'); }}
            />
            <Promo
              colors={['#0E9F6E', '#0B7A55']}
              kicker="XAVFSIZ BITIM"
              title={'Tekshirilgan sotuvchilar\nva shartnoma bilan'}
              art={SECTOR_ART.insurance}
              onPress={() => setVerified(true)}
            />
            <Promo
              colors={['#1B1F2A', '#3A2F00']}
              kicker="SOTUVCHILAR UCHUN"
              title={"E'lon joylashtirish —\nbepul, 86 mamlakat"}
              art={SECTOR_ART.startup}
              onPress={() => router.push('/market/new')}
            />
          </ScrollView>
        )}

        {/* Filtrlar va saralash */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Pill icon={sortItem.icon} label={sortItem.label} chevron onPress={() => setSortOpen(true)} />
          {MARKET_KINDS.map(k => <Pill key={k.id} icon={k.icon} label={k.name} active={kind === k.id} onPress={() => setKind(kind === k.id ? null : k.id)} />)}
          <Pill icon="pricetag-outline" label="Chegirmali" active={sale} onPress={() => setSale(v => !v)} />
          <Pill icon="shield-checkmark-outline" label="Tasdiqlangan" active={verified} onPress={() => setVerified(v => !v)} />
        </ScrollView>

        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: -4 }}>
          <Txt v="h2">{sector ? sectorOf(sector).name : q ? 'Qidiruv natijalari' : 'Siz uchun'}</Txt>
          <Txt v="small" faint>{items.length} ta</Txt>
        </Row>

        <View style={{ paddingHorizontal: 16, gap: 22 }}>
          {rows.map((r, i) => (
            <Row key={i} gap={12} style={{ alignItems: 'stretch' }}>
              {r.map(m => <MarketCard key={m.id} m={m} style={{ flex: 1 }} />)}
              {r.length === 1 && <View style={{ flex: 1 }} />}
            </Row>
          ))}
          {!items.length && (
            <EmptyState icon="search-outline" title="Hech narsa topilmadi" sub="Filtrlarni o'zgartirib ko'ring" action="Filtrlarni tozalash"
              onAction={() => { setQ(''); setSector(null); setKind(null); setVerified(false); setSale(false); }} />
          )}
        </View>

        {/* Sotuvchi kabineti */}
        <Pressable onPress={() => router.push({ pathname: '/market', params: { tab: 'mine' } })} style={({ pressed }) => [styles.seller, { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 }]}>
          <View style={[styles.sellerIco, { backgroundColor: dark ? c.brandSoft : '#FFF6D1' }]}><Ionicons name="storefront" size={20} color={c.brandDeep} /></View>
          <View style={{ flex: 1 }}>
            <Txt v="h3">Sotuvchi kabineti</Txt>
            <Txt v="small" muted>Mening e'lonlarim · {p.myMarket.length}</Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.faint} />
        </Pressable>
        <Txt v="tiny" faint style={{ textAlign: 'center', paddingHorizontal: 24 }}>Faqat qonuniy va ruxsat etilgan tovar va xizmatlar. Taqiqlangan e'lonlar o'chiriladi.</Txt>
      </ScrollView>

      <ActionSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        header={<><Ionicons name="swap-vertical" size={22} color={c.text} /><Txt v="h3">Saralash</Txt></>}
        groups={[SORTS.map(s => ({ key: s.id, icon: s.icon, title: s.label, sub: s.id === sort ? 'Tanlangan' : undefined, color: s.id === sort ? c.ok : c.accent, onPress: () => { setSort(s.id); setSortOpen(false); } }))]}
      />
    </View>
  );
}

function CartIcon() {
  const { colors: c } = useStore();
  const { cartCount } = usePlatform();
  return (
    <Pressable onPress={() => { haptic.tap(); router.push('/cart'); }} accessibilityLabel={`Savat, ${cartCount} ta`} hitSlop={6}
      style={({ pressed }) => [styles.cartIcon, { backgroundColor: c.surface, borderColor: c.line, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
      <Ionicons name="cart-outline" size={22} color={c.text} />
      {cartCount > 0 && <View style={[styles.cartBadge, { borderColor: c.bg }]}><Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
    </Pressable>
  );
}

function CatTile({ label, art, active, onPress }: { label: string; art?: number; active: boolean; onPress: () => void }) {
  const { colors: c, dark } = useStore();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => [styles.cat, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.catImg, { backgroundColor: dark ? c.surface : '#FFFFFF', borderColor: active ? c.brand : 'transparent' }]}>
        {art ? <Image source={art} style={{ width: 46, height: 46 }} contentFit="contain" /> : null}
      </View>
      <Text numberOfLines={1} style={[styles.catText, { color: active ? c.text : c.muted, fontFamily: active ? F.bold : F.semi }]}>{label}</Text>
    </Pressable>
  );
}

function Promo({ colors, kicker, title, art, onPress }: { colors: [string, string]; kicker: string; title: string; art?: number; onPress: () => void }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.promo}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.promoKicker}>{kicker}</Text>
          <Text style={styles.promoTitle}>{title}</Text>
          <View style={styles.promoCta}><Text style={styles.promoCtaText}>Ko'rish</Text><Ionicons name="arrow-forward" size={13} color="#0E1525" /></View>
        </View>
        {art ? <Image source={art} style={styles.promoArt} contentFit="contain" /> : null}
      </LinearGradient>
    </Pressable>
  );
}

function Pill({ icon, label, active, chevron, onPress }: { icon: IconName; label: string; active?: boolean; chevron?: boolean; onPress: () => void }) {
  const { colors: c } = useStore();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => [styles.pill, { backgroundColor: active ? c.ink : c.surface, borderColor: active ? c.ink : c.line, opacity: pressed ? 0.8 : 1 }]}>
      <Ionicons name={icon} size={15} color={active ? c.bg : c.text} />
      <Text style={[styles.pillText, { color: active ? c.bg : c.text }]}>{label}</Text>
      {chevron && <Ionicons name="chevron-down" size={14} color={c.muted} />}
    </Pressable>
  );
}

/* ---------- Mening e'lonlarim ---------- */

function MyListings() {
  const p = usePlatform();
  return (
    <Screen title="Mening e'lonlarim" subtitle="YUMS Market · sotuvchi kabineti">
      <Pressable onPress={() => router.push('/market/new')}>
        <LinearGradient colors={['#FFD84D', '#FFC800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.newAd}>
          <Ionicons name="add-circle" size={26} color="#0E1525" />
          <View style={{ flex: 1 }}>
            <Text style={styles.newAdTitle}>Yangi e'lon joylashtirish</Text>
            <Text style={styles.newAdSub}>Bepul · moderatsiyadan so'ng 86 mamlakatda ko'rinadi</Text>
          </View>
        </LinearGradient>
      </Pressable>
      {p.myMarket.length ? p.myMarket.map(m => (
        <Card key={m.id} onPress={() => router.push({ pathname: '/market/[id]', params: { id: m.id } })}>
          <Row>
            <View style={styles.thumb}><MarketVisual m={m} icon={22} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="h3" numberOfLines={1}>{m.title}</Txt>
              <Txt v="small" muted>{usd(m.price)}{m.unit ? ` / ${m.unit}` : ''}</Txt>
            </View>
            <StatusBadge status={m.status} />
          </Row>
        </Card>
      )) : (
        <EmptyState icon="pricetags-outline" title="E'lonlaringiz yo'q" sub="Tovar, raqamli mahsulot yoki xizmatingizni butun dunyoga taklif qiling" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  search: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 14, borderWidth: 2, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: F.medium, paddingVertical: 0 },
  cartIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  cartBadge: { position: 'absolute', top: -3, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#F2295B', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  cartBadgeText: { color: '#fff', fontSize: 10.5, fontFamily: F.heavy },
  cats: { gap: 12, paddingHorizontal: 16, paddingTop: 2 },
  cat: { width: 68, alignItems: 'center', gap: 6 },
  catImg: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  catText: { fontSize: 11.5, maxWidth: 68 },
  promo: { width: 300, height: 132, borderRadius: radius.l, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8, overflow: 'hidden' },
  promoKicker: { color: 'rgba(255,255,255,0.8)', fontFamily: F.heavy, fontSize: 10, letterSpacing: 1.2 },
  promoTitle: { color: '#fff', fontFamily: F.display, fontSize: 16.5, lineHeight: 21, letterSpacing: -0.4 },
  promoCta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 10, height: 26, borderRadius: 13, marginTop: 2 },
  promoCtaText: { color: '#0E1525', fontFamily: F.bold, fontSize: 12 },
  promoArt: { width: 104, height: 104 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  pillText: { fontFamily: F.semi, fontSize: 13 },
  seller: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  sellerIco: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 64, height: 48, borderRadius: 12, overflow: 'hidden' },
  newAd: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.l },
  newAdTitle: { color: '#0E1525', fontFamily: F.bold, fontSize: 15.5 },
  newAdSub: { color: 'rgba(14,21,37,0.7)', fontFamily: F.semi, fontSize: 12.5 },
});
