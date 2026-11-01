import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SpecialistIdCard } from '@/components/id-card';
import { FavButton, KeyValue, ReportSheet } from '@/components/platform-ui';
import { Badge, Button, Card, EmptyState, IconButton, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { LANGUAGES } from '@/lib/platform-data';
import { usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { tr } from '@/lib/i18n';

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

  if (!sp || p.isBlocked('specialist', sp.id)) return <Screen title={tr('Mutaxassis')}><EmptyState icon="person-outline" title={tr('Profil topilmadi')} /></Screen>;
  const peer = { peerId: sp.id, peerName: sp.name, peerKind: 'specialist' as const, peerVerified: sp.verified };

  return (
    <Screen
      title={sp.name}
      subtitle="YUMS Technology"
      right={<Row gap={8}><View style={[styles.fav, { backgroundColor: c.surface }]}><FavButton k={'specialist:' + sp.id} /></View><IconButton name="flag-outline" size={42} onPress={() => setReporting(true)} /></Row>}
      footer={
        <Row gap={10}>
          <Button title={tr('Yozish')} kind="ghost" icon="chatbubble-ellipses-outline" style={{ flex: 1 }} onPress={() => start(peer)} />
          <Button title={tr('Ishga taklif qilish')} icon="briefcase" disabled={!sp.available} style={{ flex: 1.4 }} onPress={() => start(peer, { request: true, subject: tr('Loyihaga taklif') })} />
        </Row>
      }>
      <SpecialistIdCard sp={sp} />
      <Row gap={6} style={{ flexWrap: 'wrap', marginTop: -4 }}>
        <Badge label={sp.available ? tr('Buyurtma qabul qiladi') : tr('Hozir band')} icon={sp.available ? 'checkmark-circle' : 'time-outline'} tone={sp.available ? 'ok' : 'muted'} />
        {sp.remote && <Badge label={tr('Masofaviy')} icon="globe-outline" tone="accent" />}
      </Row>

      <KeyValue items={[
        { label: tr('Stavka'), value: tr('{rate} / soat', { rate: `$${sp.rate}` }), icon: 'cash-outline' },
        { label: tr('Reyting'), value: `★ ${sp.rating.toFixed(1)} (${sp.reviews})`, icon: 'star-outline' },
        { label: tr('Tajriba'), value: tr('{experience} yil', { experience: sp.experience }), icon: 'ribbon-outline' },
        { label: tr('Tillar'), value: sp.languages.map(l => LANGUAGES.find(x => x.id === l)?.name ?? l).join(', '), icon: 'language-outline' },
      ]} />

      <Card style={{ gap: 8 }}>
        <Txt v="h3">{tr('Men haqimda')}</Txt>
        <Txt muted style={{ lineHeight: 22 }}>{sp.about}</Txt>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt v="h3">{tr("Ko'nikmalar")}</Txt>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>{sp.skills.map(s => <Badge key={s} label={s} tone="accent" />)}</Row>
      </Card>

      <SectionHeader title={tr('Sharhlar · {reviews}', { reviews: sp.reviews })} />
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
