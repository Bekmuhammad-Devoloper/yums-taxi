import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartControl, MarketCard, MarketVisual, PriceLine, SALE, STAR, deliveryShort, discountOf } from '@/components/market-ui';
import { Logo, ReportSheet, SectorGlyph, StatusBadge } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { ActionSheet, Card, EmptyState, Flag, NavButton, NavGroup, Row, Screen, Txt, Verified, alpha, type IconName } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { confirm } from '@/lib/confirm';
import { MARKET_KINDS } from '@/lib/platform-data';
import { ago, countryOf, sectorOf, short, usd, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';
import { tr } from '@/lib/i18n';

export default function MarketItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c, user, dark } = useStore();
  const insets = useSafeAreaInsets();
  const p = usePlatform();
  const start = useStartChat();
  const [reporting, setReporting] = useState(false);
  const [menu, setMenu] = useState(false);
  const m = p.market.find(x => x.id === id);
  const mine = m?.sellerId === (user?.id ?? 'me');
  const staff = user?.role === 'moderator' || user?.role === 'admin';

  if (!m || (!mine && !staff && (m.status !== 'published' || p.isBlocked('market', m.id)))) {
    return <Screen title={tr("E'lon")}><EmptyState icon="pricetag-outline" title={tr("E'lon topilmadi")} sub={tr("U sotilgan, o'chirilgan yoki moderatsiyada bo'lishi mumkin")} /></Screen>;
  }
  const k = countryOf(m.country);
  const sec = sectorOf(m.sector);
  const kind = MARKET_KINDS.find(x => x.id === m.kind)!;
  const off = discountOf(m);
  const inCart = p.cartQty(m.id);
  const fav = p.isFav('market:' + m.id);
  const peer = { peerId: m.sellerId, peerName: m.sellerName, peerKind: 'company' as const, peerVerified: m.sellerVerified };
  const similar = p.publicMarket.filter(x => x.id !== m.id && (x.sector === m.sector || x.kind === m.kind)).slice(0, 6);
  const share = () => Share.share({ message: tr('YUMS Market: {title} — {usd}', { title: m.title, usd: usd(m.price) }) }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <NavButton icon="chevron-back" label={tr('Orqaga')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/market'))} />
        <NavGroup items={[
          { icon: 'share-outline', label: tr('Ulashish'), onPress: share },
          ...(!mine ? [{
            icon: (fav ? 'heart' : 'heart-outline') as 'heart',
            label: fav ? tr('Sevimlilardan olib tashlash') : tr("Sevimlilarga qo'shish"),
            color: fav ? SALE : undefined,
            onPress: () => { const v = p.toggleFav('market:' + m.id); toast(v ? tr("Sevimlilarga qo'shildi") : tr('Sevimlilardan olib tashlandi'), v ? 'heart' : 'heart-outline'); },
          }] : []),
          { icon: 'ellipsis-horizontal', label: tr('Amallar'), onPress: () => setMenu(true) },
        ]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 14, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* Rasm */}
        <View style={[styles.img, { backgroundColor: dark ? c.surface : '#FFFFFF' }]}>
          <MarketVisual m={m} icon={84} plain />
          {off ? <View style={styles.sale}><Text style={styles.saleText}>−{off}%</Text></View> : null}
        </View>

        {/* Narx va nom */}
        <View style={{ gap: 8 }}>
          <PriceLine m={m} size={28} />
          {off ? <Text style={[styles.save, { color: SALE }]}>{tr('Tejaysiz: {usd}', { usd: usd(m.oldPrice! - m.price) })}</Text> : null}
          <Txt v="h2" style={{ lineHeight: 26 }}>{m.title}</Txt>
          <Row gap={10} style={{ flexWrap: 'wrap' }}>
            {m.rating ? (
              <Row gap={4}>
                {[1, 2, 3, 4, 5].map(i => <Ionicons key={i} name={m.rating! >= i - 0.25 ? 'star' : m.rating! >= i - 0.75 ? 'star-half' : 'star-outline'} size={15} color={STAR} />)}
                <Txt v="small" style={{ fontFamily: F.bold, marginLeft: 2 }}>{m.rating.toFixed(1)}</Txt>
                <Txt v="small" faint>{tr('· {short} baho', { short: short(m.reviews ?? 0) })}</Txt>
              </Row>
            ) : <Txt v="small" color={c.ok} style={{ fontFamily: F.bold }}>{tr("Yangi e'lon")}</Txt>}
            {m.sold ? <Txt v="small" faint>{tr('{short}+ marta buyurtma qilingan', { short: short(m.sold) })}</Txt> : null}
          </Row>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {(mine || staff) && <StatusBadge status={m.status} />}
            <View style={[styles.tag, { backgroundColor: c.surface2 }]}>
              <Ionicons name={kind.icon} size={13} color={c.muted} />
              <Text style={[styles.tagText, { color: c.text }]}>{kind.name}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: alpha(sec.color, 0.13) }]}>
              <SectorGlyph id={sec.id} size={15} />
              <Text style={[styles.tagText, { color: sec.color }]}>{sec.name}</Text>
            </View>
          </Row>
        </View>

        {/* Yetkazish va shartlar */}
        <Card style={{ gap: 0, padding: 6 }}>
          <InfoRow icon={m.kind === 'goods' ? 'cube-outline' : m.kind === 'digital' ? 'flash-outline' : 'briefcase-outline'} title={deliveryShort(m)} sub={m.kind === 'goods' ? tr('Yetkazib berish') : m.kind === 'digital' ? tr("To'lovdan so'ng havola beriladi") : tr('Muddat sotuvchi bilan kelishiladi')} />
          {m.minOrder ? <InfoRow icon="layers-outline" title={m.minOrder} sub={tr('Minimal buyurtma')} /> : null}
          <InfoRow icon="location-outline" title={k.name} sub={tr('Sotuvchi mamlakati')} flag={k.code} />
          <InfoRow icon="shield-checkmark-outline" title={tr('Xavfsiz bitim')} sub={tr("Shartnoma va litsenziyalangan to'lov hamkori orqali")} tint={c.ok} last />
        </Card>

        {/* Sotuvchi */}
        <Card>
          <Row>
            <Logo name={m.sellerName} size={46} />
            <View style={{ flex: 1 }}>
              <Row gap={4}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{m.sellerName}</Txt>{m.sellerVerified && <Verified />}</Row>
              <Txt v="small" muted>{m.sellerVerified ? tr('Tasdiqlangan sotuvchi') : tr('Sotuvchi')} · {ago(m.createdAt)}</Txt>
            </View>
            {!mine && (
              <Pressable onPress={() => { haptic.tap(); start(peer, { subject: m.title }); }} style={({ pressed }) => [styles.chatBtn, { backgroundColor: c.surface2, opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={17} color={c.text} />
                <Text style={[styles.chatText, { color: c.text }]}>{tr('Yozish')}</Text>
              </Pressable>
            )}
          </Row>
        </Card>

        {/* Tavsif */}
        <Card style={{ gap: 8 }}>
          <Txt v="h3">{tr('Tavsif')}</Txt>
          <Txt muted style={{ lineHeight: 22 }}>{m.desc}</Txt>
        </Card>

        {similar.length > 0 && (
          <View style={{ gap: 12 }}>
            <Txt v="h2">{tr("O'xshash takliflar")}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {similar.map(x => <MarketCard key={x.id} m={x} style={{ width: 160 }} />)}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Pastki panel */}
      {!mine && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: c.bg, borderTopColor: c.line }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <PriceLine m={m} size={19} />
            <Txt v="tiny" muted numberOfLines={1}>{inCart ? tr('Savatda: {inCart} · {usd}', { inCart, usd: usd(inCart * m.price) }) : deliveryShort(m)}</Txt>
          </View>
          {inCart ? (
            <Row gap={8}>
              <CartControl m={m} big style={{ width: 132 }} />
              <Pressable onPress={() => { haptic.tap(); router.push('/cart'); }} accessibilityLabel={tr("Savatga o'tish")} style={({ pressed }) => [styles.toCart, { backgroundColor: c.ink, opacity: pressed ? 0.85 : 1 }]}>
                <Ionicons name="cart" size={21} color={c.bg} />
              </Pressable>
            </Row>
          ) : <CartControl m={m} big style={{ width: 190 }} />}
        </View>
      )}

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        header={
          <>
            <View style={[styles.menuThumb, { backgroundColor: dark ? c.surface2 : '#FFFFFF' }]}><MarketVisual m={m} icon={20} plain /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3" numberOfLines={1}>{m.title}</Txt>
              <Txt v="small" muted numberOfLines={1}>{usd(m.price)}{m.unit ? ` / ${tr(m.unit)}` : ''} · {m.sellerName}</Txt>
            </View>
          </>
        }
        groups={mine ? [
          [{ icon: 'share-social-outline', title: tr('Ulashish'), sub: tr('Havolani yuborish'), color: c.accent, onPress: () => { setMenu(false); share(); } }],
          [{ icon: 'trash-outline', title: tr("E'lonni o'chirish"), sub: tr("Qaytarib bo'lmaydi"), danger: true, onPress: () => {
            setMenu(false);
            confirm(tr("E'lonni o'chirasizmi?"), m.title, () => { p.deleteMarketItem(m.id); toast(tr("E'lon o'chirildi"), 'trash'); router.back(); }, tr("O'chirish"));
          } }],
        ] : [
          [
            { icon: 'share-social-outline', title: tr('Ulashish'), sub: tr('Havolani yuborish'), color: c.accent, onPress: () => { setMenu(false); share(); } },
            { icon: 'chatbubble-ellipses-outline', title: tr('Sotuvchiga yozish'), sub: m.sellerName, color: c.ok, onPress: () => { setMenu(false); start(peer, { subject: m.title }); } },
            { icon: 'document-text-outline', title: tr("Ulgurji narx so'rash"), sub: tr("Hamkorlik so'rovi yuboriladi"), color: c.violet, onPress: () => { setMenu(false); start(peer, { request: true, subject: tr('Ulgurji narx: {title}', { title: m.title }) }); } },
          ],
          [{ icon: 'flag-outline', title: tr('Shikoyat qilish'), sub: tr("Qoidalarni buzgan bo'lsa"), danger: true, onPress: () => { setMenu(false); setTimeout(() => setReporting(true), 350); } }],
        ]}
      />
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind="market" id={m.id} title={m.title} />
    </View>
  );
}

function InfoRow({ icon, title, sub, flag, tint, last }: { icon: IconName; title: string; sub: string; flag?: string; tint?: string; last?: boolean }) {
  const { colors: c } = useStore();
  return (
    <View>
      <View style={styles.info}>
        <View style={[styles.infoIco, { backgroundColor: tint ? alpha(tint, 0.13) : c.surface2 }]}>
          {flag ? <Flag code={flag} size={20} /> : <Ionicons name={icon} size={19} color={tint ?? c.text} />}
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="h3" numberOfLines={1} color={tint}>{title}</Txt>
          <Txt v="small" muted numberOfLines={2}>{sub}</Txt>
        </View>
      </View>
      {!last && <View style={[styles.sep, { backgroundColor: c.line }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  img: { aspectRatio: 1.1, borderRadius: radius.xl, overflow: 'hidden' },
  sale: { position: 'absolute', left: 14, top: 14, backgroundColor: SALE, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  saleText: { color: '#fff', fontFamily: F.heavy, fontSize: 14 },
  save: { fontFamily: F.bold, fontSize: 13.5, marginTop: -4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, height: 28, borderRadius: 9 },
  tagText: { fontFamily: F.bold, fontSize: 12 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  infoIco: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 12 },
  chatText: { fontFamily: F.bold, fontSize: 13.5 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  toCart: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuThumb: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden' },
});
