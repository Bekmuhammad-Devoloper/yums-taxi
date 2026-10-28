import { StyleSheet, View } from 'react-native';

import { Card, Divider, IOSSwitch, ListItem, Row, Screen, Segmented, Txt } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { useDriver, type NavApp } from '@/driver/lib/driver-store';
import { DISPATCH_URL } from '@/lib/dispatch';
import { useStore } from '@/lib/store';

export default function Settings() {
  const { dark, setTheme } = useStore();
  const d = useDriver();
  return (
    <Screen title="Sozlamalar">
      <Card style={{ gap: 10 }}>
        <Txt v="h3">Tashqi navigator</Txt>
        <Txt v="small" muted>Ichki navigator doim ishlaydi. Banner ustidagi tugma tanlangan ilovada marshrutni ochadi.</Txt>
        <Segmented<NavApp> items={[{ id: 'yandex', label: 'Yandex Navigator' }, { id: 'google', label: 'Google Maps' }]} value={d.navApp} onChange={d.setNavApp} />
      </Card>

      <Card style={{ gap: 4 }}>
        <SwitchRow title="Ovozli yo'riqnoma" sub="Yangi buyurtma, burilishlar va safar holati ovozda" value={d.voice} onChange={d.setVoice} />
        <Divider />
        <SwitchRow title="Tungi rejim" sub="Kechasi ko'zni charchatmaydi" value={dark} onChange={v => setTheme(v ? 'dark' : 'light')} />
        <Divider />
        <SwitchRow title="Demo harakat" sub="GPS o'rniga mashina marshrut bo'ylab o'zi yuradi" value={d.autopilot} onChange={d.setAutopilot} />
      </Card>

      <Card style={{ gap: 6 }}>
        <Txt v="h3">YUMS bilan bog&apos;lanish</Txt>
        <Txt v="small" muted>
          {DISPATCH_URL ? `Dispetcher: ${DISPATCH_URL} · ${d.live ? 'ulangan' : 'ulanmoqda…'}` : "Dispetcher serveri sozlanmagan — demo buyurtmalar ishlatilmoqda. EXPO_PUBLIC_DISPATCH_URL ni bering."}
        </Txt>
      </Card>

      <Card style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
        <ListItem icon="log-out-outline" title="Hisobdan chiqish" danger onPress={() => confirm('Hisobdan chiqasizmi?', 'Daromad tarixi qurilmada saqlanib qoladi.', d.logout, 'Chiqish')} />
      </Card>
    </Screen>
  );
}

function SwitchRow({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={styles.row}>
      <View style={{ flex: 1 }}>
        <Txt v="h3">{title}</Txt>
        <Txt v="small" muted>{sub}</Txt>
      </View>
      <IOSSwitch value={value} onChange={onChange} label={title} />
    </Row>
  );
}

const styles = StyleSheet.create({ row: { paddingVertical: 8 } });
