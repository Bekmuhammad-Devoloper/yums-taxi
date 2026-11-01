import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { Button, Card, Chip, Divider, EmptyState, Row, Screen, Segmented, Sheet, Txt } from '@/components/ui';
import { CARD_ART, CardBg, useCardInk } from '@/driver/components/card-bg';
import { feeOf, useDriver, type Earning } from '@/driver/lib/driver-store';
import { GREEN } from '@/driver/lib/theme';
import { TARIFFS } from '@/lib/data';
import { fmtDate, weekdayShort } from '@/lib/format';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, trPlace, route } from '@/lib/i18n';

type Period = 'today' | 'week' | 'month';
const DAY = 86400000;

export default function Earnings() {
  const { colors: c } = useStore();
  const d = useDriver();
  const ink = useCardInk();
  const { earnings } = d;
  const [period, setPeriod] = useState<Period>('today');
  const [sheet, setSheet] = useState(false);
  const [detail, setDetail] = useState<Earning | null>(null);
  const [now] = useState(() => Date.now());

  const list = useMemo(() => {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const from = period === 'today' ? start.getTime() : period === 'week' ? start.getTime() - 6 * DAY : start.getTime() - 29 * DAY;
    return earnings.filter(e => new Date(e.at).getTime() >= from);
  }, [earnings, period, now]);

  const gross = list.reduce((s, e) => s + e.price + (e.waitFee ?? 0), 0);
  const wait = list.reduce((s, e) => s + (e.waitFee ?? 0), 0);
  const tips = list.reduce((s, e) => s + e.tip, 0);
  const fee = list.reduce((s, e) => s + feeOf(e), 0);
  const cash = list.filter(e => e.payment === 'cash').reduce((s, e) => s + e.price + (e.waitFee ?? 0), 0);
  const km = list.reduce((s, e) => s + e.km, 0);
  const net = gross - fee + tips;
  const onlineMs = d.onlineMsToday(now);

  // So'nggi 7 kun diagrammasi
  const week = useMemo(() => {
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d0 = today.getTime() - (6 - i) * DAY;
      const sum = earnings.filter(e => { const t = new Date(e.at).getTime(); return t >= d0 && t < d0 + DAY; }).reduce((s, e) => s + e.price + (e.waitFee ?? 0) + e.tip - feeOf(e), 0);
      return { label: weekdayShort(new Date(d0)), sum, today: i === 6 };
    });
  }, [earnings, now]);
  const max = Math.max(1, ...week.map(w => w.sum));

  return (
    <Screen title={tr('Daromad')} subtitle={tr('{n} ta safar · {km} km', { n: list.length, km: km.toFixed(1) })}>
      <View style={[styles.balance, { borderColor: c.line }]}>
        <CardBg art={CARD_ART.balance} />
        <View style={{ flex: 1 }}>
          <Txt v="small" color={ink.sub}>{tr('Balans')}</Txt>
          <Text style={[styles.balanceValue, { color: d.balance < 0 ? ink.danger : ink.text }]}>{som(d.balance)}</Text>
          <Txt v="tiny" color={ink.faint}>{d.balance < 0 ? tr("Naqd safarlar komissiyasi — balansni to'ldiring") : tr('Kartadagi safarlar va choy puli')}</Txt>
        </View>
        <Pressable onPress={() => setSheet(true)} disabled={d.balance <= 0} accessibilityLabel={tr('Pul yechish')}
          style={[styles.withdraw, d.balance > 0 ? { backgroundColor: ink.btn, boxShadow: ink.btnShadow } : { backgroundColor: ink.btnOff }]}>
          <Ionicons name="arrow-up-circle" size={18} color={d.balance > 0 ? ink.btnText : ink.btnOffText} />
          <Txt v="small" color={d.balance > 0 ? ink.btnText : ink.btnOffText} style={{ fontFamily: F.heavy }}>{tr('Pul yechish')}</Txt>
        </Pressable>
      </View>

      <Segmented<Period> items={[{ id: 'today', label: tr('Bugun') }, { id: 'week', label: tr('7 kun') }, { id: 'month', label: tr('30 kun') }]} value={period} onChange={setPeriod} />

      <Card style={{ gap: 14 }}>
        <View>
          <Txt v="small" muted>{tr('Sof daromad')}</Txt>
          <Text style={[styles.big, { color: c.text }]}>{som(net)}</Text>
        </View>
        <Row gap={10}>
          <Mini label={tr('Safarlar')} value={String(list.length)} />
          <Mini label={tr('Masofa')} value={tr('{km} km', { km: km.toFixed(0) })} />
          <Mini label={period === 'today' ? tr('Liniyada') : tr("O'rtacha")} value={period === 'today' ? tr('{h} s {m} d', { h: Math.floor(onlineMs / 3600000), m: Math.floor((onlineMs % 3600000) / 60000) }) : som(list.length ? Math.round(net / list.length) : 0)} />
        </Row>
        <View style={styles.chart}>
          {week.map((w, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={[styles.bar, { height: 8 + (w.sum / max) * 70, backgroundColor: w.today ? c.brand : c.surface3 }]} />
              <Txt v="tiny" color={w.today ? c.text : c.muted} style={{ fontFamily: F.bold }}>{w.label}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <Line label={tr('Safarlar summasi')} value={som(gross)} />
        {wait ? <Line label={tr('shundan pullik kutish')} value={som(wait)} /> : null}
        <Line label={tr('YUMS komissiyasi ({pct}%)', { pct: Math.round(d.commission * 100) })} value={`−${som(fee)}`} color={c.danger} />
        <Line label={tr('Choy puli')} value={`+${som(tips)}`} color={GREEN} />
        <Divider />
        <Line label={tr('Naqd olingan')} value={som(cash)} />
        <Line label={tr('Balansga tushgan')} value={som(net - cash)} bold />
      </Card>

      {d.payouts.length > 0 && (
        <Card style={{ gap: 12 }}>
          <Txt v="h3">{tr('Pul yechish tarixi')}</Txt>
          {d.payouts.slice(0, 5).map((p, i) => (
            <View key={p.id} style={{ gap: 12 }}>
              {i > 0 && <Divider />}
              <Row>
                <View style={[styles.icon, { backgroundColor: c.surface2 }]}><Ionicons name="arrow-up" size={18} color={c.muted} /></View>
                <View style={{ flex: 1 }}><Txt v="small" style={{ fontFamily: F.bold }}>{tr('Uzcard •• 4521')}</Txt><Txt v="tiny" muted>{tr('{at} · xizmat haqi {fee}', { at: fmtDate(p.at), fee: som(p.fee) })}</Txt></View>
                <Txt v="small" style={{ fontFamily: F.heavy }}>−{som(p.amount)}</Txt>
              </Row>
            </View>
          ))}
        </Card>
      )}

      {list.length ? (
        <Card style={{ gap: 12 }}>
          <Txt v="h3">{tr('Safarlar')}</Txt>
          {list.map((e, i) => <View key={e.id} style={{ gap: 12 }}>{i > 0 && <Divider />}<TripRow e={e} onPress={() => setDetail(e)} /></View>)}
        </Card>
      ) : (
        <EmptyState icon="car-outline" title={tr("Bu davrda safar yo'q")} sub={tr('Liniyaga chiqing — birinchi buyurtma tez orada keladi')} />
      )}

      <WithdrawSheet visible={sheet} onClose={() => setSheet(false)} />
      <TripSheet e={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}

function WithdrawSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: c } = useStore();
  const d = useDriver();
  const [part, setPart] = useState<0.5 | 1>(1);
  const amount = Math.max(0, Math.floor((d.balance * part) / 1000) * 1000);
  const fee = Math.max(1000, Math.round(amount * 0.01));
  return (
    <Sheet visible={visible} onClose={onClose} title={tr('Pul yechish')}
      footer={<Button title={tr('{sum} yechish', { sum: som(Math.max(0, amount - fee)) })} icon="arrow-up-circle" disabled={amount <= fee} style={{ marginTop: 12 }}
        onPress={() => { const p = d.withdraw(amount); onClose(); if (p) toast(tr("{sum} kartaga o'tkazildi", { sum: som(amount - p.fee) }), 'checkmark-circle'); }} />}>
      <Txt v="small" muted>{tr('Mavjud: {balance}', { balance: som(d.balance) })}</Txt>
      <Row gap={8}>
        <Chip label={tr('Hammasi')} active={part === 1} onPress={() => setPart(1)} />
        <Chip label={tr('Yarmi')} active={part === 0.5} onPress={() => setPart(0.5)} />
      </Row>
      <View style={[styles.card, { backgroundColor: c.surface2 }]}>
        <Ionicons name="card" size={22} color={c.accent} />
        <View style={{ flex: 1 }}><Txt v="h3">{tr('Uzcard •• 4521')}</Txt><Txt v="tiny" muted>{tr('Darhol · 1–2 daqiqada')}</Txt></View>
        <Ionicons name="checkmark-circle" size={20} color={GREEN} />
      </View>
      <Line label={tr('Summa')} value={som(amount)} />
      <Line label={tr("Xizmat haqi (1%, kamida 1 000 so'm)")} value={`−${som(fee)}`} />
      <Line label={tr('Kartaga tushadi')} value={som(Math.max(0, amount - fee))} bold />
    </Sheet>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const { colors: c } = useStore();
  return (
    <View style={[styles.mini, { backgroundColor: c.surface2 }]}>
      <Txt v="tiny" muted>{label}</Txt>
      <Txt v="small" numberOfLines={1} style={{ fontFamily: F.heavy }}>{value}</Txt>
    </View>
  );
}

function Line({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt muted={!bold} v={bold ? 'h3' : 'body'} style={{ flexShrink: 1 }}>{label}</Txt>
      <Txt v={bold ? 'h3' : 'body'} color={color} style={{ fontFamily: F.bold }}>{value}</Txt>
    </Row>
  );
}

/** Safar tafsilotlari: yo'nalish, narx tarkibi, baholar */
function TripSheet({ e, onClose }: { e: Earning | null; onClose: () => void }) {
  const { colors: c } = useStore();
  if (!e) return <Sheet visible={false} onClose={onClose}><View /></Sheet>;
  const total = e.price + (e.waitFee ?? 0);
  const fee = feeOf(e);
  const tariffId = TARIFFS.find(t => t.id === e.tariffId)?.name;
  const tariff = tariffId ? tr(tariffId) : undefined;
  return (
    <Sheet visible onClose={onClose} title={e.noShow ? tr('Mijoz chiqmadi') : tr('Safar tafsilotlari')}>
      <Txt v="small" muted>{fmtDate(e.at)}{tariff ? ` · ${tariff}` : ''}{e.surge ? ` · ×${e.surge.toFixed(1)}` : ''}</Txt>
      <View style={[styles.route, { backgroundColor: c.surface2 }]}>
        <Row gap={10}><View style={[styles.dot, { backgroundColor: '#0F1E3D' }]} /><Txt v="h3" numberOfLines={1} style={{ flex: 1 }}>{trPlace(e.from)}</Txt></Row>
        <Row gap={10}><View style={[styles.dot, { backgroundColor: '#FFC800' }]} /><Txt v="h3" numberOfLines={1} style={{ flex: 1 }}>{trPlace(e.to)}</Txt></Row>
        {!e.noShow ? <Txt v="tiny" muted>{tr('{km} km · {min} daq · {pay}', { km: e.km, min: e.min, pay: e.payment === 'cash' ? tr('naqd') : tr('karta') })}</Txt> : null}
      </View>
      {e.price ? <Line label={tr('Safar narxi')} value={som(e.price)} /> : null}
      {e.waitFee ? <Line label={e.noShow ? tr('Kutish uchun kompensatsiya') : tr('Pullik kutish')} value={som(e.waitFee)} /> : null}
      <Line label={tr('YUMS komissiyasi ({pct}%)', { pct: Math.round((fee / Math.max(1, total)) * 100) })} value={`−${som(fee)}`} color={c.danger} />
      {e.tip ? <Line label={tr('Choy puli')} value={`+${som(e.tip)}`} color={GREEN} /> : null}
      <Divider />
      <Line label={tr('Sizga')} value={som(total - fee + e.tip)} bold />
      <Row gap={10} style={{ marginTop: 4 }}>
        <View style={[styles.mini, { backgroundColor: c.surface2 }]}><Txt v="tiny" muted>{tr("Yo'lovchi bahosi")}</Txt><Txt v="small" style={{ fontFamily: F.heavy }}>{e.stars ? '★'.repeat(e.stars) : '—'}</Txt></View>
        <View style={[styles.mini, { backgroundColor: c.surface2 }]}><Txt v="tiny" muted>{tr('Sizning bahoyingiz')}</Txt><Txt v="small" style={{ fontFamily: F.heavy }}>{e.passengerStars ? '★'.repeat(e.passengerStars) : '—'}</Txt></View>
      </Row>
    </Sheet>
  );
}

function TripRow({ e, onPress }: { e: Earning; onPress: () => void }) {
  const { colors: c } = useStore();
  const total = e.price + (e.waitFee ?? 0);
  return (
    <Pressable onPress={onPress} accessibilityLabel={tr('Safar: {from} → {to}', { from: trPlace(e.from), to: trPlace(e.to) })}>
      <Row gap={12}>
        <View style={[styles.icon, { backgroundColor: c.surface2 }]}><Ionicons name={e.payment === 'cash' ? 'cash-outline' : 'card-outline'} size={18} color={c.muted} /></View>
        <View style={{ flex: 1 }}>
          <Txt v="small" numberOfLines={1} style={{ fontFamily: F.bold }}>{route(trPlace(e.from), trPlace(e.to))}</Txt>
          <Txt v="tiny" muted numberOfLines={1}>{tr('{at} · {km} km · {min} daq{v2}{v3}', { at: fmtDate(e.at), km: e.km, min: e.min, v2: e.surge ? ` · ×${e.surge.toFixed(1)}` : '', v3: e.stars ? ` · ${'★'.repeat(e.stars)}` : '' })}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="small" style={{ fontFamily: F.heavy }}>{som(total - feeOf(e))}</Txt>
          {e.tip ? <Txt v="tiny" color={GREEN}>+{som(e.tip)}</Txt> : <Txt v="tiny" muted>{som(total)}</Txt>}
        </View>
      </Row>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 24, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  balanceValue: { fontFamily: F.heavy, fontSize: 30, letterSpacing: -1, marginVertical: 2 },
  withdraw: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  big: { fontFamily: F.heavy, fontSize: 32, letterSpacing: -1 },
  mini: { flex: 1, padding: 10, borderRadius: 14, gap: 2 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 },
  bar: { width: '70%', borderRadius: 6 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  route: { gap: 10, padding: 14, borderRadius: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
});
