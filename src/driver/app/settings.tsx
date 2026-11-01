import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LangList } from '@/components/lang-picker';
import { Button, Card, Divider, IOSSwitch, ListItem, Row, Screen, Segmented, Txt } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { useDriver, type NavApp } from '@/driver/lib/driver-store';
import { say, voiceSource, type VoiceLang, type VoiceSource } from '@/driver/lib/voice';
import { DISPATCH_URL } from '@/lib/dispatch';
import { useStore } from '@/lib/store';
import { LANGS, tr } from '@/lib/i18n';

export default function Settings() {
  const { dark, setTheme } = useStore();
  const d = useDriver();
  return (
    <Screen title={tr('Sozlamalar')}>
      <Card style={{ gap: 6 }}>
        <Txt v="h3">{tr('Ilova tili')}</Txt>
        <LangList />
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt v="h3">{tr('Tashqi navigator')}</Txt>
        <Txt v="small" muted>{tr('Ichki navigator doim ishlaydi. Banner ustidagi tugma tanlangan ilovada marshrutni ochadi.')}</Txt>
        <Segmented<NavApp> items={[{ id: 'yandex', label: 'Yandex Navigator' }, { id: 'google', label: 'Google Maps' }]} value={d.navApp} onChange={d.setNavApp} />
      </Card>

      <VoiceCard />

      <Card style={{ gap: 4 }}>
        <SwitchRow title={tr('Tungi rejim')} sub={tr("Kechasi ko'zni charchatmaydi")} value={dark} onChange={v => setTheme(v ? 'dark' : 'light')} />
        <Divider />
        <SwitchRow title={tr('Demo harakat')} sub={tr("GPS o'rniga mashina marshrut bo'ylab o'zi yuradi")} value={d.autopilot} onChange={d.setAutopilot} />
      </Card>

      <Card style={{ gap: 6 }}>
        <Txt v="h3">{tr("YUMS bilan bog'lanish")}</Txt>
        <Txt v="small" muted>
          {DISPATCH_URL ? (d.live ? tr('Dispetcher: {url} · ulangan', { url: DISPATCH_URL }) : tr('Dispetcher: {url} · ulanmoqda…', { url: DISPATCH_URL })) : tr('Dispetcher serveri sozlanmagan — demo buyurtmalar ishlatilmoqda. EXPO_PUBLIC_DISPATCH_URL ni bering.')}
        </Txt>
      </Card>

      <Card style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
        <ListItem icon="log-out-outline" title={tr('Hisobdan chiqish')} danger onPress={() => confirm(tr('Hisobdan chiqasizmi?'), tr('Daromad tarixi qurilmada saqlanib qoladi.'), d.logout, tr('Chiqish'))} />
      </Card>
    </Screen>
  );
}

/** Ovoz qayerdan: yozib olingan kliplar, qurilma ovozi yoki zaxira til */
function sourceText(source: VoiceSource) {
  if (source === 'clips') return tr('Yozib olingan ayol ovozi');
  if (source === 'system') return tr('Qurilmaning ovozi ishlatiladi');
  return tr("Qurilmada bu til uchun ovoz yo'q — zaxira tilda gapiradi");
}

/** Ovozli yo'riqnoma: yoqish, til (ilova tili bilan birga almashadi) va ovozni sinab eshitish */
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
      <SwitchRow title={tr("Ovozli yo'riqnoma")} sub={tr('Yangi buyurtma, burilishlar va safar holati ovozda')} value={d.voice} onChange={d.setVoice} />
      {d.voice && (
        <>
          <Divider />
          <Txt v="small" muted>{tr('Ovoz tili')}</Txt>
          <Segmented<VoiceLang> items={LANGS.map(l => ({ id: l.id, label: l.id.toUpperCase() }))} value={d.voiceLang} onChange={d.setVoiceLang} />
          <Txt v="tiny" muted>{LANGS.find(l => l.id === d.voiceLang)?.label}{source ? ` · ${sourceText(source)}` : ''}</Txt>
          <Button title={tr("Ovozni eshitib ko'rish")} icon="volume-high" kind="ghost" small onPress={() => say('test', true)} />
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
