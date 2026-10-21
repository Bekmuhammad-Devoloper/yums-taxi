import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { Avatar, Card, Divider, ListItem, Row, Screen, Txt } from '@/components/ui';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';

export default function Menu() {
  const { colors: c, user, balance, rides, logout } = useStore();
  const done = rides.filter(r => r.status === 'done');
  return (
    <Screen title="Menyu">
      <Card>
        <Row>
          <Avatar name={user?.name ?? '?'} size={60} />
          <View style={{ flex: 1 }}>
            <Txt v="h2">{user?.name}</Txt>
            <Txt v="small" muted>{user?.phone}</Txt>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: c.surface2, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Txt v="h3">★ {user?.rating.toFixed(1)}</Txt>
            <Txt v="tiny" faint>reyting</Txt>
          </View>
        </Row>
      </Card>

      <Row gap={10}>
        <Card style={{ flex: 1, backgroundColor: c.brand }} onPress={() => router.push('/payment')}>
          <Text style={{ color: c.brandText, opacity: 0.7, fontWeight: '700', fontSize: 12.5 }}>YUMS balans</Text>
          <Text style={{ color: c.brandText, fontWeight: '900', fontSize: 20, marginTop: 2 }}>{som(balance)}</Text>
          <Text style={{ color: c.brandText, opacity: 0.7, fontWeight: '600', fontSize: 11.5, marginTop: 4 }}>Har safardan 3% keshbek</Text>
        </Card>
        <Card style={{ flex: 1 }} onPress={() => router.push('/history')}>
          <Txt v="small" muted>Safarlar</Txt>
          <Txt v="h1">{done.length}</Txt>
          <Txt v="tiny" faint>{done.reduce((s, r) => s + r.distanceKm, 0).toFixed(0)} km yo'l bosildi</Txt>
        </Card>
      </Row>

      <Card style={{ padding: 6 }}>
        <ListItem icon="time-outline" title="Safarlar tarixi" onPress={() => router.push('/history')} />
        <ListItem icon="card-outline" title="To'lov usullari" sub="Kartalar, balans, promokodlar" onPress={() => router.push('/payment')} />
        <ListItem icon="bookmark-outline" title="Manzillarim" sub="Uy, ish" onPress={() => router.push('/places')} />
        <ListItem icon="shield-checkmark-outline" title="Xavfsizlik" iconColor={c.ok} onPress={() => router.push('/safety')} />
      </Card>

      <Card style={{ padding: 6 }}>
        <ListItem icon="help-buoy-outline" title="Yordam" sub="24/7 qo'llab-quvvatlash" onPress={() => router.push('/support')} />
        <ListItem icon="settings-outline" title="Sozlamalar" onPress={() => router.push('/settings')} />
        <ListItem icon="car-sport-outline" title="Haydovchi bo'lish" sub="YUMS Driver bilan daromad qiling" onPress={() => toast("YUMS Driver ilovasi tez orada", 'car-sport')} />
      </Card>

      <Card style={{ padding: 6 }}>
        <ListItem icon="log-out-outline" title="Chiqish" danger onPress={() => { logout(); router.replace('/login'); }} />
      </Card>

      <Divider style={{ marginTop: 4 }} />
      <Txt v="tiny" faint style={{ textAlign: 'center' }}>YUMS Taxi 1.0 · YUMS xalqaro raqamli platformasi</Txt>
    </Screen>
  );
}
