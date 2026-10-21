import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CompanyCard, Logo } from '@/components/platform-ui';
import { Button, Card, Chip, Row, Screen, Segmented, Txt, Verified } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { SECTORS } from '@/lib/platform-data';
import { countryOf, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';

type Tab = 'companies' | 'offers' | 'services';

export default function Business() {
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const start = useStartChat();
  const [tab, setTab] = useState<Tab>('companies');
  const [sector, setSector] = useState<string | null>(null);
  const companies = p.companies.filter(x => !p.isBlocked('company', x.id) && (!sector || x.sector === sector));
  const sectors = SECTORS.filter(s => p.companies.some(x => x.sector === s.id));

  return (
    <Screen title="YUMS Business" subtitle="Kompaniyalar, xizmatlar va B2B hamkorlik">
      {user?.kind === 'company' && p.plan !== 'business' && (
        <Pressable onPress={() => router.push('/plans')} style={({ pressed }) => [styles.promo, { backgroundColor: c.okSoft, opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="business" size={24} color={c.ok} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">Kompaniya profilini kengaytiring</Txt>
            <Txt v="small" muted>Xizmatlar katalogi, B2B takliflar va xodimlar — Business tarifida</Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.ok} />
        </Pressable>
      )}

      <Segmented<Tab> value={tab} onChange={setTab} items={[{ id: 'companies', label: 'Kompaniyalar' }, { id: 'offers', label: 'B2B takliflar' }, { id: 'services', label: 'Xizmatlar' }]} />

      {tab === 'companies' && (
        <>
          <View style={{ marginHorizontal: -16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              <Chip label="Barchasi" active={!sector} onPress={() => setSector(null)} />
              {sectors.map(s => <Chip key={s.id} label={s.name} icon={s.icon} active={sector === s.id} onPress={() => setSector(sector === s.id ? null : s.id)} />)}
            </ScrollView>
          </View>
          {companies.map(co => <CompanyCard key={co.id} co={co} />)}
        </>
      )}

      {tab === 'offers' && companies.flatMap(co => co.offers.map(o => (
        <Card key={o.id} style={{ gap: 10 }}>
          <Pressable onPress={() => router.push({ pathname: '/company/[id]', params: { id: co.id } })}>
            <Row>
              <Logo name={co.name} color={co.color} size={40} />
              <View style={{ flex: 1 }}>
                <Row gap={4}><Txt v="small" style={{ fontFamily: F.heavy, flexShrink: 1 }} numberOfLines={1}>{co.name}</Txt>{co.verified && <Verified size={13} />}</Row>
                <Txt v="tiny" faint>{countryOf(co.country).flag} {co.city} · B2B taklif</Txt>
              </View>
            </Row>
          </Pressable>
          <Txt v="h3">{o.title}</Txt>
          <Txt v="small" muted style={{ lineHeight: 19 }}>{o.desc}</Txt>
          <Button title="Hamkorlik so'rovi" icon="people" kind="dark" small onPress={() => start({ peerId: co.id, peerName: co.name, peerKind: 'company', peerVerified: co.verified }, { request: true, subject: `B2B: ${o.title}` })} />
        </Card>
      )))}

      {tab === 'services' && companies.map(co => (
        <Card key={co.id} style={{ padding: 6 }}>
          <Pressable onPress={() => router.push({ pathname: '/company/[id]', params: { id: co.id } })} style={{ padding: 10, paddingBottom: 6 }}>
            <Row gap={8}>
              <Logo name={co.name} color={co.color} size={30} />
              <Txt v="h3" style={{ flex: 1 }} numberOfLines={1}>{co.name}</Txt>
              <Ionicons name="chevron-forward" size={16} color={c.faint} />
            </Row>
          </Pressable>
          {co.services.map(s => (
            <Row key={s.title} style={[styles.service, { borderTopColor: c.line }]}>
              <Txt style={{ flex: 1 }} numberOfLines={2}>{s.title}</Txt>
              <Txt v="small" style={{ fontFamily: F.heavy }}>{s.price ?? 'Kelishuv'}</Txt>
            </Row>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l },
  service: { paddingHorizontal: 10, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
