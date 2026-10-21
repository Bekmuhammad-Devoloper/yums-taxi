import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { FavButton, KeyValue, Logo, Place, ReportSheet, StatusBadge } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Badge, Button, Card, EmptyState, IconButton, Row, Screen, Txt, Verified } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { confirm } from '@/lib/confirm';
import { MARKET_KINDS } from '@/lib/platform-data';
import { ago, countryOf, sectorOf, usd, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';

export default function MarketItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const start = useStartChat();
  const [reporting, setReporting] = useState(false);
  const m = p.market.find(x => x.id === id);
  const mine = m?.sellerId === (user?.id ?? 'me');
  const staff = user?.role === 'moderator' || user?.role === 'admin';

  if (!m || (!mine && !staff && (m.status !== 'published' || p.isBlocked('market', m.id)))) {
    return <Screen title="E'lon"><EmptyState icon="pricetag-outline" title="E'lon topilmadi" sub="U sotilgan, o'chirilgan yoki moderatsiyada bo'lishi mumkin" /></Screen>;
  }
  const k = countryOf(m.country);
  const sec = sectorOf(m.sector);
  const kind = MARKET_KINDS.find(x => x.id === m.kind)!;
  const peer = { peerId: m.sellerId, peerName: m.sellerName, peerKind: 'company' as const, peerVerified: m.sellerVerified };

  return (
    <Screen
      title={kind.name}
      subtitle="YUMS Market"
      right={
        <Row gap={8}>
          <IconButton name="share-outline" size={42} onPress={() => Share.share({ message: `YUMS Market: ${m.title} — ${usd(m.price)}` }).catch(() => {})} />
          {mine
            ? <IconButton name="trash-outline" size={42} color={c.danger} onPress={() => confirm("E'lonni o'chirasizmi?", m.title, () => { p.deleteMarketItem(m.id); toast("E'lon o'chirildi", 'trash'); router.back(); }, "O'chirish")} />
            : <IconButton name="flag-outline" size={42} onPress={() => setReporting(true)} />}
        </Row>
      }
      footer={mine ? undefined : (
        <Row gap={10}>
          <Button title="Yozish" kind="ghost" icon="chatbubble-ellipses-outline" style={{ flex: 1 }} onPress={() => start(peer, { subject: m.title })} />
          <Button title="Buyurtma berish" icon="cart" style={{ flex: 1.4 }} onPress={() => start(peer, { request: true, subject: `Buyurtma: ${m.title}` })} />
        </Row>
      )}>
      <View style={[styles.img, { backgroundColor: sec.color + '1A' }]}>
        <Text style={{ fontSize: 96 }}>{m.emoji}</Text>
        {!mine && <View style={[styles.fav, { backgroundColor: c.surface }]}><FavButton k={'market:' + m.id} /></View>}
      </View>

      <View style={{ gap: 6 }}>
        <Row gap={6}>
          {(mine || staff) && <StatusBadge status={m.status} />}
          <Badge label={kind.name} icon={kind.icon} tone="accent" />
          <Badge label={sec.name} />
        </Row>
        <Txt v="h1">{m.title}</Txt>
        <Txt v="title">{usd(m.price)}<Txt v="h3" muted>{m.unit ? ` / ${m.unit}` : ''}</Txt></Txt>
      </View>

      <Card>
        <Row>
          <Logo name={m.sellerName} color={sec.color} size={46} />
          <View style={{ flex: 1 }}>
            <Row gap={4}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{m.sellerName}</Txt>{m.sellerVerified && <Verified />}</Row>
            <Place code={k.code} after={` · ${ago(m.createdAt)}`} />
          </View>
        </Row>
      </Card>

      <Card style={{ gap: 8 }}>
        <Txt v="h3">Tavsif</Txt>
        <Txt muted style={{ lineHeight: 22 }}>{m.desc}</Txt>
      </Card>

      <KeyValue items={[
        ...(m.minOrder ? [{ label: 'Minimal buyurtma', value: m.minOrder, icon: 'layers-outline' as const }] : []),
        ...(m.delivery ? [{ label: 'Yetkazib berish', value: m.delivery, icon: 'airplane-outline' as const }] : []),
        { label: 'Mamlakat', value: k.name, icon: 'location-outline', flag: k.code },
        { label: 'Turi', value: kind.name, icon: kind.icon },
      ]} />

      <View style={[styles.note, { backgroundColor: c.okSoft }]}>
        <Ionicons name="shield-checkmark" size={20} color={c.ok} />
        <Txt v="small" color={c.ok} style={{ flex: 1, lineHeight: 19 }}>
          Xavfsiz bitim: shartnoma va to'lov qonuniy to'lov hamkorlari orqali rasmiylashtiriladi. Platforma komissiyasi — bitim summasining 3%. Oldindan to'lovni shaxsiy kartaga o'tkazmang.
        </Txt>
      </View>
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind="market" id={m.id} title={m.title} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  img: { height: 220, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  fav: { position: 'absolute', top: 12, right: 12, width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
});
