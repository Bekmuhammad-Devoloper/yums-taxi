import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { CompanyCard, InvestorCard, MarketCard, ProjectCard, SpecialistCard } from '@/components/platform-ui';
import { Chip, EmptyState, Row, Screen, type IconName } from '@/components/ui';
import { useContactInvestor } from '@/lib/actions';
import { usePlatform } from '@/lib/platform';

type Tab = 'project' | 'company' | 'specialist' | 'market' | 'investor';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'project', label: 'Loyihalar', icon: 'rocket-outline' },
  { id: 'company', label: 'Kompaniyalar', icon: 'business-outline' },
  { id: 'specialist', label: 'Mutaxassislar', icon: 'code-slash-outline' },
  { id: 'market', label: 'Bozor', icon: 'storefront-outline' },
  { id: 'investor', label: 'Investorlar', icon: 'trending-up-outline' },
];

export default function Favorites() {
  const p = usePlatform();
  const contact = useContactInvestor();
  const [tab, setTab] = useState<Tab>('project');
  const ids = (k: Tab) => p.favorites.filter(f => f.startsWith(k + ':')).map(f => f.slice(k.length + 1));
  const count = (k: Tab) => ids(k).length;

  const projects = p.publicProjects.filter(x => ids('project').includes(x.id));
  const companies = p.companies.filter(x => ids('company').includes(x.id));
  const specialists = p.specialists.filter(x => ids('specialist').includes(x.id));
  const market = p.publicMarket.filter(x => ids('market').includes(x.id));
  const investors = p.investors.filter(x => ids('investor').includes(x.id));
  const empty = { project: projects, company: companies, specialist: specialists, market, investor: investors }[tab].length === 0;

  const rows: (typeof market)[] = [];
  for (let i = 0; i < market.length; i += 2) rows.push(market.slice(i, i + 2));

  return (
    <Screen title="Saqlanganlar">
      <View style={{ marginHorizontal: -16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {TABS.map(x => <Chip key={x.id} label={count(x.id) ? `${x.label} · ${count(x.id)}` : x.label} icon={x.icon} active={tab === x.id} onPress={() => setTab(x.id)} />)}
        </ScrollView>
      </View>
      {empty && <EmptyState icon="bookmark-outline" title="Hali hech narsa saqlanmagan" sub="Kartadagi 🔖 belgisini bosib, keyinroq ko'rish uchun saqlang" action="Qidiruvga o'tish" onAction={() => router.push('/world')} />}
      {tab === 'project' && projects.map(x => <ProjectCard key={x.id} p={x} />)}
      {tab === 'company' && companies.map(x => <CompanyCard key={x.id} co={x} />)}
      {tab === 'specialist' && specialists.map(x => <SpecialistCard key={x.id} sp={x} />)}
      {tab === 'investor' && investors.map(x => <InvestorCard key={x.id} inv={x} onContact={() => contact(x)} />)}
      {tab === 'market' && rows.map((r, i) => (
        <Row key={i} gap={12} style={{ alignItems: 'stretch' }}>
          {r.map(m => <MarketCard key={m.id} m={m} style={{ flex: 1 }} />)}
          {r.length === 1 && <View style={{ flex: 1 }} />}
        </Row>
      ))}
    </Screen>
  );
}
