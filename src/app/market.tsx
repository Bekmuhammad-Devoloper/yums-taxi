import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { MarketCard, StatusBadge } from '@/components/platform-ui';
import { Card, Chip, EmptyState, IconButton, Row, Screen, Segmented, Txt } from '@/components/ui';
import { MARKET_KINDS, type MarketKind } from '@/lib/platform-data';
import { usd, usePlatform } from '@/lib/platform';

type Tab = 'all' | 'mine';

export default function Market() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const p = usePlatform();
  const [tab, setTab] = useState<Tab>(params.tab === 'mine' ? 'mine' : 'all');
  const [kind, setKind] = useState<MarketKind | null>(null);
  const items = p.publicMarket.filter(x => !kind || x.kind === kind);

  // Ikki ustunli to'r
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <Screen title="YUMS Market" subtitle="Tovarlar, raqamli mahsulotlar va xizmatlar" right={<IconButton name="add" size={42} onPress={() => router.push('/market/new')} />}>
      <Segmented<Tab> value={tab} onChange={setTab} items={[{ id: 'all', label: 'Bozor' }, { id: 'mine', label: `Mening e'lonlarim · ${p.myMarket.length}` }]} />
      {tab === 'all' ? (
        <>
          <View style={{ marginHorizontal: -16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              <Chip label="Barchasi" active={!kind} onPress={() => setKind(null)} />
              {MARKET_KINDS.map(k => <Chip key={k.id} label={k.name} icon={k.icon} active={kind === k.id} onPress={() => setKind(kind === k.id ? null : k.id)} />)}
            </ScrollView>
          </View>
          {rows.map((r, i) => (
            <Row key={i} gap={12} style={{ alignItems: 'stretch' }}>
              {r.map(m => <MarketCard key={m.id} m={m} style={{ flex: 1 }} />)}
              {r.length === 1 && <View style={{ flex: 1 }} />}
            </Row>
          ))}
          {!items.length && <EmptyState icon="storefront-outline" title="E'lonlar topilmadi" />}
          <Txt v="tiny" faint style={{ textAlign: 'center' }}>Faqat qonuniy va ruxsat etilgan tovar va xizmatlar. Taqiqlangan e'lonlar o'chiriladi.</Txt>
        </>
      ) : p.myMarket.length ? (
        p.myMarket.map(m => (
          <Card key={m.id} onPress={() => router.push({ pathname: '/market/[id]', params: { id: m.id } })}>
            <Row>
              <Txt style={{ fontSize: 34 }}>{m.emoji}</Txt>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt v="h3" numberOfLines={1}>{m.title}</Txt>
                <Txt v="small" muted>{usd(m.price)}{m.unit ? ` / ${m.unit}` : ''}</Txt>
              </View>
              <StatusBadge status={m.status} />
            </Row>
          </Card>
        ))
      ) : (
        <EmptyState icon="pricetags-outline" title="E'lonlaringiz yo'q" sub="Tovar, raqamli mahsulot yoki xizmatingizni butun dunyoga taklif qiling" action="E'lon joylashtirish" onAction={() => router.push('/market/new')} />
      )}
    </Screen>
  );
}
