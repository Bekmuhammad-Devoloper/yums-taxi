// Haydovchi profili: holat, xavf tahlili, ko'rsatkichlar, hujjatlar (tekshiruv bilan), xaritadagi joyi,
// so'nggi safarlari va amallar (xabar, bloklash, qo'ng'iroq).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DOC_KINDS } from '@/driver/lib/docs';
import { confirm } from '@/lib/confirm';
import { TARIFFS } from '@/lib/data';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { openUrl, useLayout } from '@/site/components/kit';
import { DriverAvatar, StatusPill } from '@/site/components/admin/bits';
import { BlockDialog, NoticeDialog } from '@/site/components/admin/dialogs';
import { DocReviewCard } from '@/site/components/admin/doc-review';
import OpsMap from '@/site/components/admin/ops-map';
import { Btn, Cell, Cols, Empty, Page, Panel, Pill, StatTile, STATUS_COLOR, Table, ORDER_STATUS, dateHM, money, type Column } from '@/site/components/admin/ui';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import type { OrderRec } from '@/site/lib/admin-types';
import { driverRisk } from '@/site/lib/insights';

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default function DriverPage() {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, list } = useAdmin();
  const runCmds = useRun();
  const [notice, setNotice] = useState(false);
  const [block, setBlock] = useState(false);
  const d = state.drivers[id];
  const live = d ? state.live[d.id] : undefined;
  const mine = useMemo(() => list.filter(o => o.driverId === id).reverse(), [list, id]);
  const today = useMemo(() => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return list.filter(o => Date.parse(o.createdAt) >= d0.getTime());
  }, [list]);
  const liveList = useMemo(() => (live ? [live] : []), [live]);
  const pos = live?.pos;
  const focus = useMemo(() => (pos ? [pos] : null), [pos]);

  if (!d) {
    return <Page title="Haydovchi"><Empty icon="person" title="Haydovchi topilmadi" sub="Ro'yxatdan o'chirilgan yoki havola noto'g'ri" /></Page>;
  }
  const risk = driverRisk(d, today);
  const st = d.stats;
  const rating = st.ratings >= 5 ? st.ratingSum / st.ratings : d.rating ?? 5;
  const todayDone = today.filter(o => o.driverId === d.id && o.status === 'finished');
  const current = live?.orderId ? state.orders[live.orderId] : undefined;
  const columns: Column<OrderRec>[] = [
    { key: 'time', title: 'Vaqt', width: 92, render: o => <Cell mono text={dateHM(o.createdAt)} /> },
    { key: 'route', title: "Yo'nalish", flex: 2, render: o => <Cell strong text={`${o.pickup.title} → ${o.destination.title}`} sub={`${o.km} km · ${o.passenger.name}`} /> },
    { key: 'price', title: 'Narx', width: 110, align: 'right', render: o => <Cell mono text={money(o.finalPrice ?? o.price)} sub={o.stars ? `★ ${o.stars}` : undefined} /> },
    { key: 'status', title: 'Holat', width: 180, render: o => <Pill text={ORDER_STATUS[o.status].label} tone={ORDER_STATUS[o.status].tone} /> },
  ];

  return (
    <Page title={d.name} sub={[d.plate, d.car, d.year, d.color].filter(Boolean).join(' · ')}
      actions={<>
        <Btn title="Orqaga" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.push('/admin/drivers' as never))} />
        {d.phone ? <Btn title="Qo'ng'iroq" icon="call" onPress={() => openUrl(`tel:${d.phone!.replace(/[^\d+]/g, '')}`)} /> : null}
        <Btn title="Xabar" icon="megaphone" onPress={() => setNotice(true)} />
        {d.blocked
          ? <Btn title="Blokdan chiqarish" icon="lock-open" kind="dark" onPress={() => confirm('Blokdan chiqarish', `${d.name} yana liniyaga chiqa oladi.`, () => { runCmds({ cmd: 'unblock', driverId: d.id }, 'Blokdan chiqarildi'); }, 'Chiqarish')} />
          : <Btn title="Bloklash" icon="lock-closed" kind="danger" onPress={() => setBlock(true)} />}
      </>}>
      <Cols>
        <Panel style={{ flex: wide ? 1 : undefined }}>
          <View style={styles.head}>
            <DriverAvatar d={d} size={72} />
            <View style={{ flex: 1, gap: 6 }}>
              <StatusPill d={d} live={live} />
              <Text style={[styles.meta, { color: c.muted }]}>{d.phone ?? '—'} · {d.city ?? 'Toshkent'} · YUMSda {d.joinedAt ? new Date(d.joinedAt).toLocaleDateString('ru-RU') : '—'} dan</Text>
              <View style={styles.chips}>
                {(d.tariffs ?? []).map(t => <Pill key={t} text={TARIFFS.find(x => x.id === t)?.name ?? t} tone="info" />)}
              </View>
            </View>
          </View>
          {d.blocked ? (
            <View style={[styles.alert, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="lock-closed" size={18} color={STATUS_COLOR.critical} />
              <Text style={[styles.meta, { color: c.text, flex: 1 }]}>Bloklangan: {d.blocked.reason} · {dateHM(d.blocked.at)}</Text>
            </View>
          ) : risk.level ? (
            <View style={[styles.alert, { backgroundColor: risk.level === 2 ? c.dangerSoft : c.warnSoft }]}>
              <Ionicons name="alert-circle" size={18} color={risk.level === 2 ? STATUS_COLOR.critical : STATUS_COLOR.serious} />
              <Text style={[styles.meta, { color: c.text, flex: 1 }]}>Aqlli tahlil: {risk.reasons.join('; ')}.</Text>
            </View>
          ) : null}
          {current ? (
            <View style={[styles.alert, { backgroundColor: c.accentSoft }]}>
              <Ionicons name="navigate" size={18} color={c.accent} />
              <Text style={[styles.meta, { color: c.text, flex: 1 }]}>Hozirgi safar: {current.pickup.title} → {current.destination.title} · {ORDER_STATUS[current.status].label}</Text>
            </View>
          ) : null}
        </Panel>
        <Panel title="Joylashuv" sub={live?.pos ? 'Jonli · har soniyada yangilanadi' : 'Liniyada emas'} pad={false} style={{ flex: wide ? 1 : undefined }}>
          <View style={{ height: 230, marginTop: 12, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' }}>
            <OpsMap drivers={state.drivers} live={liveList} orders={current ? [current] : []} zones={state.config.zones} selectedDriver={d.id} selectedOrder={current?.id} focus={focus} legend={false} />
          </View>
        </Panel>
      </Cols>

      <View style={styles.tiles}>
        <StatTile icon="star" label="Reyting" value={rating.toFixed(2)} sub={`${st.ratings} ta baho · ${st.lowRatings} tasi past`} />
        <StatTile icon="checkmark-done" label="Bajarilgan safarlar" value={String(st.completed)} sub={`bugun ${todayDone.length} ta · jami ${d.trips ?? st.completed}`} />
        <StatTile icon="hand-left" label="Qabul qilish" value={pct(st.accepted, st.offers)} sub={`${st.offers} taklif · ${st.declined} rad · ${st.missed} javobsiz`} />
        <StatTile icon="close-circle" label="Bekor qilish" value={pct(st.cancelled, st.accepted)} sub={`${st.cancelled} ta · mijoz chiqmadi ${st.noShow} ta`} />
        <StatTile icon="cash" label="Safarlar summasi" value={money(st.revenue)} sub={`bugun ${money(todayDone.reduce((n, o) => n + (o.finalPrice ?? o.price), 0))}`} />
      </View>

      <Panel title="Hujjatlar" sub="Avtomatik tekshiruv natijasi va qaror">
        <View style={styles.docs}>
          {DOC_KINDS.map(k => <View key={k} style={{ flexBasis: wide ? '48%' : '100%', flexGrow: 1 }}><DocReviewCard driver={d} kind={k} /></View>)}
        </View>
      </Panel>

      <Panel title="So'nggi safarlar" sub={`${mine.length} ta buyurtma`} pad={false} style={{ overflow: 'hidden' }}>
        <View style={{ marginTop: 6 }}>
          <Table rows={mine} columns={columns} rowKey={o => o.id} onRow={o => router.push(`/admin/orders?id=${o.id}` as never)} pageSize={15} empty="Hali safar yo'q" />
        </View>
      </Panel>
      <NoticeDialog visible={notice} onClose={() => setNotice(false)} driver={{ id: d.id, name: d.name }} />
      <BlockDialog visible={block} onClose={() => setBlock(false)} driver={{ id: d.id, name: d.name }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  meta: { fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  docs: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
