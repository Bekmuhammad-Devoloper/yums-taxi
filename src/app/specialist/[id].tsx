import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FavButton, KeyValue, ReportSheet } from '@/components/platform-ui';
import { Avatar, Badge, Button, Card, EmptyState, IconButton, Row, Screen, SectionHeader, Txt, Verified } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { LANGUAGES } from '@/lib/platform-data';
import { countryOf, sectorOf, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';

const REVIEWS = [
  { who: 'AgroSmart LLC', stars: 5, text: "Muddatidan oldin topshirdi, kod sifati a'lo. Yana ishlaymiz." },
  { who: 'Dilnoza K.', stars: 5, text: "Talablarni tez tushundi, har kuni hisobot berib turdi." },
  { who: 'Silk Road Logistics', stars: 4, text: 'Yaxshi natija, kichik tuzatishlar bilan.' },
];

export default function SpecialistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c } = useStore();
  const p = usePlatform();
  const start = useStartChat();
  const [reporting, setReporting] = useState(false);
  const sp = p.specialists.find(x => x.id === id);

  if (!sp || p.isBlocked('specialist', sp.id)) return <Screen title="Mutaxassis"><EmptyState icon="person-outline" title="Profil topilmadi" /></Screen>;
  const k = countryOf(sp.country);
  const peer = { peerId: sp.id, peerName: sp.name, peerKind: 'specialist' as const, peerVerified: sp.verified };

  return (
    <Screen
      title={sp.name}
      subtitle="YUMS Technology"
      right={<Row gap={8}><View style={[styles.fav, { backgroundColor: c.surface }]}><FavButton k={'specialist:' + sp.id} /></View><IconButton name="flag-outline" size={42} onPress={() => setReporting(true)} /></Row>}
      footer={
        <Row gap={10}>
          <Button title="Yozish" kind="ghost" icon="chatbubble-ellipses-outline" style={{ flex: 1 }} onPress={() => start(peer)} />
          <Button title="Ishga taklif qilish" icon="briefcase" disabled={!sp.available} style={{ flex: 1.4 }} onPress={() => start(peer, { request: true, subject: 'Loyihaga taklif' })} />
        </Row>
      }>
      <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
        <View>
          <Avatar name={sp.name} size={84} bg={sectorOf(sp.sector).color} />
          <View style={[styles.dot, { backgroundColor: sp.available ? c.ok : c.faint, borderColor: c.surface }]} />
        </View>
        <Row gap={5}><Txt v="h1">{sp.name}</Txt>{sp.verified && <Verified size={20} />}</Row>
        <Txt muted>{sp.title}</Txt>
        <Txt v="small" muted>{k.flag} {sp.city}, {k.name}</Txt>
        <Row gap={6} style={{ marginTop: 4 }}>
          <Badge label={sp.available ? 'Buyurtma qabul qiladi' : 'Hozir band'} tone={sp.available ? 'ok' : 'muted'} />
          {sp.remote && <Badge label="Masofaviy" icon="globe-outline" tone="accent" />}
        </Row>
      </Card>

      <KeyValue items={[
        { label: 'Stavka', value: `$${sp.rate} / soat`, icon: 'cash-outline' },
        { label: 'Reyting', value: `★ ${sp.rating.toFixed(1)} (${sp.reviews})`, icon: 'star-outline' },
        { label: 'Tajriba', value: `${sp.experience} yil`, icon: 'ribbon-outline' },
        { label: 'Tillar', value: sp.languages.map(l => LANGUAGES.find(x => x.id === l)?.name ?? l).join(', '), icon: 'language-outline' },
      ]} />

      <Card style={{ gap: 8 }}>
        <Txt v="h3">Men haqimda</Txt>
        <Txt muted style={{ lineHeight: 22 }}>{sp.about}</Txt>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt v="h3">Ko'nikmalar</Txt>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>{sp.skills.map(s => <Badge key={s} label={s} tone="accent" />)}</Row>
      </Card>

      <SectionHeader title={`Sharhlar · ${sp.reviews}`} />
      {REVIEWS.map(r => (
        <Card key={r.who} style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3">{r.who}</Txt>
            <Row gap={1}>{[1, 2, 3, 4, 5].map(n => <Ionicons key={n} name={n <= r.stars ? 'star' : 'star-outline'} size={13} color="#F5A524" />)}</Row>
          </Row>
          <Txt v="small" muted>{r.text}</Txt>
        </Card>
      ))}
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind="specialist" id={sp.id} title={sp.name} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fav: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 0, bottom: 0, width: 20, height: 20, borderRadius: 10, borderWidth: 3 },
});
