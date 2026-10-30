// Haydovchilar: holat bo'yicha filtr, qidiruv, ko'rsatkichlar (qabul, bekor qilish, reyting), hujjatlar va xavf belgisi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { DocsPill, DriverAvatar, StatusPill } from '@/site/components/admin/bits';
import { NoticeDialog } from '@/site/components/admin/dialogs';
import { Btn, Cell, Page, Panel, Pill, Seg, Table, money, type Column } from '@/site/components/admin/ui';
import { useAdmin } from '@/site/lib/admin-store';
import { driverRisk } from '@/site/lib/insights';

type Filter = 'all' | 'online' | 'free' | 'busy' | 'pending' | 'blocked' | 'risk';
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default function Drivers() {
  const { colors: c } = useStore();
  const params = useLocalSearchParams<{ f?: string }>();
  const { state, list } = useAdmin();
  const [filter, setFilter] = useState<Filter>(params.f === 'online' ? 'online' : 'all');
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState(false);

  const today = useMemo(() => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return list.filter(o => Date.parse(o.createdAt) >= d0.getTime());
  }, [list]);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase().replace(/\s+/g, '');
    return Object.values(state.drivers).map(d => {
      const mine = today.filter(o => o.driverId === d.id && o.status === 'finished');
      return { d, live: state.live[d.id], risk: driverRisk(d, today), todayCount: mine.length, todaySum: mine.reduce((n, o) => n + (o.finalPrice ?? o.price), 0) };
    }).filter(({ d, live, risk }) => {
      if (query && ![d.name, d.plate ?? '', d.phone ?? '', d.car ?? ''].some(x => x.toLowerCase().replace(/\s+/g, '').includes(query))) return false;
      switch (filter) {
        case 'online': return !!live && !live.pending;
        case 'free': return !!live && !live.busy && !live.pending;
        case 'busy': return !!live?.busy;
        case 'pending': return Object.values(d.docs).some(x => x?.status === 'review') || !!live?.pending;
        case 'blocked': return !!d.blocked;
        case 'risk': return risk.level > 0 && !d.blocked;
        default: return true;
      }
    }).sort((a, b) => Number(!!b.live) - Number(!!a.live) || b.risk.level - a.risk.level || b.todayCount - a.todayCount || a.d.name.localeCompare(b.d.name));
  }, [state.drivers, state.live, today, filter, q]);

  const counts = useMemo(() => {
    const all = Object.values(state.drivers);
    const live = Object.values(state.live);
    return {
      all: all.length, online: live.filter(l => !l.pending).length, free: live.filter(l => !l.busy && !l.pending).length, busy: live.filter(l => l.busy).length,
      pending: all.filter(d => Object.values(d.docs).some(x => x?.status === 'review')).length, blocked: all.filter(d => d.blocked).length,
      risk: all.filter(d => !d.blocked && driverRisk(d, today).level > 0).length,
    };
  }, [state.drivers, state.live, today]);

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: 'name', title: 'Haydovchi', flex: 2, render: r => <View style={styles.who}><DriverAvatar d={r.d} size={34} /><Cell strong text={r.d.name} sub={r.d.phone} /></View> },
    { key: 'car', title: 'Avtomobil', flex: 1.4, render: r => <Cell text={r.d.plate ?? '—'} sub={[r.d.car, r.d.year].filter(Boolean).join(' · ')} mono /> },
    { key: 'status', title: 'Holat', width: 170, render: r => <StatusPill d={r.d} live={r.live} /> },
    { key: 'rating', title: 'Reyting', width: 74, render: r => <Cell mono text={(r.d.stats.ratings >= 5 ? r.d.stats.ratingSum / r.d.stats.ratings : r.d.rating ?? 5).toFixed(2)} sub={`${r.d.trips ?? r.d.stats.completed} safar`} /> },
    { key: 'today', title: 'Bugun', width: 110, align: 'right', render: r => <Cell mono text={`${r.todayCount} ta`} sub={r.todaySum ? money(r.todaySum) : undefined} /> },
    { key: 'accept', title: 'Qabul / bekor', width: 110, render: r => <Cell mono text={pct(r.d.stats.accepted, r.d.stats.offers)} sub={`bekor ${pct(r.d.stats.cancelled, r.d.stats.accepted)}`} /> },
    { key: 'docs', title: 'Hujjatlar', width: 150, render: r => <DocsPill d={r.d} /> },
    { key: 'risk', title: "E'tibor", width: 120, render: r => (r.risk.level ? <Pill text={r.risk.level === 2 ? 'Xavfli' : 'Kuzatish'} tone={r.risk.level === 2 ? 'critical' : 'warning'} icon="alert-circle" /> : <Pill text="Joyida" tone="good" icon="checkmark-circle" />) },
  ];

  return (
    <Page title="Haydovchilar" sub={`${counts.all} ta ro'yxatda · ${counts.online} tasi liniyada`}
      actions={<Btn title="Xabar yuborish" icon="megaphone" kind="dark" onPress={() => setNotice(true)} />}>
      <View style={styles.filters}>
        <Seg<Filter> items={[
          { id: 'all', label: 'Hammasi', count: counts.all }, { id: 'online', label: 'Liniyada', count: counts.online }, { id: 'free', label: "Bo'sh", count: counts.free },
          { id: 'busy', label: 'Safarda', count: counts.busy }, { id: 'pending', label: 'Hujjat kutmoqda', count: counts.pending }, { id: 'risk', label: "E'tibor", count: counts.risk },
          { id: 'blocked', label: 'Bloklangan', count: counts.blocked },
        ]} value={filter} onChange={setFilter} />
        <View style={[styles.search, { backgroundColor: c.surface2 }]}>
          <Ionicons name="search" size={16} color={c.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Ism, davlat raqami, telefon" placeholderTextColor={c.faint} style={[styles.searchInput, { color: c.text }]} accessibilityLabel="Haydovchilarni qidirish" />
        </View>
      </View>
      <Panel pad={false} style={{ overflow: 'hidden' }}>
        <Table rows={rows} columns={columns} rowKey={r => r.d.id} onRow={r => router.push(`/admin/drivers/${r.d.id}` as never)} empty="Bu filtr bo'yicha haydovchi yo'q" />
      </Panel>
      <NoticeDialog visible={notice} onClose={() => setNotice(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, borderRadius: 12, paddingHorizontal: 12, flexGrow: 1, minWidth: 220, maxWidth: 380 },
  searchInput: { flex: 1, fontFamily: F.semi, fontSize: 13.5, height: 36 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
});
