import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { Avatar, Card, Divider, IOSSwitch, Row, Screen, Txt } from '@/components/ui';
import { useDriver } from '@/driver/lib/driver-store';
import { TARIFF_ART } from '@/lib/cars';
import { TARIFFS } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const DOCS = [
  { icon: 'card' as const, title: 'Haydovchilik guvohnomasi', sub: 'B, C toifalari' },
  { icon: 'document-text' as const, title: 'Texnik pasport', sub: 'Avtomobil ro\'yxatdan o\'tgan' },
  { icon: 'ribbon' as const, title: 'Taksi litsenziyasi', sub: "O'zbekiston Respublikasi" },
  { icon: 'shield-checkmark' as const, title: "OSAGO sug'urtasi", sub: 'Amal qiladi' },
];

export default function Profile() {
  const { colors: c } = useStore();
  const d = useDriver();
  const p = d.profile;
  if (!p) return null;
  const toggle = (id: string, on: boolean) => {
    if (!on && p.tariffs.length === 1) { toast('Kamida bitta tarif yoqilgan bo\'lishi kerak', 'alert-circle'); return; }
    d.updateProfile({ tariffs: on ? [...p.tariffs, id] : p.tariffs.filter(x => x !== id) });
  };

  return (
    <Screen title="Avtomobil va hujjatlar">
      <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
        <Avatar name={p.name} size={72} />
        <Txt v="h2">{p.name}</Txt>
        <Txt v="small" muted>{p.phone} · {p.city} · YUMSda {fmtDate(p.joinedAt).split(',')[0]} dan</Txt>
      </Card>

      <Card style={{ gap: 12 }}>
        <Row>
          <Image source={TARIFF_ART[p.tariffs[0]] ?? TARIFF_ART.start} style={{ width: 100, height: 52 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{p.car}</Txt>
            <Txt v="small" muted>{p.color}</Txt>
          </View>
        </Row>
        <View style={[styles.plate, { borderColor: c.text }]}>
          <Text style={[styles.plateText, { color: c.text }]}>{p.plate}</Text>
          <View style={styles.uz}><Text style={styles.uzText}>UZ</Text></View>
        </View>
      </Card>

      <Card style={{ gap: 4 }}>
        <Txt v="h3" style={{ marginBottom: 4 }}>Tariflar</Txt>
        {TARIFFS.map((t, i) => (
          <View key={t.id}>
            {i > 0 && <Divider />}
            <Row style={{ paddingVertical: 8 }}>
              <Image source={TARIFF_ART[t.id]} style={{ width: 56, height: 30 }} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Txt v="h3">{t.name}</Txt>
                <Txt v="tiny" muted>{t.desc}</Txt>
              </View>
              <IOSSwitch value={p.tariffs.includes(t.id)} onChange={v => toggle(t.id, v)} label={t.name} />
            </Row>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 4 }}>
        <Txt v="h3" style={{ marginBottom: 4 }}>Hujjatlar</Txt>
        {DOCS.map((doc, i) => (
          <View key={doc.title}>
            {i > 0 && <Divider />}
            <Row style={{ paddingVertical: 10 }}>
              <View style={[styles.docIcon, { backgroundColor: c.surface2 }]}><Ionicons name={doc.icon} size={18} color={c.text} /></View>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{doc.title}</Txt>
                <Txt v="tiny" muted>{doc.sub}</Txt>
              </View>
              <View style={[styles.ok, { backgroundColor: c.okSoft }]}><Ionicons name="checkmark-circle" size={14} color={c.ok} /><Txt v="tiny" color={c.ok}>Tasdiqlangan</Txt></View>
            </Row>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plate: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 2, borderRadius: 8, paddingLeft: 12, overflow: 'hidden' },
  plateText: { fontFamily: F.heavy, fontSize: 20, letterSpacing: 2, paddingVertical: 4, paddingRight: 10 },
  uz: { backgroundColor: '#1E88E5', alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 6 },
  uzText: { color: '#fff', fontFamily: F.heavy, fontSize: 11 },
  docIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
});
