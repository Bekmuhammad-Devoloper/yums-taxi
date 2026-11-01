// Boshqaruv paneli: asosiy ko'rsatkichlar, jonli xarita, aqlli tavsiyalar, soatlik grafik va prognoz,
// xizmat holati bahosi, bugungi natijalar va so'nggi hodisalar.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TARIFFS } from '@/lib/data';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { useLayout } from '@/site/components/kit';
import { DriverAvatar, StatusPill } from '@/site/components/admin/bits';
import { NoticeDialog } from '@/site/components/admin/dialogs';
import OpsMap from '@/site/components/admin/ops-map';
import { Btn, Cols, HourlyChart, InsightCard, LEVEL, Meter, Page, Panel, Pill, RankBars, SegmentBar, StatTile, ORDER_STATUS, ago, hm, money, num } from '@/site/components/admin/ui';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import { isActive } from '@/site/lib/admin-types';

export default function Dashboard() {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const { state, list, derived, mode } = useAdmin();
  const runCmds = useRun();
  const [selDriver, setSelDriver] = useState<string | null>(null);
  const [selOrder, setSelOrder] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [allTips, setAllTips] = useState(false);
  const live = useMemo(() => Object.values(state.live), [state.live]);
  const active = useMemo(() => list.filter(isActive), [list]);
  const k = derived?.kpis;
  const today = useMemo(() => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return list.filter(o => Date.parse(o.createdAt) >= d0.getTime());
  }, [list]);

  const outcome = [
    { label: 'Bajarildi', value: today.filter(o => o.status === 'finished').length },
    { label: "Yo'lovchi bekor qildi", value: today.filter(o => o.status === 'cancelled' && o.cancelReason !== 'admin').length },
    { label: 'Haydovchi topilmadi', value: today.filter(o => o.status === 'failed').length },
    { label: 'Mijoz chiqmadi', value: today.filter(o => o.status === 'noShow').length },
    { label: 'Operator bekor qildi', value: today.filter(o => o.cancelReason === 'admin').length },
  ];
  const byTariff = TARIFFS.map(t => ({ label: t.name, value: today.filter(o => o.tariffId === t.id).length })).sort((a, b) => b.value - a.value);
  const tips = derived?.insights ?? [];
  const sd = selDriver ? state.drivers[selDriver] : undefined;
  const so = selOrder ? state.orders[selOrder] : undefined;
  const delta = k && k.lastWeekSamePeriod >= 20 ? k.today / k.lastWeekSamePeriod - 1 : null;

  return (
    <Page title="Boshqaruv" sub={mode === 'demo' ? 'Demo rejim — ma\'lumotlar simulyatsiya qilinmoqda' : 'Jonli ma\'lumotlar · YUMS dispetcher serveri'}
      actions={<><Btn title="Haydovchilarga xabar" icon="megaphone" onPress={() => setNotice(true)} /><Btn title="Narx va hududlar" icon="flame" kind="dark" onPress={() => router.push('/admin/pricing' as never)} /></>}>
      {/* Ko'rsatkichlar */}
      <View style={styles.tiles}>
        <StatTile icon="car-sport" label="Liniyada" value={num(k?.online ?? 0)} sub={k ? `${k.free} bo'sh · ${k.busy} safarda${k.pending ? ` · ${k.pending} tekshiruvda` : ''}` : undefined} onPress={() => router.push('/admin/drivers?f=online' as never)} />
        <StatTile icon="hourglass" label="Haydovchi kutmoqda" value={num(k?.searching ?? 0)} sub={k ? `${k.active} ta faol safar` : undefined} onPress={() => router.push('/admin/orders?status=searching' as never)} />
        <StatTile icon="receipt" label="Bugungi buyurtmalar" value={num(k?.today ?? 0)} delta={delta} spark={k?.sparkline} onPress={() => router.push('/admin/orders' as never)} />
        <StatTile icon="cash" label="Safarlar summasi" value={money(k?.gross ?? 0)} sub={k ? `YUMS komissiyasi ${money(k.fees)}` : undefined} />
        <StatTile icon="checkmark-done" label="Bajarilish" value={k?.fulfillment != null ? `${Math.round(k.fulfillment * 100)}%` : '—'} sub="haydovchisiz qolganlar hisobida" />
        <StatTile icon="time" label="O'rtacha kelish" value={k?.avgPickupMin != null ? `${k.avgPickupMin.toFixed(1).replace('.', ',')} daq` : '—'} sub={k?.avgRating ? `o'rtacha baho ★ ${k.avgRating.toFixed(2)}` : undefined} />
      </View>

      <Cols>
        <Panel title="Jonli xarita" sub={`${live.length} ta mashina · ${active.filter(o => o.status === 'searching').length} ta buyurtma haydovchi kutmoqda`} style={{ flex: wide ? 1.75 : undefined }} pad={false}>
          <View style={{ height: wide ? 500 : 380, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden', marginTop: 12 }}>
            <OpsMap drivers={state.drivers} live={live} orders={active} zones={state.config.zones} hotspots={derived?.spots}
              selectedDriver={selDriver} selectedOrder={selOrder}
              onSelectDriver={id => { setSelDriver(id); setSelOrder(null); }} onSelectOrder={id => { setSelOrder(id); setSelDriver(null); }} />
            {sd ? (
              <View style={[styles.mapCard, { backgroundColor: c.surface, borderColor: c.line }]}>
                <View style={styles.rowGap}>
                  <DriverAvatar d={sd} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>{sd.name}</Text>
                    <Text style={[styles.cardSub, { color: c.muted }]} numberOfLines={1}>{sd.plate} · {sd.car}</Text>
                  </View>
                  <Pressable onPress={() => setSelDriver(null)} accessibilityLabel="Yopish"><Ionicons name="close" size={18} color={c.muted} /></Pressable>
                </View>
                <StatusPill d={sd} live={state.live[sd.id]} />
                {state.live[sd.id]?.orderId && state.orders[state.live[sd.id]!.orderId!] ? (
                  <Text style={[styles.cardSub, { color: c.text }]} numberOfLines={1}>{state.orders[state.live[sd.id]!.orderId!].pickup.title} → {state.orders[state.live[sd.id]!.orderId!].destination.title}</Text>
                ) : null}
                <View style={styles.rowGap}>
                  <Btn small title="Profil" icon="person" kind="dark" onPress={() => router.push(`/admin/drivers/${sd.id}` as never)} />
                </View>
              </View>
            ) : so ? (
              <View style={[styles.mapCard, { backgroundColor: c.surface, borderColor: c.line }]}>
                <View style={styles.rowGap}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>{so.pickup.title} → {so.destination.title}</Text>
                    <Text style={[styles.cardSub, { color: c.muted }]}>{hm(so.createdAt)} · {so.km} km · {money(so.price)} · {so.passenger.name}</Text>
                  </View>
                  <Pressable onPress={() => setSelOrder(null)} accessibilityLabel="Yopish"><Ionicons name="close" size={18} color={c.muted} /></Pressable>
                </View>
                <Pill text={`${ORDER_STATUS[so.status].label} · ${ago(so.createdAt)}`} tone={ORDER_STATUS[so.status].tone} />
                <View style={styles.rowGap}>
                  <Btn small title="Batafsil" icon="open" kind="dark" onPress={() => router.push(`/admin/orders?id=${so.id}` as never)} />
                  {isActive(so) ? <Btn small title="Bekor qilish" icon="close-circle" kind="danger" onPress={() => confirm('Buyurtmani bekor qilish', "Yo'lovchi va haydovchiga xabar beriladi.", async () => { if (await runCmds({ cmd: 'cancelOrder', orderId: so.id }, 'Buyurtma bekor qilindi')) setSelOrder(null); }, 'Bekor qilish')} /> : null}
                </View>
              </View>
            ) : null}
          </View>
        </Panel>

        <Panel title="Aqlli tavsiyalar" sub="Talab, taklif, prognoz va xavflar tahlili · har 2 soniyada" style={{ flex: wide ? 1 : undefined }}
          right={<Ionicons name="sparkles" size={18} color={c.brandDeep} />}>
          <View style={{ gap: 10 }}>
            {(allTips ? tips : tips.slice(0, 4)).map(i => <InsightCard key={i.id} insight={i} />)}
            {tips.length > 4 ? (
              <Pressable onPress={() => setAllTips(a => !a)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 6 }}>
                <Text style={[styles.link, { color: c.accent }]}>{allTips ? 'Kamroq' : `Yana ${tips.length - 4} ta tavsiya`}</Text>
              </Pressable>
            ) : null}
          </View>
        </Panel>
      </Cols>

      <Cols>
        <Panel title="Buyurtmalar soatlar bo'yicha" sub={derived ? `Bugungi talab o'rtachaning ${Math.round(derived.hourly.trend * 100)}% i · prognoz shunga moslangan` : undefined} style={{ flex: wide ? 1.75 : undefined }}>
          {derived ? <HourlyChart today={derived.hourly.today} avg={derived.hourly.avg} forecast={derived.hourly.forecast} hour={derived.hourly.hour} /> : null}
        </Panel>
        <Panel title="Xizmat holati" sub="Bajarilish, kelish vaqti, qabul qilish, qamrov va hujjatlar" style={{ flex: wide ? 1 : undefined }}>
          {derived ? (
            <View style={{ gap: 14 }}>
              <View style={[styles.rowGap, { alignItems: 'flex-end' }]}>
                <Text style={[styles.hero, { color: c.text }]}>{derived.health.score}</Text>
                <Text style={[styles.cardSub, { color: c.muted, marginBottom: 10 }]}>/ 100</Text>
                <View style={{ flex: 1 }} />
                <Pill text={derived.health.label} tone={derived.health.level === 'good' ? 'good' : derived.health.level === 'warn' ? 'warning' : 'critical'} icon={LEVEL[derived.health.level].icon} />
              </View>
              <Meter value={derived.health.score / 100} color={LEVEL[derived.health.level].color} />
              <View style={{ gap: 7 }}>
                {derived.health.parts.map(p => (
                  <View key={p.label} style={styles.partRow}>
                    <Text style={[styles.cardSub, { color: c.muted, flex: 1 }]}>{p.label}</Text>
                    <Text style={[styles.cardSub, { color: c.text, fontFamily: F.bold }]}>{p.value}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.summary, { backgroundColor: c.surface2 }]}>
                <Ionicons name="document-text" size={16} color={c.muted} />
                <Text style={[styles.cardSub, { color: c.text, flex: 1, lineHeight: 19 }]}>{derived.summary}</Text>
              </View>
            </View>
          ) : null}
        </Panel>
      </Cols>

      <Cols>
        <Panel title="Bugungi natijalar" sub={`${today.length} ta buyurtma`} style={{ flex: wide ? 1.2 : undefined }}>
          <SegmentBar parts={outcome} />
        </Panel>
        <Panel title="Tariflar bo'yicha" sub="Bugungi buyurtmalar" style={{ flex: wide ? 1 : undefined }}>
          <RankBars rows={byTariff} />
        </Panel>
        <Panel title="So'nggi hodisalar" right={<Pressable onPress={() => router.push('/admin/log' as never)} accessibilityRole="link"><Text style={[styles.link, { color: c.accent }]}>Jurnal</Text></Pressable>} style={{ flex: wide ? 1.2 : undefined }}>
          <View style={{ gap: 9 }}>
            {state.log.slice(-7).reverse().map(e => (
              <View key={e.id} style={[styles.rowGap, { alignItems: 'flex-start' }]}>
                <Ionicons name={e.kind === 'admin' ? 'person-circle' : e.kind === 'auto' ? 'sparkles' : 'ellipse'} size={e.kind === 'system' ? 9 : 16} color={e.kind === 'auto' ? c.brandDeep : c.muted} style={e.kind === 'system' ? { marginTop: 5, marginHorizontal: 3.5 } : undefined} />
                <Text style={[styles.cardSub, { color: c.text, flex: 1, lineHeight: 18 }]} numberOfLines={2}>{e.text}</Text>
                <Text style={[styles.time, { color: c.faint }]}>{hm(e.at)}</Text>
              </View>
            ))}
          </View>
        </Panel>
      </Cols>
      <NoticeDialog visible={notice} onClose={() => setNotice(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mapCard: { position: 'absolute', left: 12, bottom: 12, width: 300, maxWidth: '86%', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 9, zIndex: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.18)' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontFamily: F.bold, fontSize: 14.5 },
  cardSub: { fontFamily: F.medium, fontSize: 12.5 },
  link: { fontFamily: F.bold, fontSize: 13 },
  hero: { fontFamily: F.heavy, fontSize: 52, letterSpacing: -2, lineHeight: 56 },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summary: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, alignItems: 'flex-start' },
  time: { fontFamily: F.semi, fontSize: 11.5, fontVariant: ['tabular-nums'] },
});
