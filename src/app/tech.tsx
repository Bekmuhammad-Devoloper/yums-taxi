import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { SpecialistCard } from '@/components/platform-ui';
import { Card, Chip, EmptyState, ListItem, Screen, SearchBar, Txt } from '@/components/ui';
import { usePlatform } from '@/lib/platform';

const ROLES: { id: string; label: string; match: RegExp }[] = [
  { id: 'dev', label: 'Dasturchilar', match: /dasturchi|developer|backend|frontend|react/i },
  { id: 'design', label: 'Dizaynerlar', match: /dizayn|design|ui|ux/i },
  { id: 'eng', label: 'Muhandislar', match: /muhandis|engineer|mexatronika|devops/i },
  { id: 'ai', label: 'AI / Data', match: /machine|ai|data|ml/i },
  { id: 'biz', label: 'Biznes va huquq', match: /tahlilchi|product|yurist|manager/i },
  { id: 'qa', label: 'QA', match: /qa|test/i },
];

export default function Tech() {
  const p = usePlatform();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [remote, setRemote] = useState(false);
  const r = ROLES.find(x => x.id === role);
  const t = q.trim().toLowerCase();
  const list = p.specialists.filter(s =>
    !p.isBlocked('specialist', s.id)
    && (!r || r.match.test(s.title))
    && (!available || s.available)
    && (!remote || s.remote)
    && (!t || `${s.name} ${s.title} ${s.skills.join(' ')}`.toLowerCase().includes(t)),
  ).sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating - a.rating);

  return (
    <Screen title="YUMS Technology" subtitle="Dasturchi, muhandis, dizayner va boshqa mutaxassislar">
      <SearchBar value={q} onChangeText={setQ} placeholder="Ko'nikma: React, Figma, PLC…" />
      <View style={{ marginHorizontal: -16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Chip label="Bo'sh" icon="checkmark-circle-outline" active={available} onPress={() => setAvailable(v => !v)} />
          <Chip label="Masofaviy" icon="globe-outline" active={remote} onPress={() => setRemote(v => !v)} />
          {ROLES.map(x => <Chip key={x.id} label={x.label} active={role === x.id} onPress={() => setRole(role === x.id ? null : x.id)} />)}
        </ScrollView>
      </View>
      <Txt v="small" faint>{list.length} ta mutaxassis · tasdiqlanganlar birinchi</Txt>
      {list.length ? list.map(s => <SpecialistCard key={s.id} sp={s} />) : <EmptyState icon="people-outline" title="Mutaxassis topilmadi" sub="Filtrlarni o'zgartiring" />}
      <Card style={{ padding: 6 }}>
        <ListItem icon="person-add-outline" title="Mutaxassis sifatida ro'yxatdan o'tish" sub="Profilingizni to'ldiring va buyurtmalar oling" onPress={() => router.push('/profile-edit')} />
        <ListItem icon="briefcase-outline" title="Vakansiya joylashtirish" sub="Loyiha sifatida — «Mutaxassis izlanmoqda»" onPress={() => router.push('/project/edit')} />
      </Card>
    </Screen>
  );
}
