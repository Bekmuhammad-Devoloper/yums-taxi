import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Avatar, Button, Card, Divider, Row, Screen, Txt } from '@/components/ui';
import { TARIFFS } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';

export default function RideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rides, setPickup, setDestination, setTariff } = useStore();
  const r = rides.find(x => x.id === id);
  if (!r) return <Screen title="Safar"><Txt muted>Safar topilmadi</Txt></Screen>;
  const t = TARIFFS.find(x => x.id === r.tariffId);
  const cancelled = r.status === 'cancelled';
  const tip = r.tip ?? 0;
  const payName = r.payment === 'card' ? 'Karta' : r.payment === 'balance' ? 'YUMS balans' : 'Naqd';

  const repeat = () => {
    setTariff(r.tariffId);
    setPickup(r.from);
    setDestination(r.to);
    router.dismissTo('/');
  };

  return (
    <Screen
      title={fmtDate(r.createdAt)}
      footer={<Button title="Shu safarni takrorlash" icon="refresh" onPress={repeat} />}>
      <Card style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 44 }}>{t?.emoji}</Text>
        <Txt v="h1">{cancelled ? 'Bekor qilingan' : som(r.price)}</Txt>
        <Txt muted>{t?.name} · {r.distanceKm} km{r.durationMin ? ` · ${r.durationMin} daq` : ''}</Txt>
      </Card>

      <Card style={{ gap: 12 }}>
        <Row>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#0F1E3D' }} />
          <View style={{ flex: 1 }}><Txt v="tiny" faint>Qayerdan</Txt><Txt v="h3">{r.from.title}</Txt></View>
        </Row>
        <Row>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#FFC800' }} />
          <View style={{ flex: 1 }}><Txt v="tiny" faint>Qayerga</Txt><Txt v="h3">{r.to.title}</Txt></View>
        </Row>
      </Card>

      <Card>
        <Row>
          <Avatar name={r.driver.name} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{r.driver.name} · ★ {r.driver.rating}</Txt>
            <Txt v="small" muted>{r.driver.color} {r.driver.car} · {r.driver.plate}</Txt>
          </View>
        </Row>
      </Card>

      {!cancelled && (
        <Card style={{ gap: 10 }}>
          <Txt v="h3">To'lov tafsilotlari</Txt>
          <Row style={{ justifyContent: 'space-between' }}><Txt muted>Safar narxi</Txt><Txt>{som(r.price - tip)}</Txt></Row>
          {tip ? <Row style={{ justifyContent: 'space-between' }}><Txt muted>Choy puli</Txt><Txt>{som(tip)}</Txt></Row> : null}
          <Divider />
          <Row style={{ justifyContent: 'space-between' }}><Txt v="h3">Jami · {payName}</Txt><Txt v="h3">{som(r.price)}</Txt></Row>
          {r.rating ? <Txt v="small" muted>Sizning bahoyingiz: {'★'.repeat(r.rating)}</Txt> : null}
        </Card>
      )}

      <Button title="Muammo haqida xabar berish" kind="ghost" icon="help-buoy-outline" onPress={() => router.push('/support')} />
      <Txt v="tiny" faint style={{ textAlign: 'center' }}>Buyurtma raqami: {r.id.toUpperCase()}</Txt>
    </Screen>
  );
}
