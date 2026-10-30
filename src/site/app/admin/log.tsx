// Jurnal: operator amallari, avtomatik qarorlar (hujjatlar tekshiruvi) va tizim hodisalari — qachon, kim, nima.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { toast } from '@/components/toast';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { Btn, Empty, Page, Panel, Seg, StatTile, downloadCsv, hm } from '@/site/components/admin/ui';
import { useAdmin } from '@/site/lib/admin-store';
import type { LogEntry } from '@/site/lib/admin-types';

type Kind = LogEntry['kind'];
type Filter = Kind | 'all';
const KIND: Record<Kind, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  admin: { label: 'Operator', icon: 'person-circle', color: '#2a78d6' },
  auto: { label: 'Avtomatik', icon: 'sparkles', color: '#1baf7a' },
  system: { label: 'Tizim', icon: 'pulse', color: '#8A93A6' },
};
const DOC_DECISION = /(tasdiqlandi|rad etildi)/;
const PAGE = 120;

function dayTitle(iso: string, now: number) {
  const d = new Date(iso), t = new Date(now);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(t) - day(d)) / 86400000);
  if (diff === 0) return 'Bugun';
  if (diff === 1) return 'Kecha';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Log() {
  const { colors: c } = useStore();
  const { state, derived } = useAdmin();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const now = derived?.at ?? 0;

  const all = useMemo(() => [...state.log].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), [state.log]);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter(e => (filter === 'all' || e.kind === filter) && (!query || e.text.toLowerCase().includes(query) || (e.driverId && state.drivers[e.driverId]?.name.toLowerCase().includes(query))));
  }, [all, filter, q, state.drivers]);

  const stats = useMemo(() => {
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
    const today = all.filter(e => Date.parse(e.at) >= d0.getTime());
    const docs = today.filter(e => e.driverId && DOC_DECISION.test(e.text) && e.kind !== 'system');
    const auto = docs.filter(e => e.kind === 'auto').length;
    return {
      count: (k: Kind) => today.filter(e => e.kind === k).length,
      autoShare: docs.length ? auto / docs.length : null,
      docs: docs.length, auto,
    };
  }, [all, now]);

  const exportCsv = () => {
    downloadCsv('yums-jurnal', ['Vaqt', 'Turi', 'Hodisa', 'Haydovchi'], rows.map(e => [e.at, KIND[e.kind].label, e.text, e.driverId ? state.drivers[e.driverId]?.name ?? e.driverId : '']));
    toast(`${rows.length} ta yozuv yuklab olindi`, 'download');
  };

  const shown = rows.slice(0, limit);
  return (
    <Page title="Jurnal" sub={`${all.length} ta yozuv · operator amallari, avtomatik qarorlar va tizim hodisalari`}
      actions={Platform.OS === 'web' ? <Btn title="CSV yuklab olish" icon="download" onPress={exportCsv} disabled={!rows.length} /> : undefined}>
      <View style={styles.tiles}>
        <StatTile icon="person-circle" label="Operator amallari" value={String(stats.count('admin'))} sub="bugun" onPress={() => setFilter('admin')} />
        <StatTile icon="sparkles" label="Avtomatik qarorlar" value={String(stats.count('auto'))} sub="bugun · hujjatlar tekshiruvi" onPress={() => setFilter('auto')} />
        <StatTile icon="pulse" label="Tizim hodisalari" value={String(stats.count('system'))} sub="yangi haydovchi, ariza, hujjat" onPress={() => setFilter('system')} />
        <StatTile icon="flash" label="Avtomatik hal qilingan" value={stats.autoShare == null ? '—' : `${Math.round(stats.autoShare * 100)}%`} sub={stats.docs ? `bugungi ${stats.docs} ta hujjat qaroridan ${stats.auto} tasi` : 'bugun hujjat qarori yo\'q'} />
      </View>
      <View style={styles.filters}>
        <Seg<Filter> items={[{ id: 'all', label: 'Hammasi', count: all.length }, ...(['admin', 'auto', 'system'] as const).map(k => ({ id: k, label: KIND[k].label, count: all.filter(e => e.kind === k).length }))]}
          value={filter} onChange={f => { setFilter(f); setLimit(PAGE); }} />
        <View style={[styles.search, { backgroundColor: c.surface2 }]}>
          <Ionicons name="search" size={16} color={c.faint} />
          <TextInput value={q} onChangeText={v => { setQ(v); setLimit(PAGE); }} placeholder="Matn yoki haydovchi" placeholderTextColor={c.faint} style={[styles.searchInput, { color: c.text }]} accessibilityLabel="Jurnaldan qidirish" />
        </View>
      </View>
      <Panel pad={false} style={{ overflow: 'hidden' }}>
        {shown.length ? shown.map((e, i) => {
          const k = KIND[e.kind];
          const day = dayTitle(e.at, now);
          const driver = e.driverId ? state.drivers[e.driverId] : undefined;
          const go = driver ? `/admin/drivers/${driver.id}` : e.leadId ? `/admin/leads?id=${e.leadId}` : null;
          return (
            <View key={e.id}>
              {i === 0 || dayTitle(shown[i - 1].at, now) !== day ? <Text style={[styles.day, { color: c.muted, backgroundColor: c.surface2 }]}>{day}</Text> : null}
              <Pressable onPress={go ? () => router.push(go as never) : undefined} disabled={!go} accessibilityRole={go ? 'link' : undefined}
                style={({ hovered }: { hovered?: boolean }) => [styles.row, { borderBottomColor: c.line, backgroundColor: hovered && go ? c.surface2 : 'transparent' }]}>
                <Text style={[styles.time, { color: c.faint }]}>{hm(e.at)}</Text>
                <View style={[styles.icon, { backgroundColor: k.color + '22' }]}><Ionicons name={k.icon} size={15} color={k.color} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.text, { color: c.text }]}>{e.text}</Text>
                  <Text style={[styles.sub, { color: c.faint }]}>{k.label}{driver ? ` · ${driver.name}` : ''}{e.leadId ? ' · ariza' : ''}</Text>
                </View>
                {go ? <Ionicons name="chevron-forward" size={16} color={c.faint} /> : null}
              </Pressable>
            </View>
          );
        }) : <Empty icon="document-text" title="Yozuv topilmadi" sub={q ? 'Qidiruv so\'zini o\'zgartiring' : undefined} />}
        {rows.length > limit ? (
          <Pressable onPress={() => setLimit(l => l + PAGE)} style={styles.more} accessibilityRole="button">
            <Text style={[styles.link, { color: c.accent }]}>Yana ko&apos;rsatish ({rows.length - limit} ta qoldi)</Text>
          </Pressable>
        ) : null}
      </Panel>
    </Page>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, borderRadius: 12, paddingHorizontal: 12, flexGrow: 1, minWidth: 220, maxWidth: 380 },
  searchInput: { flex: 1, fontFamily: F.semi, fontSize: 13.5, height: 36 },
  day: { fontFamily: F.bold, fontSize: 12, paddingHorizontal: 16, paddingVertical: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  time: { fontFamily: F.semi, fontSize: 12.5, width: 42, fontVariant: ['tabular-nums'] },
  icon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: F.semi, fontSize: 13.5, lineHeight: 19 },
  sub: { fontFamily: F.medium, fontSize: 12 },
  more: { padding: 14, alignItems: 'center' },
  link: { fontFamily: F.bold, fontSize: 13 },
});
