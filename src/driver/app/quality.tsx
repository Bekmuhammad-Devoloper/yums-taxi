import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Divider, Row, Screen, Txt } from '@/components/ui';
import { ACTIVITY, useDriver } from '@/driver/lib/driver-store';
import { activityColor } from '@/driver/lib/theme';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, tx } from '@/lib/i18n';

const LEVELS = [
  { from: 70, title: tx('Yuqori'), text: tx('Buyurtmalar birinchi navbatda sizga taklif qilinadi') },
  { from: 40, title: tx("O'rtacha"), text: tx('Buyurtmalar odatdagidek keladi') },
  { from: 0, title: tx('Past'), text: tx('Buyurtmalar kamroq va kechroq keladi') },
];

export default function Quality() {
  const { colors: c } = useStore();
  const d = useDriver();
  const col = activityColor(d.activity);
  const level = LEVELS.find(l => d.activity >= l.from) ?? LEVELS[2];
  const rated = d.earnings.filter(e => e.stars).slice(0, 50);
  const dist = [5, 4, 3, 2, 1].map(s => ({ s, n: rated.filter(e => e.stars === s).length }));
  const maxN = Math.max(1, ...dist.map(x => x.n));

  return (
    <Screen title={tr('Faollik va reyting')}>
      <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
        <View style={[styles.ring, { borderColor: col }]}>
          <Text style={[styles.big, { color: col }]}>{d.activity}</Text>
          <Txt v="tiny" muted>{tr('100 dan')}</Txt>
        </View>
        <Txt v="h2" style={{ marginTop: 6 }}>{tr('Faollik: {title}', { title: tr(level.title) })}</Txt>
        <Txt v="small" muted style={{ textAlign: 'center' }}>{tr(level.text)}</Txt>
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt v="h3">{tr("Faollik qanday o'zgaradi")}</Txt>
        <Rule icon="checkmark-circle" color="#12A66A" text={tr('Buyurtmani qabul qilish')} value={`+${ACTIVITY.accept}`} />
        <Divider />
        <Rule icon="remove-circle" color="#D97706" text={tr('Rad etish')} value={String(ACTIVITY.decline)} />
        <Divider />
        <Rule icon="time" color="#D97706" text={tr("Taklifni o'tkazib yuborish")} value={String(ACTIVITY.missed)} />
        <Divider />
        <Rule icon="close-circle" color="#E5484D" text={tr('Qabul qilingan buyurtmani bekor qilish')} value={String(ACTIVITY.cancel)} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="h3">{tr('Reyting')}</Txt>
          <Txt v="h2">★ {d.rating.toFixed(2)}</Txt>
        </Row>
        <Txt v="small" muted>{tr("So'nggi {length} ta baho asosida", { length: rated.length || 0 })}</Txt>
        {dist.map(x => (
          <Row key={x.s} gap={10}>
            <Txt v="small" style={{ width: 26, fontFamily: F.bold }}>{x.s}★</Txt>
            <View style={[styles.bar, { backgroundColor: c.surface2 }]}><View style={{ width: `${(x.n / maxN) * 100}%`, height: 8, borderRadius: 4, backgroundColor: '#F5A524' }} /></View>
            <Txt v="small" muted style={{ width: 24, textAlign: 'right' }}>{x.n}</Txt>
          </Row>
        ))}
      </Card>

      <View style={[styles.tip, { backgroundColor: c.accentSoft }]}>
        <Ionicons name="bulb" size={20} color={c.accent} />
        <Txt v="small" color={c.accent} style={{ flex: 1, lineHeight: 19 }}>{tr("Yuqori talab (to'q sariq) hududlarida buyurtmalar tezroq keladi va narx koeffitsienti bilan hisoblanadi.")}</Txt>
      </View>
    </Screen>
  );
}

function Rule({ icon, color, text, value }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string; value: string }) {
  return (
    <Row>
      <Ionicons name={icon} size={20} color={color} />
      <Txt style={{ flex: 1 }}>{text}</Txt>
      <Txt v="h3" color={color}>{value}</Txt>
    </Row>
  );
}

const styles = StyleSheet.create({
  ring: { width: 128, height: 128, borderRadius: 64, borderWidth: 9, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: F.heavy, fontSize: 40, letterSpacing: -1.5 },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
});
