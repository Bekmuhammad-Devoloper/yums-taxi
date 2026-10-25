import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CartControl, MarketVisual, PriceLine, SALE } from '@/components/market-ui';
import { Logo } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Divider, EmptyState, Row, Screen, Txt, Verified } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import type { MarketItem } from '@/lib/platform-data';
import { usd, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

type Line = { item: MarketItem; qty: number };

export default function Cart() {
  const { colors: c, dark } = useStore();
  const p = usePlatform();
  const lines = p.cartItems;

  // Sotuvchilar bo'yicha guruhlash — har bir sotuvchiga alohida buyurtma ketadi
  const groups = lines.reduce<Record<string, Line[]>>((acc, l) => {
    (acc[l.item.sellerId] ??= []).push(l);
    return acc;
  }, {});
  const sellers = Object.values(groups);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const before = lines.reduce((s, l) => s + (l.item.oldPrice ?? l.item.price) * l.qty, 0);
  const saved = before - total;

  const order = () => {
    haptic.success();
    sellers.forEach(g => {
      const first = g[0].item;
      const text = ['Assalomu alaykum! YUMS Market orqali buyurtma:', ...g.map(l => `• ${l.item.title} — ${l.qty}${l.item.unit ? ' ' + l.item.unit : ' ta'} × ${usd(l.item.price)}`), `Jami: ${usd(g.reduce((s, l) => s + l.item.price * l.qty, 0))}`].join('\n');
      p.openChat({ peerId: first.sellerId, peerName: first.sellerName, peerKind: 'company', peerVerified: first.sellerVerified }, { request: true, subject: `Buyurtma · ${g.length} ta mahsulot`, text });
    });
    p.clearCart();
    toast(sellers.length > 1 ? `${sellers.length} ta sotuvchiga buyurtma yuborildi` : 'Buyurtma sotuvchiga yuborildi', 'checkmark-circle');
    router.replace({ pathname: '/connect', params: { tab: 'requests' } });
  };

  if (!lines.length) {
    return (
      <Screen title="Savat">
        <EmptyState icon="cart-outline" title="Savat hozircha bo'sh" sub="Bozordan yoqqan tovar yoki xizmatni «Savatga» tugmasi bilan qo'shing" action="Bozorga o'tish" onAction={() => router.replace('/market')} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Savat"
      subtitle={`${p.cartCount} ta mahsulot · ${sellers.length} ta sotuvchi`}
      right={
        <Pressable hitSlop={8} onPress={() => confirm('Savatni tozalaysizmi?', "Barcha mahsulotlar olib tashlanadi.", () => p.clearCart(), 'Tozalash')}>
          <Text style={[styles.clear, { color: c.danger }]}>Tozalash</Text>
        </Pressable>
      }
      footer={
        <Row gap={12}>
          <View style={{ flex: 1 }}>
            <Txt v="tiny" muted>Jami</Txt>
            <Text style={[styles.total, { color: c.text }]}>{usd(total)}</Text>
          </View>
          <Button title="Buyurtma berish" icon="bag-check-outline" style={{ flex: 1.5 }} onPress={order} />
        </Row>
      }>
      {sellers.map(g => {
        const s = g[0].item;
        return (
          <Card key={s.sellerId} style={{ gap: 14 }}>
            <Row>
              <Logo name={s.sellerName} size={34} />
              <Row gap={4} style={{ flex: 1 }}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{s.sellerName}</Txt>{s.sellerVerified && <Verified size={14} />}</Row>
            </Row>
            {g.map((l, i) => (
              <View key={l.item.id} style={{ gap: 14 }}>
                {i > 0 && <Divider />}
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <Pressable onPress={() => router.push({ pathname: '/market/[id]', params: { id: l.item.id } })} style={[styles.thumb, { backgroundColor: dark ? c.surface2 : '#F6F7FA' }]}>
                    <MarketVisual m={l.item} icon={26} plain />
                  </Pressable>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Txt v="small" numberOfLines={2} style={{ lineHeight: 18 }}>{l.item.title}</Txt>
                    <PriceLine m={l.item} size={16} />
                    <Row style={{ justifyContent: 'space-between' }}>
                      <CartControl m={l.item} style={{ width: 118 }} />
                      <Txt v="h3">{usd(l.item.price * l.qty)}</Txt>
                    </Row>
                  </View>
                </Row>
              </View>
            ))}
          </Card>
        );
      })}

      <Card style={{ gap: 10 }}>
        <Txt v="h3">Buyurtma</Txt>
        <Row style={{ justifyContent: 'space-between' }}><Txt muted>Mahsulotlar ({p.cartCount})</Txt><Txt>{usd(before)}</Txt></Row>
        {saved > 0 && <Row style={{ justifyContent: 'space-between' }}><Txt muted>Chegirma</Txt><Txt color={SALE} style={{ fontFamily: F.bold }}>−{usd(saved)}</Txt></Row>}
        <Row style={{ justifyContent: 'space-between' }}><Txt muted>Yetkazish</Txt><Txt muted>Sotuvchi bilan kelishiladi</Txt></Row>
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}><Txt v="h3">Jami</Txt><Txt v="h2">{usd(total)}</Txt></Row>
      </Card>

      <View style={[styles.note, { backgroundColor: c.okSoft }]}>
        <Ionicons name="shield-checkmark" size={20} color={c.ok} />
        <Txt v="small" color={c.ok} style={{ flex: 1, lineHeight: 19 }}>
          Buyurtma har bir sotuvchiga alohida so'rov bo'lib boradi. To'lov shartnoma tuzilgach litsenziyalangan to'lov hamkori orqali amalga oshiriladi — oldindan shaxsiy kartaga pul o'tkazmang.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  clear: { fontFamily: F.bold, fontSize: 14 },
  total: { fontFamily: F.heavy, fontSize: 21, letterSpacing: -0.5 },
  thumb: { width: 76, height: 76, borderRadius: 16, overflow: 'hidden' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
});
