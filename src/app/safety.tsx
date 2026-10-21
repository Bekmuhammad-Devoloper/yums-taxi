import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { Card, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';

const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => toast(`Qo'ng'iroq: ${n}`, 'call'));

export default function Safety() {
  const { colors: c, order } = useStore();
  const d = order.driver;
  const inTrip = !!d && ['accepted', 'arrived', 'inride'].includes(order.phase);
  return (
    <Screen title="Xavfsizlik">
      <Pressable onPress={() => call('112')} style={({ pressed }) => [styles.sos, { opacity: pressed ? 0.85 : 1 }]}>
        <View style={styles.sosRing}><Text style={styles.sosText}>SOS</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sosTitle}>Favqulodda yordam</Text>
          <Text style={styles.sosSub}>112 raqamiga qo'ng'iroq qilish</Text>
        </View>
      </Pressable>

      <Row gap={10}>
        <Card style={{ flex: 1, alignItems: 'center', gap: 6 }} onPress={() => call('102')}>
          <Ionicons name="shield" size={26} color={c.accent} />
          <Txt v="h3">102</Txt><Txt v="tiny" faint>Militsiya</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 6 }} onPress={() => call('103')}>
          <Ionicons name="medkit" size={26} color={c.danger} />
          <Txt v="h3">103</Txt><Txt v="tiny" faint>Tez yordam</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 6 }} onPress={() => call('101')}>
          <Ionicons name="flame" size={26} color="#F5A524" />
          <Txt v="h3">101</Txt><Txt v="tiny" faint>O't o'chirish</Txt>
        </Card>
      </Row>

      {inTrip && (
        <Card style={{ padding: 6 }}>
          <ListItem icon="share-social" title="Safarni yaqinlarga ulashish" sub="Mashina, raqam va manzil" onPress={() => Share.share({ message: `Men YUMS Taxi'da: ${d!.color} ${d!.car}, ${d!.plate}, haydovchi ${d!.name}. Manzil: ${order.destination?.title}` }).catch(() => {})} />
          <ListItem icon="call" title={`Haydovchiga qo'ng'iroq · ${d!.name}`} onPress={() => call(d!.phone)} />
        </Card>
      )}

      <SectionTitle>Har bir safarda</SectionTitle>
      <Card style={{ gap: 14 }}>
        {[
          ['checkmark-circle', 'Haydovchilar tekshiruvdan o\'tgan', 'Hujjatlar, haydovchilik guvohnomasi va sudlanganlik tekshiriladi'],
          ['car', 'Mashina raqamini tekshiring', 'Ilovadagi raqam va mashina bilan solishtiring'],
          ['location', 'Safar kuzatiladi', 'Marshrutdan chetga chiqish avtomatik aniqlanadi'],
          ['lock-closed', 'Raqamingiz yashirin', "Haydovchi sizning raqamingizni ko'rmaydi"],
        ].map(([icon, title, sub]) => (
          <Row key={title} style={{ alignItems: 'flex-start' }}>
            <Ionicons name={icon as 'car'} size={22} color={c.ok} />
            <View style={{ flex: 1 }}><Txt v="h3">{title}</Txt><Txt v="small" muted>{sub}</Txt></View>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sos: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 24, backgroundColor: '#E5484D' },
  sosRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  sosText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  sosTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  sosSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 13.5, marginTop: 2 },
});
