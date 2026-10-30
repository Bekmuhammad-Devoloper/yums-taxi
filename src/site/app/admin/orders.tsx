// Buyurtmalar: faol va tarix, holat/davr/tarif bo'yicha filtr, qidiruv, tafsilotlar (vaqt chizig'i, xarita),
// operator tomonidan bekor qilish va CSV ga yuklab olish.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { toast } from '@/components/toast';
import { confirm } from '@/lib/confirm';
import { TARIFFS } from '@/lib/data';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { useLayout } from '@/site/components/kit';
import { DriverAvatar } from '@/site/components/admin/bits';
import { Dialog } from '@/site/components/admin/dialogs';
import OpsMap from '@/site/components/admin/ops-map';
import { Btn, Cell, Page, Panel, Pill, Seg, Table, ORDER_STATUS, ago, dateHM, downloadCsv, hm, money, type Column } from '@/site/components/admin/ui';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import { isActive, type OrderRec } from '@/site/lib/admin-types';

type Filter = 'active' | 'searching' | 'finished' | 'cancelled' | 'failed' | 'noShow' | 'all';
type Period = 'today' | 'week' | 'all';

const EVENT: Record<string, string> = {
  created: 'Buyurtma berildi', offer: 'Taklif yuborildi', declined: 'Rad etdi', missed: 'Javob bermadi', accepted: 'Qabul qildi',
  arrived: 'Haydovchi yetib keldi', started: 'Safar boshlandi', finished: 'Safar yakunlandi', rated: "Yo'lovchi baho qo'ydi",
  cancelled: "Yo'lovchi bekor qildi", driverCancelled: 'Haydovchi bekor qildi', noDriver: 'Haydovchi topilmadi', noShow: 'Mijoz chiqmadi', adminCancelled: 'Operator bekor qildi',
};
const PAY: Record<string, string> = { cash: 'Naqd', card: 'Karta', balance: 'Balans' };
const tariffName = (id: string) => TARIFFS.find(t => t.id === id)?.name ?? id;

export default function Orders() {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const params = useLocalSearchParams<{ status?: string; id?: string }>();
  const { state, list } = useAdmin();
  const [filter, setFilter] = useState<Filter>(params.status === 'searching' ? 'searching' : params.id ? 'all' : 'active');
  const [period, setPeriod] = useState<Period>(params.id ? 'all' : 'today');
  const [tariff, setTariff] = useState<string>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(params.id ?? null);

  const rows = useMemo(() => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const from = period === 'today' ? d0.getTime() : period === 'week' ? d0.getTime() - 6 * 86400000 : 0;
    const query = q.trim().toLowerCase();
    return list.filter(o => {
      if (Date.parse(o.createdAt) < from && !(filter === 'active' && isActive(o))) return false;
      if (filter === 'active' ? !isActive(o) : filter !== 'all' && o.status !== filter) return false;
      if (tariff !== 'all' && o.tariffId !== tariff) return false;
      if (query && ![o.id, o.pickup.title, o.destination.title, o.passenger.name, o.passenger.phone ?? '', o.driverName ?? ''].some(x => x.toLowerCase().includes(query))) return false;
      return true;
    }).reverse();
  }, [list, filter, period, tariff, q]);

  const counts = useMemo(() => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const today = list.filter(o => Date.parse(o.createdAt) >= d0.getTime());
    return { active: list.filter(isActive).length, searching: list.filter(o => o.status === 'searching').length, failed: today.filter(o => o.status === 'failed').length };
  }, [list]);

  const columns: Column<OrderRec>[] = [
    { key: 'time', title: 'Vaqt', width: 92, render: o => <Cell text={dateHM(o.createdAt)} sub={isActive(o) ? ago(o.createdAt) : undefined} mono /> },
    { key: 'route', title: "Yo'nalish", flex: 2.4, render: o => <Cell strong text={`${o.pickup.title} → ${o.destination.title}`} sub={`${o.km} km · ~${o.min} daq · ${o.passenger.name}`} /> },
    { key: 'tariff', title: 'Tarif', width: 96, render: o => <Cell text={tariffName(o.tariffId)} sub={o.surge ? `×${o.surge.toFixed(1)}` : PAY[o.payment] ?? String(o.payment)} /> },
    { key: 'price', title: 'Narx', width: 112, align: 'right', render: o => <Cell mono text={money(o.finalPrice ?? o.price)} sub={o.stars ? `★ ${o.stars}${o.tip ? ` · +${money(o.tip)}` : ''}` : undefined} /> },
    { key: 'status', title: 'Holat', width: 190, render: o => <Pill text={ORDER_STATUS[o.status].label} tone={ORDER_STATUS[o.status].tone} /> },
    { key: 'driver', title: 'Haydovchi', flex: 1.2, render: o => <Cell text={o.driverName ?? '—'} sub={o.offers ? `${o.offers} ta taklif` : undefined} /> },
  ];

  const exportCsv = () => {
    const head = ['ID', 'Vaqt', 'Qayerdan', 'Qayerga', 'Km', 'Daqiqa', 'Tarif', 'Narx', 'Yakuniy narx', "To'lov", 'Holat', 'Haydovchi', "Yo'lovchi", 'Baho', 'Choy puli'];
    downloadCsv('yums-buyurtmalar', head, rows.map(o => [o.id, o.createdAt, o.pickup.title, o.destination.title, o.km, o.min, tariffName(o.tariffId), o.price, o.finalPrice ?? '', PAY[o.payment] ?? o.payment, ORDER_STATUS[o.status].label, o.driverName ?? '', o.passenger.name, o.stars ?? '', o.tip ?? '']));
    toast(`${rows.length} ta buyurtma yuklab olindi`, 'download');
  };

  const order = sel ? state.orders[sel] : undefined;
  return (
    <Page title="Buyurtmalar" sub={`${counts.active} ta faol · ${counts.searching} tasi haydovchi kutmoqda · bugun ${counts.failed} tasi haydovchisiz qoldi`}
      actions={Platform.OS === 'web' ? <Btn title="CSV yuklab olish" icon="download" onPress={exportCsv} disabled={!rows.length} /> : undefined}>
      <View style={styles.filters}>
        <Seg<Period> items={[{ id: 'today', label: 'Bugun' }, { id: 'week', label: '7 kun' }, { id: 'all', label: 'Hammasi' }]} value={period} onChange={setPeriod} />
        <Seg<Filter> items={[
          { id: 'active', label: 'Faol', count: counts.active }, { id: 'searching', label: 'Kutmoqda', count: counts.searching }, { id: 'finished', label: 'Bajarildi' },
          { id: 'cancelled', label: 'Bekor' }, { id: 'failed', label: 'Haydovchisiz' }, { id: 'noShow', label: 'Mijoz chiqmadi' }, { id: 'all', label: 'Barchasi' },
        ]} value={filter} onChange={setFilter} />
      </View>
      <View style={styles.filters}>
        <Seg<string> items={[{ id: 'all', label: 'Barcha tariflar' }, ...TARIFFS.map(t => ({ id: t.id, label: t.name }))]} value={tariff} onChange={setTariff} />
        <View style={[styles.search, { backgroundColor: c.surface2 }]}>
          <Ionicons name="search" size={16} color={c.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Manzil, yo'lovchi, telefon, haydovchi" placeholderTextColor={c.faint} style={[styles.searchInput, { color: c.text }]} accessibilityLabel="Buyurtmalarni qidirish" />
        </View>
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        <Panel pad={false} style={{ flex: 1, width: wide ? undefined : '100%', overflow: 'hidden' }}>
          <Table rows={rows} columns={columns} rowKey={o => o.id} onRow={o => setSel(o.id)} selected={sel} empty="Bu filtr bo'yicha buyurtma yo'q" />
        </Panel>
        {wide && order ? <View style={{ width: 400 }}><OrderDetail o={order} onClose={() => setSel(null)} /></View> : null}
      </View>
      {!wide ? <Dialog visible={!!order} title="Buyurtma" onClose={() => setSel(null)}>{order ? <OrderDetail o={order} onClose={() => setSel(null)} bare /> : null}</Dialog> : null}
    </Page>
  );
}

function OrderDetail({ o, onClose, bare }: { o: OrderRec; onClose: () => void; bare?: boolean }) {
  const { colors: c } = useStore();
  const { state } = useAdmin();
  const runCmds = useRun();
  const driver = o.driverId ? state.drivers[o.driverId] : undefined;
  const live = useMemo(() => (o.driverId && state.live[o.driverId] ? [state.live[o.driverId]] : []), [o.driverId, state.live]);
  const focus = useMemo(() => [o.pickup, o.destination], [o.pickup, o.destination]);
  const body = (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pill text={ORDER_STATUS[o.status].label} tone={ORDER_STATUS[o.status].tone} />
        <Text style={[styles.meta, { color: c.faint, flex: 1 }]} numberOfLines={1}>№ {o.id}</Text>
        {!bare ? <Pressable onPress={onClose} accessibilityLabel="Yopish"><Ionicons name="close" size={18} color={c.muted} /></Pressable> : null}
      </View>
      <View style={[styles.route, { backgroundColor: c.surface2 }]}>
        <View style={styles.stop}><View style={[styles.dot, { backgroundColor: '#0F1E3D' }]} /><Text style={[styles.stopText, { color: c.text }]}>{o.pickup.title}</Text></View>
        <View style={styles.stop}><View style={[styles.dot, { backgroundColor: '#FFC800' }]} /><Text style={[styles.stopText, { color: c.text }]}>{o.destination.title}</Text></View>
      </View>
      <View style={{ height: 190, borderRadius: 14, overflow: 'hidden' }}>
        <OpsMap drivers={state.drivers} live={live} orders={[o]} zones={state.config.zones} selectedOrder={o.id} focus={focus} legend={false} />
      </View>
      <View style={styles.grid}>
        <Info label="Tarif" value={`${tariffName(o.tariffId)}${o.surge ? ` · ×${o.surge.toFixed(1)}` : ''}`} />
        <Info label="Narx" value={money(o.price)} />
        <Info label="Yakuniy narx" value={o.finalPrice != null ? money(o.finalPrice) : '—'} />
        <Info label="Masofa" value={`${o.km} km · ~${o.min} daq`} />
        <Info label="To'lov" value={PAY[o.payment] ?? String(o.payment)} />
        <Info label="Takliflar" value={String(o.offers)} />
        <Info label="Yo'lovchi" value={`${o.passenger.name} · ★${o.passenger.rating}`} />
        <Info label="Telefon" value={o.passenger.phone ?? '—'} />
        {o.stars ? <Info label="Baho" value={`★ ${o.stars}${o.tip ? ` · choy puli ${money(o.tip)}` : ''}`} /> : null}
      </View>
      {driver ? (
        <Pressable onPress={() => router.push(`/admin/drivers/${driver.id}` as never)} style={[styles.driver, { borderColor: c.line }]} accessibilityRole="link" accessibilityLabel={`Haydovchi: ${driver.name}`}>
          <DriverAvatar d={driver} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.stopText, { color: c.text }]}>{driver.name}</Text>
            <Text style={[styles.meta, { color: c.muted }]}>{driver.plate} · {driver.car}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.faint} />
        </Pressable>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: c.muted }]}>Vaqt chizig&apos;i</Text>
        {o.timeline.map((e, i) => (
          <View key={i} style={styles.event}>
            <View style={[styles.eventDot, { backgroundColor: i === o.timeline.length - 1 ? '#2a78d6' : c.surface3 }]} />
            <Text style={[styles.meta, { color: c.text, flex: 1 }]}>{EVENT[e.t] ?? e.t}{e.driverId && state.drivers[e.driverId] ? ` · ${state.drivers[e.driverId].name}` : ''}</Text>
            <Text style={[styles.time, { color: c.faint }]}>{hm(e.at)}</Text>
          </View>
        ))}
      </View>
      {isActive(o) ? (
        <Btn title="Buyurtmani bekor qilish" icon="close-circle" kind="danger" onPress={() => confirm('Buyurtmani bekor qilish', "Yo'lovchi va haydovchiga xabar beriladi. Bu amal jurnalga yoziladi.", () => { runCmds({ cmd: 'cancelOrder', orderId: o.id }, 'Buyurtma bekor qilindi'); }, 'Bekor qilish')} />
      ) : null}
    </View>
  );
  if (bare) return body;
  return <Panel>{body}</Panel>;
}

function Info({ label, value }: { label: string; value: string }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.info}>
      <Text style={[styles.label, { color: c.faint }]}>{label}</Text>
      <Text style={[styles.meta, { color: c.text, fontFamily: F.bold }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, borderRadius: 12, paddingHorizontal: 12, flexGrow: 1, minWidth: 220, maxWidth: 420 },
  searchInput: { flex: 1, fontFamily: F.semi, fontSize: 13.5, height: 36 },
  route: { borderRadius: 14, padding: 12, gap: 10 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  stopText: { fontFamily: F.bold, fontSize: 14, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  info: { width: '50%', gap: 1, paddingRight: 8 },
  label: { fontFamily: F.semi, fontSize: 11.5 },
  meta: { fontFamily: F.medium, fontSize: 13 },
  time: { fontFamily: F.semi, fontSize: 12, fontVariant: ['tabular-nums'] },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
});
