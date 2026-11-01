import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { Card, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, trPlace } from '@/lib/i18n';

const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => toast(tr("Qo'ng'iroq: {n}", { n }), 'call'));

export default function Safety() {
  const { colors: c, order } = useStore();
  const d = order.driver;
  const inTrip = !!d && ['accepted', 'arrived', 'inride'].includes(order.phase);
  return (
    <Screen title={tr('Xavfsizlik')}>
      <Pressable onPress={() => call('112')} style={({ pressed }) => [styles.sos, { opacity: pressed ? 0.85 : 1 }]}>
        <View style={styles.sosRing}><Text style={styles.sosText}>{tr('SOS')}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sosTitle}>{tr('Favqulodda yordam')}</Text>
          <Text style={styles.sosSub}>{tr("112 raqamiga qo'ng'iroq qilish")}</Text>
        </View>
      </Pressable>

      <Row gap={10}>
        <Card style={{ flex: 1, alignItems: 'center', gap: 6 }} onPress={() => call('102')}>
          <Ionicons name="shield" size={26} color={c.accent} />
          <Txt v="h3">102</Txt><Txt v="tiny" faint>{tr('Militsiya')}</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 6 }} onPress={() => call('103')}>
          <Ionicons name="medkit" size={26} color={c.danger} />
          <Txt v="h3">103</Txt><Txt v="tiny" faint>{tr('Tez yordam')}</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 6 }} onPress={() => call('101')}>
          <Ionicons name="flame" size={26} color="#F5A524" />
          <Txt v="h3">101</Txt><Txt v="tiny" faint>{tr("O't o'chirish")}</Txt>
        </Card>
      </Row>

      {inTrip && (
        <Card style={{ padding: 6 }}>
          <ListItem icon="share-social" title={tr('Safarni yaqinlarga ulashish')} sub={tr('Mashina, raqam va manzil')} onPress={() => Share.share({ message: tr("Men YUMS Taxi'da: {color} {car}, {plate}, haydovchi {name}. Manzil: {title}", { color: tr(d!.color), car: d!.car, plate: d!.plate, name: d!.name, title: trPlace(order.destination?.title) }) }).catch(() => {})} />
          <ListItem icon="call" title={tr("Haydovchiga qo'ng'iroq · {name}", { name: d!.name })} onPress={() => call(d!.phone)} />
        </Card>
      )}

      <SectionTitle>{tr('Har bir safarda')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        {[
          ['checkmark-circle', tr("Haydovchilar tekshiruvdan o'tgan"), tr('Hujjatlar, haydovchilik guvohnomasi va sudlanganlik tekshiriladi')],
          ['car', tr('Mashina raqamini tekshiring'), tr('Ilovadagi raqam va mashina bilan solishtiring')],
          ['location', tr('Safar kuzatiladi'), tr('Marshrutdan chetga chiqish avtomatik aniqlanadi')],
          ['lock-closed', tr('Raqamingiz yashirin'), tr("Haydovchi sizning raqamingizni ko'rmaydi")],
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
  sosText: { color: '#fff', fontFamily: F.heavy, fontSize: 18 },
  sosTitle: { color: '#fff', fontFamily: F.heavy, fontSize: 18 },
  sosSub: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi, fontSize: 13.5, marginTop: 2 },
});
