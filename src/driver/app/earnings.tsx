import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { Button, Card, Chip, Divider, EmptyState, Row, Screen, Segmented, Sheet, Txt } from '@/components/ui';
import { COMMISSION, feeOf, useDriver, type Earning } from '@/driver/lib/driver-store';
import { GREEN } from '@/driver/lib/theme';
import { fmtDate } from '@/lib/format';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

type Period = 'today' | 'week' | 'month';
const DAY = 86400000;

export default function Earnings() {
  const { colors: c } = useStore();
  const d = useDriver();
  const { earnings } = d;
  const [period, setPeriod] = useState<Period>('today');
  const [sheet, setSheet] = useState(false);
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
      return { label: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'][new Date(d0).getDay()], sum, today: i === 6 };
    });
  }, [earnings, now]);
  const max = Math.max(1, ...week.map(w => w.sum));

  return (
    <Screen title="Daromad" subtitle={`${list.length} ta safar · ${km.toFixed(1)} km`}>
      <View style={[styles.balance, { backgroundColor: '#0F1E3D' }]}>
        <View style={{ flex: 1 }}>
          <Txt v="small" color="rgba(255,255,255,0.65)">Balans</Txt>
          <Text style={[styles.balanceValue, d.balance < 0 && { color: '#FF8A80' }]}>{som(d.balance)}</Text>
          <Txt v="tiny" color="rgba(255,255,255,0.55)">{d.balance < 0 ? "Naqd safarlar komissiyasi — balansni to'ldiring" : 'Kartadagi safarlar va choy puli'}</Txt>
        </View>
        <Pressable onPress={() => setSheet(true)} disabled={d.balance <= 0} style={[styles.withdraw, { opacity: d.balance > 0 ? 1 : 0.45 }]} accessibilityLabel="Pul yechish">
          <Ionicons name="arrow-up-circle" size={18} color="#0E1525" />
          <Txt v="small" color="#0E1525" style={{ fontFamily: F.heavy }}>Pul yechish</Txt>
        </Pressable>
      </View>

      <Segmented<Period> items={[{ id: 'today', label: 'Bugun' }, { id: 'week', label: '7 kun' }, { id: 'month', label: '30 kun' }]} value={period} onChange={setPeriod} />

      <Card style={{ gap: 14 }}>
        <View>
          <Txt v="small" muted>Sof daromad</Txt>
          <Text style={[styles.big, { color: c.text }]}>{som(net)}</Text>
        </View>
        <Row gap={10}>
          <Mini label="Safarlar" value={String(list.length)} />
          <Mini label="Masofa" value={`${km.toFixed(0)} km`} />
          <Mini label={period === 'today' ? 'Liniyada' : "O'rtacha"} value={period === 'today' ? `${Math.floor(onlineMs / 3600000)} s ${Math.floor((onlineMs % 3600000) / 60000)} d` : som(list.length ? Math.round(net / list.length) : 0)} />
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
        <Line label="Safarlar summasi" value={som(gross)} />
        {wait ? <Line label="shundan pullik kutish" value={som(wait)} /> : null}
        <Line label={`YUMS komissiyasi (${COMMISSION * 100}%)`} value={`−${som(fee)}`} color={c.danger} />
        <Line label="Choy puli" value={`+${som(tips)}`} color={GREEN} />
        <Divider />
        <Line label="Naqd olingan" value={som(cash)} />
        <Line label="Balansga tushgan" value={som(net - cash)} bold />
      </Card>

      {d.payouts.length > 0 && (
        <Card style={{ gap: 12 }}>
          <Txt v="h3">Pul yechish tarixi</Txt>
          {d.payouts.slice(0, 5).map((p, i) => (
            <View key={p.id} style={{ gap: 12 }}>
              {i > 0 && <Divider />}
              <Row>
                <View style={[styles.icon, { backgroundColor: c.surface2 }]}><Ionicons name="arrow-up" size={18} color={c.muted} /></View>
                <View style={{ flex: 1 }}><Txt v="small" style={{ fontFamily: F.bold }}>Uzcard •• 4521</Txt><Txt v="tiny" muted>{fmtDate(p.at)} · xizmat haqi {som(p.fee)}</Txt></View>
                <Txt v="small" style={{ fontFamily: F.heavy }}>−{som(p.amount)}</Txt>
              </Row>
            </View>
          ))}
        </Card>
      )}

      {list.length ? (
        <Card style={{ gap: 12 }}>
          <Txt v="h3">Safarlar</Txt>
          {list.map((e, i) => <View key={e.id} style={{ gap: 12 }}>{i > 0 && <Divider />}<TripRow e={e} /></View>)}
        </Card>
      ) : (
        <EmptyState icon="car-outline" title="Bu davrda safar yo'q" sub="Liniyaga chiqing — birinchi buyurtma tez orada keladi" />
      )}

      <WithdrawSheet visible={sheet} onClose={() => setSheet(false)} />
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
    <Sheet visible={visible} onClose={onClose} title="Pul yechish"
      footer={<Button title={`${som(Math.max(0, amount - fee))} yechish`} icon="arrow-up-circle" disabled={amount <= fee} style={{ marginTop: 12 }}
        onPress={() => { const p = d.withdraw(amount); onClose(); if (p) toast(`${som(amount - p.fee)} kartaga o'tkazildi`, 'checkmark-circle'); }} />}>
      <Txt v="small" muted>Mavjud: {som(d.balance)}</Txt>
      <Row gap={8}>
        <Chip label="Hammasi" active={part === 1} onPress={() => setPart(1)} />
        <Chip label="Yarmi" active={part === 0.5} onPress={() => setPart(0.5)} />
      </Row>
      <View style={[styles.card, { backgroundColor: c.surface2 }]}>
        <Ionicons name="card" size={22} color={c.accent} />
        <View style={{ flex: 1 }}><Txt v="h3">Uzcard •• 4521</Txt><Txt v="tiny" muted>Darhol · 1–2 daqiqada</Txt></View>
        <Ionicons name="checkmark-circle" size={20} color={GREEN} />
      </View>
      <Line label="Summa" value={som(amount)} />
      <Line label="Xizmat haqi (1%, kamida 1 000 so'm)" value={`−${som(fee)}`} />
      <Line label="Kartaga tushadi" value={som(Math.max(0, amount - fee))} bold />
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

function TripRow({ e }: { e: Earning }) {
  const { colors: c } = useStore();
  const total = e.price + (e.waitFee ?? 0);
  return (
    <Row gap={12}>
      <View style={[styles.icon, { backgroundColor: c.surface2 }]}><Ionicons name={e.payment === 'cash' ? 'cash-outline' : 'card-outline'} size={18} color={c.muted} /></View>
      <View style={{ flex: 1 }}>
        <Txt v="small" numberOfLines={1} style={{ fontFamily: F.bold }}>{e.from} → {e.to}</Txt>
        <Txt v="tiny" muted numberOfLines={1}>{fmtDate(e.at)} · {e.km} km · {e.min} daq{e.surge ? ` · ×${e.surge.toFixed(1)}` : ''}{e.stars ? ` · ${'★'.repeat(e.stars)}` : ''}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt v="small" style={{ fontFamily: F.heavy }}>{som(total - feeOf(e))}</Txt>
        {e.tip ? <Txt v="tiny" color={GREEN}>+{som(e.tip)}</Txt> : <Txt v="tiny" muted>{som(total)}</Txt>}
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 24 },
  balanceValue: { fontFamily: F.heavy, fontSize: 30, color: '#fff', letterSpacing: -1, marginVertical: 2 },
  withdraw: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFC800', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  big: { fontFamily: F.heavy, fontSize: 32, letterSpacing: -1 },
  mini: { flex: 1, padding: 10, borderRadius: 14, gap: 2 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 },
  bar: { width: '70%', borderRadius: 6 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
});
