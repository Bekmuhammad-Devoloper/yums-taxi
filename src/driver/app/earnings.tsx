import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Divider, EmptyState, Row, Screen, Segmented, Txt } from '@/components/ui';
import { useDriver, type Earning } from '@/driver/lib/driver-store';
import { fmtDate } from '@/lib/format';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

type Period = 'today' | 'week' | 'all';
const DAY = 86400000;
const COMMISSION = 0.1;

export default function Earnings() {
  const { colors: c } = useStore();
  const { earnings } = useDriver();
  const [period, setPeriod] = useState<Period>('today');

  const list = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const from = period === 'today' ? start.getTime() : period === 'week' ? start.getTime() - 6 * DAY : 0;
    return earnings.filter(e => new Date(e.at).getTime() >= from);
  }, [earnings, period]);

  const gross = list.reduce((s, e) => s + e.price, 0);
  const tips = list.reduce((s, e) => s + e.tip, 0);
  const fee = Math.round(gross * COMMISSION);
  const cash = list.filter(e => e.payment === 'cash').reduce((s, e) => s + e.price, 0);
  const km = list.reduce((s, e) => s + e.km, 0);
  const rated = list.filter(e => e.stars);
  const avg = rated.length ? rated.reduce((s, e) => s + (e.stars ?? 0), 0) / rated.length : 0;

  // So'nggi 7 kun diagrammasi
  const week = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d0 = today.getTime() - (6 - i) * DAY;
      const sum = earnings.filter(e => { const t = new Date(e.at).getTime(); return t >= d0 && t < d0 + DAY; }).reduce((s, e) => s + e.price + e.tip, 0);
      return { label: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'][new Date(d0).getDay()], sum, today: i === 6 };
    });
  }, [earnings]);
  const max = Math.max(1, ...week.map(w => w.sum));

  return (
    <Screen title="Daromad" subtitle={`${list.length} ta safar · ${km.toFixed(1)} km`}>
      <Segmented<Period> items={[{ id: 'today', label: 'Bugun' }, { id: 'week', label: '7 kun' }, { id: 'all', label: 'Hammasi' }]} value={period} onChange={setPeriod} />

      <View style={[styles.hero, { backgroundColor: '#0F1E3D' }]}>
        <Txt v="small" color="rgba(255,255,255,0.65)">Sof daromad</Txt>
        <Text style={styles.big}>{som(gross - fee + tips)}</Text>
        <Row gap={18} style={{ marginTop: 6 }}>
          <Mini label="Safarlar" value={som(gross)} />
          <Mini label="Choy puli" value={som(tips)} />
          <Mini label="Reyting" value={avg ? `★ ${avg.toFixed(2)}` : '—'} />
        </Row>
        <View style={styles.chart}>
          {week.map((w, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={[styles.bar, { height: 8 + (w.sum / max) * 64, backgroundColor: w.today ? '#FFC800' : 'rgba(255,255,255,0.22)' }]} />
              <Txt v="tiny" color={w.today ? '#FFC800' : 'rgba(255,255,255,0.55)'} style={{ fontFamily: F.bold }}>{w.label}</Txt>
            </View>
          ))}
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <Line label="Safarlar summasi" value={som(gross)} />
        <Line label={`YUMS komissiyasi (${COMMISSION * 100}%)`} value={`−${som(fee)}`} color={c.danger} />
        <Line label="Choy puli" value={`+${som(tips)}`} color={c.ok} />
        <Divider />
        <Line label="Naqd olingan" value={som(cash)} />
        <Line label="Kartaga tushadi" value={som(gross - cash - fee + tips)} bold />
      </Card>

      {list.length ? (
        <Card style={{ gap: 12 }}>
          <Txt v="h3">Safarlar</Txt>
          {list.map((e, i) => <View key={e.id} style={{ gap: 12 }}>{i > 0 && <Divider />}<TripRow e={e} /></View>)}
        </Card>
      ) : (
        <EmptyState icon="car-outline" title="Hali safar yo'q" sub="Liniyaga chiqing — birinchi buyurtma tez orada keladi" />
      )}
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Txt v="tiny" color="rgba(255,255,255,0.55)">{label}</Txt>
      <Txt v="small" color="#fff" style={{ fontFamily: F.bold }}>{value}</Txt>
    </View>
  );
}

function Line({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt muted={!bold} v={bold ? 'h3' : 'body'}>{label}</Txt>
      <Txt v={bold ? 'h3' : 'body'} color={color} style={{ fontFamily: F.bold }}>{value}</Txt>
    </Row>
  );
}

function TripRow({ e }: { e: Earning }) {
  const { colors: c } = useStore();
  return (
    <Row gap={12}>
      <View style={[styles.icon, { backgroundColor: c.surface2 }]}><Ionicons name={e.payment === 'cash' ? 'cash-outline' : 'card-outline'} size={18} color={c.muted} /></View>
      <View style={{ flex: 1 }}>
        <Txt v="small" numberOfLines={1} style={{ fontFamily: F.bold }}>{e.from} → {e.to}</Txt>
        <Txt v="tiny" muted>{fmtDate(e.at)} · {e.km} km · {e.min} daq{e.stars ? ` · ${'★'.repeat(e.stars)}` : ''}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt v="small" style={{ fontFamily: F.heavy }}>{som(e.price)}</Txt>
        {e.tip ? <Txt v="tiny" color={c.ok}>+{som(e.tip)}</Txt> : null}
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 18 },
  big: { fontFamily: F.heavy, fontSize: 32, color: '#fff', letterSpacing: -1 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 96, marginTop: 18, gap: 6 },
  bar: { width: '70%', borderRadius: 6 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
