import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, Chip, Divider, IOSSwitch, ListItem, Row, Screen, Txt } from '@/components/ui';
import { useDriver } from '@/driver/lib/driver-store';
import { TARIFF_ART } from '@/lib/cars';
import { confirm } from '@/lib/confirm';
import { TARIFFS } from '@/lib/data';
import { DISPATCH_URL } from '@/lib/dispatch';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

export default function Profile() {
  const { colors: c, dark, setTheme } = useStore();
  const d = useDriver();
  const p = d.profile;
  if (!p) return null;
  const toggle = (id: string) => {
    const on = p.tariffs.includes(id);
    if (on && p.tariffs.length === 1) return;
    d.updateProfile({ tariffs: on ? p.tariffs.filter(x => x !== id) : [...p.tariffs, id] });
  };

  return (
    <Screen title="Profil">
      <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
        <Avatar name={p.name} size={76} />
        <Txt v="h2">{p.name}</Txt>
        <Txt v="small" muted>{p.phone} · {p.city}</Txt>
        <Row gap={18} style={{ marginTop: 6 }}>
          <View style={{ alignItems: 'center' }}><Txt v="h3">★ {p.rating.toFixed(2)}</Txt><Txt v="tiny" muted>Reyting</Txt></View>
          <View style={{ alignItems: 'center' }}><Txt v="h3">{p.trips}</Txt><Txt v="tiny" muted>Safarlar</Txt></View>
          <View style={{ alignItems: 'center' }}><Txt v="h3">{fmtDate(p.joinedAt).split(',')[0]}</Txt><Txt v="tiny" muted>YUMSda</Txt></View>
        </Row>
      </Card>

      <Card style={{ gap: 12 }}>
        <Row>
          <Image source={TARIFF_ART[p.tariffs[0]] ?? TARIFF_ART.start} style={{ width: 92, height: 48 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{p.car}</Txt>
            <Txt v="small" muted>{p.color}</Txt>
          </View>
        </Row>
        <View style={[styles.plate, { borderColor: c.text }]}>
          <Text style={[styles.plateText, { color: c.text }]}>{p.plate}</Text>
          <View style={styles.uz}><Text style={styles.uzText}>UZ</Text></View>
        </View>
        <Divider />
        <Txt v="small" muted style={{ fontFamily: F.bold }}>Tariflar</Txt>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>{TARIFFS.map(t => <Chip key={t.id} label={t.name} active={p.tariffs.includes(t.id)} onPress={() => toggle(t.id)} />)}</Row>
      </Card>

      <Card style={{ gap: 4 }}>
        <Row style={{ paddingVertical: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">Demo harakat</Txt>
            <Txt v="small" muted>GPS o'rniga mashina marshrut bo'ylab o'zi yuradi</Txt>
          </View>
          <IOSSwitch value={d.autopilot} onChange={d.setAutopilot} label="Demo harakat" />
        </Row>
        <Divider />
        <Row style={{ paddingVertical: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">Tungi rejim</Txt>
            <Txt v="small" muted>Kechasi ko'zni charchatmaydi</Txt>
          </View>
          <IOSSwitch value={dark} onChange={v => setTheme(v ? 'dark' : 'light')} label="Tungi rejim" />
        </Row>
      </Card>

      <Card style={{ gap: 6 }}>
        <Txt v="h3">YUMS bilan bog'lanish</Txt>
        <Txt v="small" muted>
          {DISPATCH_URL ? `Dispetcher: ${DISPATCH_URL} · ${d.live ? 'ulangan' : 'ulanmoqda…'}` : 'Dispetcher serveri sozlanmagan — demo buyurtmalar ishlatilmoqda. EXPO_PUBLIC_DISPATCH_URL ni bering.'}
        </Txt>
      </Card>

      <ListItem icon="log-out-outline" title="Chiqish" danger onPress={() => confirm('Hisobdan chiqasizmi?', "Daromad tarixi qurilmada saqlanib qoladi.", d.logout, 'Chiqish')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  plate: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 2, borderRadius: 8, paddingLeft: 12, overflow: 'hidden' },
  plateText: { fontFamily: F.heavy, fontSize: 20, letterSpacing: 2, paddingVertical: 4, paddingRight: 10 },
  uz: { backgroundColor: '#1E88E5', alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 6 },
  uzText: { color: '#fff', fontFamily: F.heavy, fontSize: 11 },
});
