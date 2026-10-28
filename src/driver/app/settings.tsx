import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Divider, IOSSwitch, ListItem, Row, Screen, Segmented, Txt } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { useDriver, type NavApp } from '@/driver/lib/driver-store';
import { say, voiceSource, type VoiceLang, type VoiceSource } from '@/driver/lib/voice';
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

      <VoiceCard />

      <Card style={{ gap: 4 }}>
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

const SOURCE_TEXT: Record<VoiceLang, Record<VoiceSource, string>> = {
  uz: {
    clips: "Ayol ovozi · o'zbek tilida",
    system: "Qurilmaning o'zbek ovozi ishlatiladi",
    fallback: "O'zbek ovoz to'plami hali qo'shilmagan — hozircha ruscha gapiradi",
  },
  ru: {
    clips: 'Женский голос · на русском языке',
    system: 'Используется голос устройства',
    fallback: 'Русский голос ещё не добавлен — пока говорит по-узбекски',
  },
};

/** Ovozli yo'riqnoma: yoqish, til (o'zbek / rus) va ovozni sinab eshitish */
function VoiceCard() {
  const d = useDriver();
  // holat qaysi til uchun aniqlangani bilan saqlanadi — til almashganda eskisi ko'rinmaydi
  const [checked, setChecked] = useState<{ lang: VoiceLang; source: VoiceSource } | null>(null);
  useEffect(() => {
    let alive = true;
    const lang = d.voiceLang;
    voiceSource(lang).then(source => { if (alive) setChecked({ lang, source }); });
    return () => { alive = false; };
  }, [d.voiceLang]);
  const source = checked?.lang === d.voiceLang ? checked.source : null;
  return (
    <Card style={{ gap: 10 }}>
      <SwitchRow title="Ovozli yo'riqnoma" sub="Yangi buyurtma, burilishlar va safar holati ovozda" value={d.voice} onChange={d.setVoice} />
      {d.voice && (
        <>
          <Divider />
          <Txt v="small" muted>Ovoz tili</Txt>
          <Segmented<VoiceLang> items={[{ id: 'uz', label: "O'zbekcha" }, { id: 'ru', label: 'Русский' }]} value={d.voiceLang} onChange={d.setVoiceLang} />
          {source ? <Txt v="tiny" muted>{SOURCE_TEXT[d.voiceLang][source]}</Txt> : null}
          <Button title={d.voiceLang === 'ru' ? 'Прослушать голос' : 'Ovozni eshitib ko\'rish'} icon="volume-high" kind="ghost" small onPress={() => say('test', true)} />
        </>
      )}
    </Card>
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
