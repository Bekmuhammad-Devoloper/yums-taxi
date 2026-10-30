import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InvestorCard, ProjectCard } from '@/components/platform-ui';
import { Card, Chip, ListItem, Row, Screen, Segmented, Txt } from '@/components/ui';
import { useContactInvestor } from '@/lib/actions';
import { INVESTOR_KINDS, type Investor } from '@/lib/platform-data';
import { short, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { tr } from '@/lib/i18n';

type Tab = 'investors' | 'projects';

export default function Invest() {
  const { colors: c } = useStore();
  const p = usePlatform();
  const contact = useContactInvestor();
  const [tab, setTab] = useState<Tab>('investors');
  const [kind, setKind] = useState<Investor['kind'] | null>(null);
  const investors = p.investors.filter(x => !p.isBlocked('investor', x.id) && (!kind || x.kind === kind));
  const seeking = p.publicProjects.filter(x => x.seeking.includes('investment')).sort((a, b) => b.views - a.views);
  const total = seeking.reduce((n, x) => n + x.budgetMax, 0);

  return (
    <Screen title="YUMS Invest" subtitle={tr("Investorlar va loyiha egalarini bog'lash")}>
      <View style={[styles.legal, { backgroundColor: c.violetSoft }]}>
        <Ionicons name="shield-checkmark" size={20} color={c.violet} />
        <Txt v="small" color={c.violet} style={{ flex: 1, lineHeight: 19 }}>
          
          {tr("YUMS investitsiya takliflari haqida ma'lumot joylashtiradi va tomonlarni bog'laydi. Mablag' qabul qilish va bitimlar faqat litsenziyalangan moliyaviy hamkorlar orqali, amaldagi qonunchilikka muvofiq amalga oshiriladi.")}
        </Txt>
      </View>

      <Row gap={10}>
        <Card style={{ flex: 1, gap: 2 }}><Txt v="tiny" faint>{tr('Investorlar')}</Txt><Txt v="h2">{p.investors.length}</Txt></Card>
        <Card style={{ flex: 1, gap: 2 }}><Txt v="tiny" faint>{tr('Loyihalar')}</Txt><Txt v="h2">{seeking.length}</Txt></Card>
        <Card style={{ flex: 1, gap: 2 }}><Txt v="tiny" faint>{tr("So'rov hajmi")}</Txt><Txt v="h2">${short(total)}</Txt></Card>
      </Row>

      <Segmented<Tab> value={tab} onChange={setTab} items={[{ id: 'investors', label: tr('Investorlar') }, { id: 'projects', label: tr('Loyihalar') }]} />

      {tab === 'investors' ? (
        <>
          <View style={{ marginHorizontal: -16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              <Chip label={tr('Barchasi')} active={!kind} onPress={() => setKind(null)} />
              {(Object.keys(INVESTOR_KINDS) as Investor['kind'][]).map(k => <Chip key={k} label={INVESTOR_KINDS[k]} active={kind === k} onPress={() => setKind(kind === k ? null : k)} />)}
            </ScrollView>
          </View>
          {investors.map(inv => <InvestorCard key={inv.id} inv={inv} onContact={() => contact(inv)} />)}
        </>
      ) : (
        seeking.map(x => <ProjectCard key={x.id} p={x} />)
      )}

      <Card style={{ padding: 6 }}>
        <ListItem icon="add-circle-outline" title={tr('Investitsiya uchun loyiha joylashtirish')} sub={tr("Bepul · moderatsiyadan so'ng ko'rinadi")} onPress={() => router.push('/project/edit')} />
        <ListItem icon="briefcase-outline" title={tr("Investor sifatida qo'shilish")} sub={tr('Hujjatlar tekshiruvi talab qilinadi')} onPress={() => router.push('/verify')} />
        <ListItem icon="analytics-outline" title={tr('Loyiha tahlili xizmati')} sub={tr('Investorlar uchun ekspert xulosasi')} onPress={() => router.push('/plans')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  legal: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
});
