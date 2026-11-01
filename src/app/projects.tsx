import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ProjectCard } from '@/components/platform-ui';
import { Chip, EmptyState, IconButton, Screen, Segmented, Txt } from '@/components/ui';
import { STAGES, STATUS_META, type ListingStatus, type Stage } from '@/lib/platform-data';
import { usePlatform } from '@/lib/platform';
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
  const mine = p.myProjects.filter(x => !status || x.status === status);
  const statuses = (Object.keys(STATUS_META) as ListingStatus[]).filter(s => p.myProjects.some(x => x.status === s));

  return (
    <Screen title="YUMS Project" subtitle={tr('Loyihalarni joylashtirish va topish')} right={<IconButton name="add" size={42} onPress={() => router.push('/project/edit')} />}>
      <Segmented<Tab> value={tab} onChange={setTab} items={[{ id: 'all', label: tr('Katalog') }, { id: 'mine', label: tr('Mening loyihalarim · {length}', { length: p.myProjects.length }) }]} />
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

      {tab === 'all' ? (
        <>
          <Txt v="small" faint>{tr("{length} ta faol loyiha · TOP loyihalar birinchi ko'rsatiladi", { length: all.length })}</Txt>
          {all.length ? all.map(x => <ProjectCard key={x.id} p={x} />) : <EmptyState icon="rocket-outline" title={tr("Bu bosqichda loyiha yo'q")} />}
        </>
      ) : mine.length ? (
        mine.map(x => <ProjectCard key={x.id} p={x} mine />)
      ) : (
        <EmptyState icon="bulb-outline" title={tr("Hali loyihalaringiz yo'q")} sub={tr("G'oyangizni joylashtiring — moderatsiyadan so'ng u butun dunyo bo'ylab ko'rinadi")} action={tr('Loyiha yaratish')} onAction={() => router.push('/project/edit')} />
      )}
    </Screen>
  );
}
