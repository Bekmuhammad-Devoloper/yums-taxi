import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Divider, ListItem, PersonAvatar, Row, Screen, Txt } from '@/components/ui';
import { DOC_KINDS } from '@/driver/lib/docs';
import { useDriver } from '@/driver/lib/driver-store';
import { callNumber } from '@/driver/lib/support';
import { activityColor } from '@/driver/lib/theme';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const go = (path: string) => router.push(path as never);

/** Menyu uchun 3D ikonkalar */
const ART = {
  car: require('@/assets/menu/car.webp'),
  documents: require('@/assets/menu/documents.webp'),
  settings: require('@/assets/menu/settings.webp'),
  support: require('@/assets/menu/support.webp'),
  safety: require('@/assets/menu/safety.webp'),
};

export default function Menu() {
  const { colors: c } = useStore();
  const d = useDriver();
  const p = d.profile;
  if (!p) return null;

  return (
    <Screen title="Menyu">
      <Pressable onPress={() => go('/profile')} style={[styles.head, { backgroundColor: c.surface, borderColor: c.line }]}>
        <PersonAvatar driver name={p.name} photo={p.photo} gender={p.gender} size={60} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h2" numberOfLines={1}>{p.name}</Txt>
          <Txt v="small" muted numberOfLines={1}>{p.car} · {p.color}</Txt>
          <View style={[styles.plate, { borderColor: c.text }]}><Text style={[styles.plateText, { color: c.text }]}>{p.plate}</Text></View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.faint} />
      </Pressable>

      <Row gap={10}>
        <Pressable onPress={() => go('/quality')} style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.statValue, { color: activityColor(d.activity) }]}>{d.activity}</Text>
          <Txt v="tiny" muted>Faollik</Txt>
        </Pressable>
        <Pressable onPress={() => go('/quality')} style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.statValue, { color: c.text }]}>★ {d.rating.toFixed(2)}</Text>
          <Txt v="tiny" muted>Reyting</Txt>
        </Pressable>
        <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.statValue, { color: c.text }]}>{p.trips}</Text>
          <Txt v="tiny" muted>Safarlar</Txt>
        </View>
      </Row>

      <Pressable onPress={() => go('/earnings')} style={[styles.balance, { backgroundColor: '#0F1E3D' }]}>
        <View style={{ flex: 1 }}>
          <Txt v="small" color="rgba(255,255,255,0.65)">Balans</Txt>
          <Text style={styles.balanceValue}>{som(d.balance)}</Text>
          <Txt v="tiny" color="rgba(255,255,255,0.55)">Bugun: {som(d.today.sum)} · {d.today.count} ta safar</Txt>
        </View>
        <View style={styles.withdraw}><Txt v="small" color="#0E1525" style={{ fontFamily: F.heavy }}>Pul yechish</Txt></View>
      </Pressable>

      <Card style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
        <ListItem icon="stats-chart" iconBg="#E8F7EF" iconColor="#12A66A" title="Daromad" sub="Kun, hafta, oy · safarlar tarixi" onPress={() => go('/earnings')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="pulse" iconBg="#FFF3DC" iconColor="#D97706" title="Faollik va reyting" sub="Qoidalar, baholar, sifat" onPress={() => go('/quality')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="car-sport" art={ART.car} iconBg="#E8EEFF" iconColor="#2457F5" title="Avtomobil va tariflar" sub={`${p.car} · ${d.activeTariffs.length} ta faol tarif`} onPress={() => go('/profile')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="document-text" art={ART.documents} iconBg="#F0EAFF" iconColor="#7A4DF0" title="Hujjatlar" sub={`${DOC_KINDS.filter(k => d.docs[k].status === 'approved').length} / ${DOC_KINDS.length} tasdiqlangan · guvohnoma, tex. pasport`} onPress={() => go('/documents')} />
      </Card>

      <Card style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
        <ListItem icon="settings" art={ART.settings} title="Sozlamalar" sub="Navigator, mavzu, demo rejim" onPress={() => go('/settings')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="headset" art={ART.support} title="Yordam markazi" sub="24/7 · chat, savol-javoblar" onPress={() => go('/support')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="shield-checkmark" art={ART.safety} title="Xavfsizlik" sub="Favqulodda vaziyat · 112" onPress={() => callNumber('112')} />
      </Card>

      <Txt v="tiny" faint style={{ textAlign: 'center' }}>YUMS Driver 1.0 · {d.live ? 'YUMS bilan jonli ulangan' : 'demo rejim'}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  plate: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 6, marginTop: 4 },
  plateText: { fontFamily: F.heavy, fontSize: 12.5, letterSpacing: 1.2 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  statValue: { fontFamily: F.heavy, fontSize: 20, letterSpacing: -0.5 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 22 },
  balanceValue: { fontFamily: F.heavy, fontSize: 28, color: '#fff', letterSpacing: -0.8, marginVertical: 2 },
  withdraw: { backgroundColor: '#FFC800', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
});
