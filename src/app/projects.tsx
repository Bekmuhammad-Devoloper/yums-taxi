import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { HowItWorks, StartHero } from '@/components/listing-ui';
import { ProjectCard } from '@/components/platform-ui';
import { Chip, EmptyState, IconButton, Screen, Segmented, Txt } from '@/components/ui';
import { STAGES, STATUS_META, type ListingStatus, type Stage } from '@/lib/platform-data';
import { usePlatform } from '@/lib/platform';
import { SECTION_ART } from '@/lib/section-art';
import { tr } from '@/lib/i18n';

type Tab = 'all' | 'mine';

export default function Projects() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const p = usePlatform();
  const [tab, setTab] = useState<Tab>(params.tab === 'mine' ? 'mine' : 'all');
  const [stage, setStage] = useState<Stage | null>(null);
  const [status, setStatus] = useState<ListingStatus | null>(null);

  const all = p.publicProjects.filter(x => !stage || x.stage === stage)
    .sort((a, b) => Number(!!b.boosted) - Number(!!a.boosted) || b.createdAt.localeCompare(a.createdAt));
  const statuses = (Object.keys(STATUS_META) as ListingStatus[]).filter(s => p.myProjects.some(x => x.status === s));
  // Holat bo'yicha saralash faqat ikki va undan ko'p holat bo'lganda ma'noli — bittasida yolg'iz «Barchasi» turib qolardi
  const byStatus = statuses.length > 1;
  const mine = p.myProjects.filter(x => !byStatus || !status || x.status === status);
  const create = () => router.push('/project/edit');

  return (
    <Screen title="YUMS Project" subtitle={tr('Loyihalarni joylashtirish va topish')} right={<IconButton name="add" size={42} onPress={create} />}>
      <Segmented<Tab> value={tab} onChange={setTab} items={[{ id: 'all', label: tr('Katalog') }, { id: 'mine', label: tr('Mening loyihalarim · {length}', { length: p.myProjects.length }) }]} />
      {(tab === 'all' || byStatus) && (
        <View style={{ marginHorizontal: -16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {tab === 'all' ? (
              <>
                <Chip label={tr('Barchasi')} active={!stage} onPress={() => setStage(null)} />
                {STAGES.map(s => <Chip key={s.id} label={s.name} icon={s.icon} active={stage === s.id} onPress={() => setStage(stage === s.id ? null : s.id)} />)}
              </>
            ) : (
              <>
                <Chip label={tr('Barchasi')} active={!status} onPress={() => setStatus(null)} />
                {statuses.map(s => <Chip key={s} label={STATUS_META[s].name} icon={STATUS_META[s].icon} active={status === s} onPress={() => setStatus(status === s ? null : s)} />)}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {tab === 'all' ? (
        <>
          <Txt v="small" faint>{tr("{length} ta faol loyiha · TOP loyihalar birinchi ko'rsatiladi", { length: all.length })}</Txt>
          {all.length ? all.map(x => <ProjectCard key={x.id} p={x} />) : <EmptyState icon="rocket-outline" title={tr("Bu bosqichda loyiha yo'q")} />}
        </>
      ) : mine.length ? (
        mine.map(x => <ProjectCard key={x.id} p={x} mine />)
      ) : (
        <>
          <StartHero
            kicker="YUMS PROJECT"
            title={tr('Birinchi loyihangizni joylashtiring')}
            sub={tr("G'oyangizni joylashtiring — moderatsiyadan so'ng u butun dunyo bo'ylab ko'rinadi")}
            cta={tr('Loyiha yaratish')}
            art={SECTION_ART.project}
            onPress={create}
          />
          <HowItWorks
            steps={[
              tr('Loyiha haqida qisqacha yozing: muammo, yechim, natija'),
              tr('Nimani izlayotganingizni belgilang: investitsiya, hamkor, mutaxassis'),
              tr("Moderatsiyadan so'ng loyihangizni butun dunyo ko'radi"),
            ]}
          />
        </>
      )}
    </Screen>
  );
}
