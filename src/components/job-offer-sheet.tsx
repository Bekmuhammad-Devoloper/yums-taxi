// «Ishga taklif qilish»: oddiy yozishmadan alohida — vazifa, ish formati, byudjet, muddat va tavsif bilan
// rasmiy taklif. Mutaxassisga so'rov bo'lib boradi («So'rovlar»da turadi, u qabul qiladi yoki rad etadi);
// birinchi xabar — shu tafsilotlar. «Yozish» esa oddiy suhbatni ochadi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionRow } from '@/components/listing-ui';
import { Button, Field, Sheet, Txt } from '@/components/ui';
import { tr, tx } from '@/lib/i18n';
import type { Choice } from '@/lib/market-forms';
import { usePlatform, type PeerInfo } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const FORMATS = [tx("Loyiha bo'yicha"), tx('Soatbay'), tx('Doimiy ish')];

export function JobOfferSheet({ visible, onClose, peer, rate }: { visible: boolean; onClose: () => void; peer: PeerInfo; rate?: number }) {
  const { colors: c } = useStore();
  const { openChat } = usePlatform();
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<string>(FORMATS[0]);
  const [budget, setBudget] = useState('');
  const [term, setTerm] = useState('');
  const [about, setAbout] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const errors = {
    title: title.trim().length < 3 ? tr('Vazifani qisqa yozing') : undefined,
    about: about.trim().length < 20 ? tr('Kamida 20 belgi') : undefined,
  };
  const choices: Choice[] = FORMATS.map(f => ({ value: f, label: tr(f) }));

  const send = async () => {
    setTried(true);
    if (errors.title || errors.about || busy) return;
    setBusy(true);
    try {
      const text = [
        tr('Ishga taklif: {title}', { title: title.trim() }),
        `${tr('Format')}: ${tr(format)}`,
        budget.trim() ? `${tr('Byudjet')}: $${budget.trim()}${format === FORMATS[1] ? ` / ${tr('soat')}` : ''}` : '',
        term.trim() ? `${tr('Muddat')}: ${term.trim()}` : '',
        '',
        about.trim(),
      ].filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== '')).join('\n');
      const id = await openChat(peer, { request: true, subject: tr('Ishga taklif: {title}', { title: title.trim() }).slice(0, 120), text: text.slice(0, 2000) });
      if (!id) return;
      haptic.success();
      onClose();
      router.push({ pathname: '/chat/[id]', params: { id } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={tr('Ishga taklif')}
      footer={<Button title={tr('Taklif yuborish')} icon="send" loading={busy} onPress={() => { send().catch(() => {}); }} />}>
      <View style={[styles.note, { backgroundColor: c.surface2 }]}>
        <Ionicons name="briefcase" size={18} color={c.accent} />
        <Txt v="small" muted style={{ flex: 1, lineHeight: 19 }}>
          {tr("{name} taklifni «So'rovlar»da ko'radi va qabul qilsa, yozishma boshlanadi.", { name: peer.peerName })}
        </Txt>
      </View>
      <Field label={tr('Vazifa yoki lavozim')} value={title} onChangeText={setTitle} maxLength={80} placeholder={tr('Masalan: AWS infratuzilmasini sozlash')} error={tried ? errors.title : undefined} />
      <View style={{ gap: 8 }}>
        <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{tr('Ish formati')}</Txt>
        <OptionRow choices={choices} value={format} onChange={setFormat} />
      </View>
      <View style={styles.row}>
        <Field style={{ flex: 1 }} label={format === FORMATS[1] ? tr('Stavka (USD/soat)') : tr('Byudjet (USD)')} prefix="$" value={budget}
          onChangeText={v => setBudget(v.replace(/[^\d]/g, '').slice(0, 7))} keyboardType="number-pad"
          placeholder={format === FORMATS[1] && rate ? String(rate) : '1000'} />
        <Field style={{ flex: 1 }} label={tr('Muddat')} value={term} onChangeText={setTerm} maxLength={40} placeholder={tr('Masalan: 2 hafta')} />
      </View>
      <Field label={tr('Tavsif')} value={about} onChangeText={setAbout} multiline maxLength={1500} inputStyle={{ minHeight: 110 }}
        placeholder={tr("Nima qilish kerak, natija qanday bo'lishi, talablar…")} error={tried ? errors.about : undefined} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
