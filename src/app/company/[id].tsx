import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { FavButton, KeyValue, Logo, Place, ProjectCard, ReportSheet } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Badge, Button, Card, EmptyState, IconButton, Row, Screen, SectionHeader, Txt, Verified } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { LANGUAGES } from '@/lib/platform-data';
import { countryOf, sectorOf, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c } = useStore();
  const p = usePlatform();
  const start = useStartChat();
  const [reporting, setReporting] = useState(false);
  const co = p.companies.find(x => x.id === id);

  if (!co || p.isBlocked('company', co.id)) {
    return <Screen title="Kompaniya"><EmptyState icon="business-outline" title="Kompaniya topilmadi" sub="Profil o'chirilgan yoki moderator tomonidan cheklangan" /></Screen>;
  }
  const k = countryOf(co.country);
  const sec = sectorOf(co.sector);
  const projects = p.publicProjects.filter(x => x.ownerId === co.id);
  const peer = { peerId: co.id, peerName: co.name, peerKind: 'company' as const, peerVerified: co.verified };

  return (
    <Screen
      title={co.name}
      subtitle="YUMS Business"
      right={<Row gap={8}><View style={[styles.fav, { backgroundColor: c.surface }]}><FavButton k={'company:' + co.id} /></View><IconButton name="flag-outline" size={42} onPress={() => setReporting(true)} /></Row>}
      footer={
        <Row gap={10}>
          <Button title="Hamkorlik so'rovi" kind="ghost" icon="people-outline" style={{ flex: 1 }} onPress={() => start(peer, { request: true, subject: "B2B hamkorlik" })} />
          <Button title="Yozish" icon="chatbubble-ellipses" style={{ flex: 1 }} onPress={() => start(peer)} />
        </Row>
      }>
      <Card style={{ gap: 14 }}>
        <Row>
          <Logo name={co.name} color={co.color} size={68} />
          <View style={{ flex: 1, gap: 3 }}>
            <Row gap={5}><Txt v="h2" numberOfLines={2} style={{ flexShrink: 1 }}>{co.name}</Txt>{co.verified && <Verified size={18} />}</Row>
            <Place code={k.code} city={co.city} />
            <Row gap={6}>
              <Badge label={sec.name} />
              {co.plan === 'business' && <Badge label="Business" icon="diamond" tone="violet" />}
            </Row>
          </View>
        </Row>
        <Txt muted style={{ lineHeight: 22 }}>{co.about}</Txt>
        {!co.verified && (
          <View style={[styles.note, { backgroundColor: c.warnSoft }]}>
            <Ionicons name="alert-circle-outline" size={18} color={c.warn} />
            <Txt v="small" color={c.warn} style={{ flex: 1 }}>Kompaniya hujjatlari hali tekshirilmagan. Shartnoma tuzishdan oldin ma'lumotlarni mustaqil tekshiring.</Txt>
          </View>
        )}
      </Card>

      <KeyValue items={[
        { label: 'Tashkil etilgan', value: String(co.founded), icon: 'calendar-outline' },
        { label: 'Xodimlar', value: co.employees, icon: 'people-outline' },
        { label: 'Reyting', value: `★ ${co.rating.toFixed(1)}`, icon: 'star-outline' },
        { label: 'Tillar', value: co.languages.map(l => LANGUAGES.find(x => x.id === l)?.name ?? l).join(', '), icon: 'language-outline' },
      ]} />

      {co.website && (
        <Card onPress={() => Linking.openURL(`https://${co.website}`).catch(() => toast('Sayt ochilmadi', 'globe'))}>
          <Row><Ionicons name="globe-outline" size={20} color={c.accent} /><Txt color={c.accent} style={{ flex: 1, fontFamily: F.bold }}>{co.website}</Txt><Ionicons name="open-outline" size={18} color={c.faint} /></Row>
        </Card>
      )}

      <SectionHeader title="Xizmatlar katalogi" />
      <Card style={{ paddingVertical: 4 }}>
        {co.services.map((s, i) => (
          <Row key={s.title} style={[styles.service, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={c.ok} />
            <Txt style={{ flex: 1 }}>{s.title}</Txt>
            <Txt v="small" style={{ fontFamily: F.heavy }}>{s.price ?? 'Kelishuv'}</Txt>
          </Row>
        ))}
      </Card>

      {co.offers.length > 0 && <SectionHeader title="B2B takliflar" />}
      {co.offers.map(o => (
        <Card key={o.id} style={{ gap: 8, backgroundColor: c.okSoft }}>
          <Row gap={8}><Ionicons name="hand-left" size={18} color={c.ok} /><Txt v="h3" style={{ flex: 1 }}>{o.title}</Txt></Row>
          <Txt v="small" muted>{o.desc}</Txt>
          <Button title="Qiziqish bildirish" small kind="dark" onPress={() => start(peer, { request: true, subject: `B2B: ${o.title}` })} />
        </Card>
      ))}

      {projects.length > 0 && <SectionHeader title="Kompaniya loyihalari" />}
      {projects.map(x => <ProjectCard key={x.id} p={x} />)}

      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind="company" id={co.id} title={co.name} />
      <Txt v="tiny" faint style={{ textAlign: 'center' }} onPress={() => router.push('/legal')}>Ma'lumotlar kompaniya tomonidan taqdim etilgan · Qoidalar</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fav: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  service: { paddingVertical: 13 },
});
