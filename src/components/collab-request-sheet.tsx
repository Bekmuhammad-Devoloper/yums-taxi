// «Hamkorlik so'rovi»: oddiy «Yozish»dan alohida — nima taklif qilinayotgani (investitsiya, hamkorlik, mutaxassis…),
// investitsiya bo'lsa miqdori va taklif matni bilan rasmiy so'rov. Loyiha yoki kompaniya egasiga «So'rovlar»ga
// boradi (u qabul qiladi yoki rad etadi); birinchi xabar — shu tafsilotlar. Yuborilgach chat ochilmaydi: shu
// oynada «So'rov yuborildi» ko'rinadi. «Yozish» esa oddiy suhbatni ochadi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionRow } from '@/components/listing-ui';
import { Button, Field, Sheet, Txt } from '@/components/ui';
import { tr } from '@/lib/i18n';
import type { Choice } from '@/lib/market-forms';
import { usePlatform, type PeerInfo } from '@/lib/platform';
import { SEEKS, type Seek } from '@/lib/platform-data';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

/** So'rov yuboruvchi nuqtai nazaridan: loyiha «Investitsiya» izlasa — «Investitsiya kiritaman» va h.k. */
const OFFER: Record<Seek, () => string> = {
  investment: () => tr('Investitsiya kiritaman'),
  partner: () => tr("Hamkor bo'laman"),
  specialist: () => tr('Mutaxassis sifatida'),
  client: () => tr('Mijoz sifatida'),
  supplier: () => tr('Yetkazib beruvchi sifatida'),
};

export function CollabRequestSheet({ visible, onClose, peer, project, seeking }: {
  visible: boolean;
  onClose: () => void;
  peer: PeerInfo;
  /** Loyiha nomi (kompaniyaga so'rovda — yo'q) */
  project?: string;
  /** Loyiha nimani izlayapti — shu turlar taklif qilinadi; bo'lmasa hammasi */
  seeking?: Seek[];
}) {
  const { colors: c } = useStore();
  const { openChat } = usePlatform();
  const options = SEEKS.filter(s => !seeking?.length || seeking.includes(s.id));
  const [kind, setKind] = useState<string>(options[0]?.id ?? 'partner');
  const [amount, setAmount] = useState('');
  const [about, setAbout] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const chosen = options.find(o => o.id === kind) ?? options[0] ?? SEEKS[1];
  const investing = chosen.id === 'investment';
  const choices: Choice[] = options.map(o => ({ value: o.id, label: OFFER[o.id](), icon: o.icon }));
  const error = about.trim().length < 20 ? tr('Kamida 20 belgi') : undefined;

  const send = async () => {
    setTried(true);
    if (error || busy) return;
    setBusy(true);
    try {
      const subject = project ? tr("«{title}» bo'yicha hamkorlik", { title: project }) : tr('B2B hamkorlik');
      const text = [
        project ? tr("Hamkorlik so'rovi: «{title}»", { title: project }) : tr("Hamkorlik so'rovi"),
        `${tr('Taklif')}: ${OFFER[chosen.id]()}`,
        investing && amount ? `${tr('Miqdor')}: $${Number(amount).toLocaleString('en-US')}` : '',
        '',
        about.trim(),
      ].filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== '')).join('\n');
      const id = await openChat(peer, { request: true, subject: subject.slice(0, 120), text: text.slice(0, 2000) });
      if (!id) return;
      haptic.success();
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  // yopilganda forma tozalanadi — keyingi so'rov noldan yoziladi
  const close = () => {
    onClose();
    if (sent) { setSent(false); setAmount(''); setAbout(''); setTried(false); }
  };

  if (sent) {
    return (
      <Sheet visible={visible} onClose={close} footer={<Button title={tr('Yaxshi')} onPress={close} />}>
        <View style={styles.done}>
          <View style={[styles.doneIcon, { backgroundColor: c.okSoft }]}>
            <Ionicons name="checkmark-circle" size={44} color={c.ok} />
          </View>
          <Txt v="h2" style={{ textAlign: 'center' }}>{tr("So'rov yuborildi")}</Txt>
          <Txt v="small" muted style={{ textAlign: 'center', lineHeight: 20 }}>
            {tr("{name} so'rovingizni ko'rib chiqadi. Qabul qilsa yoki rad etsa, bildirishnoma keladi; so'rovlaringiz «Xabarlar → So'rovlar»da turadi.", { name: peer.peerName })}
          </Txt>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={close} title={tr("Hamkorlik so'rovi")}
      footer={<Button title={tr("So'rov yuborish")} icon="send" loading={busy} onPress={() => { send().catch(() => {}); }} />}>
      <View style={[styles.note, { backgroundColor: c.surface2 }]}>
        <Ionicons name="people" size={18} color={c.violet} />
        <Txt v="small" muted style={{ flex: 1, lineHeight: 19 }}>
          {tr("{name} so'rovingizni «So'rovlar»da ko'radi va qabul qilsa, yozishma boshlanadi.", { name: peer.peerName })}
        </Txt>
      </View>
      <View style={{ gap: 8 }}>
        <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{tr('Nima taklif qilasiz?')}</Txt>
        <OptionRow choices={choices} value={chosen.id} onChange={setKind} />
      </View>
      {investing && (
        <Field label={tr('Investitsiya miqdori (USD)')} prefix="$" value={amount}
          onChangeText={v => setAmount(v.replace(/[^\d]/g, '').slice(0, 9))} keyboardType="number-pad" placeholder="10000" />
      )}
      <Field label={tr('Taklifingiz')} value={about} onChangeText={setAbout} multiline maxLength={1500} inputStyle={{ minHeight: 110 }}
        placeholder={tr("O'zingiz haqingizda, nimani taklif qilasiz va hamkorlik qanday bo'lishi…")} error={tried ? error : undefined} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  done: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  doneIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
