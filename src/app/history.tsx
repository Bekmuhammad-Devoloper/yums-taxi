import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, Row, Screen, Txt } from '@/components/ui';
import { TARIFFS } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

export default function History() {
  const { colors: c, rides } = useStore();
  return (
    <Screen title="Safarlar tarixi">
      {rides.length === 0 && (
        <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
          <Text style={{ fontSize: 48 }}>🚕</Text>
          <Txt v="h2">Hali safarlar yo'q</Txt>
          <Txt muted style={{ textAlign: 'center' }}>Birinchi safaringiz shu yerda paydo bo'ladi</Txt>
        </View>
      )}
      {rides.map(r => {
        const t = TARIFFS.find(x => x.id === r.tariffId);
        const cancelled = r.status === 'cancelled';
        return (
          <Card key={r.id} onPress={() => router.push({ pathname: '/ride/[id]', params: { id: r.id } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="small" muted>{fmtDate(r.createdAt)} · {t?.name}</Txt>
              {cancelled
                ? <Txt v="small" color={c.danger} style={{ fontFamily: F.bold }}>Bekor qilingan</Txt>
                : <Txt v="h3">{som(r.price)}</Txt>}
            </Row>
            <View style={{ marginTop: 10, gap: 8 }}>
              <Row gap={10}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0F1E3D', borderWidth: 2, borderColor: c.surface3 }} />
                <Txt numberOfLines={1} style={{ flex: 1 }}>{r.from.title}</Txt>
              </Row>
              <Row gap={10}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#FFC800' }} />
                <Txt numberOfLines={1} style={{ flex: 1 }}>{r.to.title}</Txt>
              </Row>
            </View>
            {!cancelled && r.rating ? (
              <Row gap={2} style={{ marginTop: 10 }}>
                {[1, 2, 3, 4, 5].map(n => <Ionicons key={n} name={n <= (r.rating ?? 0) ? 'star' : 'star-outline'} size={13} color="#F5A524" />)}
                <Txt v="tiny" faint style={{ marginLeft: 6 }}>{r.driver.name} · {r.driver.car}</Txt>
              </Row>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
