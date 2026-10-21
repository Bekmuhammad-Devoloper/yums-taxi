import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanyCard, InvestorCard, MarketCard, PickerSheet, ProjectCard, SpecialistCard } from '@/components/platform-ui';
import { Chip, EmptyState, Row, SearchBar, Txt } from '@/components/ui';
import { useContactInvestor } from '@/lib/actions';
import { COUNTRIES, LANGUAGES, SECTORS, STAGES, type Country } from '@/lib/platform-data';
import { countryOf, sectorOf, usePlatform } from '@/lib/platform';
import { SECTOR_ART } from '@/lib/sector-art';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

export type SearchType = 'projects' | 'companies' | 'specialists' | 'market' | 'investors';
const TYPES: SearchType[] = ['projects', 'companies', 'specialists', 'market', 'investors'];
const REGIONS: (Country['region'] | 'all')[] = ['all', 'Osiyo', 'Yevropa', 'Amerika', 'Afrika'];
type Sort = 'new' | 'popular' | 'rating';
type Picker = 'sector' | 'country' | 'language' | 'stage' | 'sort' | null;

const SORTS: { id: Sort; label: string }[] = [
  { id: 'new', label: 'Avval yangilari' },
  { id: 'popular', label: 'Ommaboplari' },
  { id: 'rating', label: 'Reyting / byudjet' },
];

export default function World() {
  const params = useLocalSearchParams<{ type?: SearchType; sector?: string; q?: string; country?: string }>();
  const { colors: c, t } = useStore();
  const p = usePlatform();
  const contact = useContactInvestor();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<SearchType>('projects');
  const [q, setQ] = useState('');
  const [sector, setSector] = useState<string[]>([]);
  const [country, setCountry] = useState<string[]>([]);
  const [language, setLanguage] = useState<string[]>([]);
  const [stage, setStage] = useState<string[]>([]);
  const [region, setRegion] = useState<(typeof REGIONS)[number]>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('new');
  const [picker, setPicker] = useState<Picker>(null);

  // Boshqa ekrandan filtr bilan ochilganda — parametrlar o'zgarsa holatni moslaymiz
  const paramKey = [params.type, params.sector, params.country, params.q].join('|');
  const [seenKey, setSeenKey] = useState('');
  if (paramKey !== seenKey) {
    setSeenKey(paramKey);
    if (params.type && TYPES.includes(params.type)) setType(params.type);
    if (params.sector) setSector([params.sector]);
    if (params.country) setCountry([params.country]);
    if (params.q) setQ(params.q);
  }

  const text = q.trim().toLowerCase();
  const has = (s: string) => !text || s.toLowerCase().includes(text);
  const inRegion = (code: string) => region === 'all' || countryOf(code).region === region;
  const okCountry = (code: string) => (!country.length || country.includes(code)) && inRegion(code);
  const okSector = (id: string | string[]) => !sector.length || (Array.isArray(id) ? id.some(x => sector.includes(x)) : sector.includes(id));
  const okLang = (ls: string[]) => !language.length || ls.some(l => language.includes(l));

  const results = useMemo(() => {
    switch (type) {
      case 'projects': {
        const list = p.publicProjects.filter(x =>
          has(`${x.title} ${x.summary} ${x.ownerName} ${x.city} ${sectorOf(x.sector).name}`) && okSector(x.sector) && okCountry(x.country) && okLang(x.languages)
          && (!stage.length || stage.includes(x.stage)) && (!verifiedOnly || x.ownerVerified));
        return list.sort((a, b) => sort === 'popular' ? b.views - a.views : sort === 'rating' ? b.budgetMax - a.budgetMax : Number(!!b.boosted) - Number(!!a.boosted) || b.createdAt.localeCompare(a.createdAt));
      }
      case 'companies':
        return p.companies.filter(x => !p.isBlocked('company', x.id) && has(`${x.name} ${x.about} ${x.city} ${x.services.map(s => s.title).join(' ')}`) && okSector(x.sector) && okCountry(x.country) && okLang(x.languages) && (!verifiedOnly || x.verified))
          .sort((a, b) => sort === 'new' ? b.founded - a.founded : b.rating - a.rating);
      case 'specialists':
        return p.specialists.filter(x => !p.isBlocked('specialist', x.id) && has(`${x.name} ${x.title} ${x.skills.join(' ')} ${x.city}`) && okSector(x.sector) && okCountry(x.country) && okLang(x.languages) && (!verifiedOnly || x.verified))
          .sort((a, b) => sort === 'popular' ? b.reviews - a.reviews : b.rating - a.rating);
      case 'market':
        return p.publicMarket.filter(x => has(`${x.title} ${x.desc} ${x.sellerName}`) && okSector(x.sector) && okCountry(x.country) && (!verifiedOnly || x.sellerVerified))
          .sort((a, b) => sort === 'rating' ? b.price - a.price : b.createdAt.localeCompare(a.createdAt));
      case 'investors':
        return p.investors.filter(x => !p.isBlocked('investor', x.id) && has(`${x.name} ${x.about}`) && okSector(x.sectors) && okCountry(x.country) && (!stage.length || x.stages.some(s => stage.includes(s))) && (!verifiedOnly || x.verified))
          .sort((a, b) => b.deals - a.deals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, text, sector, country, language, stage, region, verifiedOnly, sort, p.publicProjects, p.publicMarket, p.blocked]);

  const activeCount = sector.length + country.length + language.length + stage.length + (region !== 'all' ? 1 : 0) + (verifiedOnly ? 1 : 0);
  const reset = () => { setSector([]); setCountry([]); setLanguage([]); setStage([]); setRegion('all'); setVerifiedOnly(false); setQ(''); };
  const showLang = type === 'projects' || type === 'companies' || type === 'specialists';
  const showStage = type === 'projects' || type === 'investors';

  const label = (prefix: string, ids: string[], name: (id: string) => string) => (ids.length ? (ids.length === 1 ? name(ids[0]) : `${prefix} · ${ids.length}`) : prefix);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, gap: 12, paddingBottom: 6 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt v="h1">{t('world.title')}</Txt>
            <Txt v="small" muted>{t('sec.world')}</Txt>
          </View>
          {activeCount > 0 && (
            <Pressable onPress={() => { haptic.tap(); reset(); }} hitSlop={8} style={[styles.reset, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="close" size={14} color={c.danger} />
              <Txt v="tiny" color={c.danger}>{t('world.reset')} · {activeCount}</Txt>
            </Pressable>
          )}
        </Row>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('home.search')} />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {TYPES.map(x => <Chip key={x} label={t(`type.${x}`)} active={type === x} onPress={() => { setType(x); setStage([]); }} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingTop: 0 }]}>
          <Filter label={label(t('world.sector'), sector, id => sectorOf(id).name)} on={!!sector.length} onPress={() => setPicker('sector')} />
          <Filter label={label(t('world.country'), country, id => countryOf(id).name)} on={!!country.length} onPress={() => setPicker('country')} />
          {showLang && <Filter label={label(t('world.language'), language, id => LANGUAGES.find(l => l.id === id)?.name ?? id)} on={!!language.length} onPress={() => setPicker('language')} />}
          {showStage && <Filter label={label(t('world.stage'), stage, id => STAGES.find(s => s.id === id)?.name ?? id)} on={!!stage.length} onPress={() => setPicker('stage')} />}
          <Filter label={t('common.verified')} icon="checkmark-circle" on={verifiedOnly} onPress={() => setVerifiedOnly(v => !v)} toggle />
          <Filter label={SORTS.find(s => s.id === sort)!.label} icon="swap-vertical" on={false} onPress={() => setPicker('sort')} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingTop: 0, gap: 14 }]}>
          {REGIONS.map(r => (
            <Pressable key={r} onPress={() => { haptic.tap(); setRegion(r); }} hitSlop={6}>
              <Txt v="small" color={region === r ? c.text : c.faint} style={{ fontFamily: F.heavy, textDecorationLine: region === r ? 'underline' : 'none' }}>
                {r === 'all' ? 'Butun dunyo' : r}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={results as { id: string }[]}
        keyExtractor={x => x.id}
        numColumns={type === 'market' ? 2 : 1}
        key={type === 'market' ? 'grid' : 'list'}
        columnWrapperStyle={type === 'market' ? { gap: 12 } : undefined}
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<Txt v="small" faint>{results.length} {t('world.results')}</Txt>}
        ListEmptyComponent={<EmptyState icon="search-outline" title={t('world.empty')} sub={t('world.emptySub')} action={activeCount ? t('world.reset') : undefined} onAction={reset} />}
        renderItem={({ item }) => {
          switch (type) {
            case 'projects': return <ProjectCard p={item as never} />;
            case 'companies': return <CompanyCard co={item as never} />;
            case 'specialists': return <SpecialistCard sp={item as never} />;
            case 'market': return <MarketCard m={item as never} style={{ flex: 1, maxWidth: '48.5%' }} />;
            case 'investors': return <InvestorCard inv={item as never} onContact={() => contact(item as never)} />;
          }
        }}
      />

      <PickerSheet visible={picker === 'sector'} onClose={() => setPicker(null)} title={t('world.sector')} multi selected={sector} onChange={setSector}
        options={SECTORS.map(s => ({ id: s.id, label: s.name, icon: s.icon, art: SECTOR_ART[s.id], sub: s.examples }))} />
      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title={t('world.country')} multi selected={country} onChange={setCountry}
        options={COUNTRIES.map(k => ({ id: k.code, label: k.name, flag: k.code, sub: k.region }))} />
      <PickerSheet visible={picker === 'language'} onClose={() => setPicker(null)} title={t('world.language')} multi selected={language} onChange={setLanguage}
        options={LANGUAGES.map(l => ({ id: l.id, label: l.name, flag: l.flag }))} />
      <PickerSheet visible={picker === 'stage'} onClose={() => setPicker(null)} title={t('world.stage')} multi selected={stage} onChange={setStage}
        options={STAGES.map(s => ({ id: s.id, label: s.name, icon: s.icon }))} />
      <PickerSheet visible={picker === 'sort'} onClose={() => setPicker(null)} title={t('world.sort')} selected={[sort]} onChange={ids => setSort(ids[0] as Sort)}
        options={SORTS.map(s => ({ id: s.id, label: s.label }))} />
    </View>
  );
}

function Filter({ label, on, onPress, icon, toggle }: { label: string; on: boolean; onPress: () => void; icon?: 'checkmark-circle' | 'swap-vertical'; toggle?: boolean }) {
  const { colors: c } = useStore();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} style={[styles.filter, { backgroundColor: on ? c.brandSoft : c.surface, borderColor: on ? c.brand : c.line }]}>
      {icon && <Ionicons name={icon} size={15} color={on ? c.brandDeep : c.muted} />}
      <Txt v="small" style={{ fontFamily: F.bold }} numberOfLines={1}>{label}</Txt>
      {!toggle && !icon && <Ionicons name="chevron-down" size={14} color={c.faint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, maxWidth: 220 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
});
