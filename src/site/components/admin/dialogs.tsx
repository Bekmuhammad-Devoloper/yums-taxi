// Operator oynalari: haydovchilarga xabar yuborish va haydovchini bloklash.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { useRun } from '@/site/lib/admin-store';
import type { NoticeTarget } from '@/site/lib/admin-types';

import { useLayout } from '../kit';
import { Btn } from './ui';

export function Dialog({ visible, title, onClose, children, footer }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.bg, { backgroundColor: c.overlay, justifyContent: wide ? 'center' : 'flex-end' }]} onPress={onClose}>
        <Pressable style={[styles.box, { backgroundColor: c.surface, borderColor: c.line }]} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: c.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Yopish"><Ionicons name="close" size={22} color={c.muted} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 14 }}>{children}</ScrollView>
          {footer ? <View style={styles.foot}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const { colors: c } = useStore();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.faint} multiline={multiline} accessibilityLabel={label}
        style={[styles.input, { backgroundColor: c.surface2, color: c.text }, multiline && { height: 96, paddingTop: 12, textAlignVertical: 'top' }]} />
    </View>
  );
}

export function Choice<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.chips}>
      {items.map(it => (
        <Pressable key={it.id} onPress={() => onChange(it.id)} style={[styles.chip, { backgroundColor: it.id === value ? c.ink : c.surface2 }]} accessibilityRole="radio" accessibilityState={{ checked: it.id === value }} accessibilityLabel={it.label}>
          <Text style={[styles.chipText, { color: it.id === value ? c.bg : c.text }]}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const TEMPLATES = [
  { label: "Tig'iz soat", title: "Tig'iz soat yaqinlashmoqda", text: "Prognoz bo'yicha keyingi soatda buyurtmalar ko'payadi. Liniyaga chiqing — talab yuqori hududlar xaritada ko'rinadi." },
  { label: 'Talab yuqori', title: 'Talab yuqori', text: "Hozir buyurtmalar ko'p, haydovchilar yetishmayapti. Imkoningiz bo'lsa, liniyaga chiqing." },
  { label: 'Hujjatlar', title: 'Hujjatlarni tekshiring', text: "Hujjatlaringiz muddatini tekshiring: muddati o'tgan hujjat bilan liniyaga chiqib bo'lmaydi." },
  { label: 'Texnik ishlar', title: 'Texnik ishlar', text: "Bugun 03:00–03:30 da ilova yangilanadi, bu vaqtda buyurtmalar kelmasligi mumkin." },
];

/** Haydovchilarga xabar: hammaga / liniyadagilarga / bo'shlarga yoki bitta haydovchiga */
export function NoticeDialog({ visible, onClose, driver }: { visible: boolean; onClose: () => void; driver?: { id: string; name: string } }) {
  const { colors: c } = useStore();
  const runCmds = useRun();
  const [target, setTarget] = useState<'all' | 'online' | 'free'>('online');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const t: NoticeTarget = driver ? driver.id : target;
    const ok = await runCmds({ cmd: 'notice', target: t, title: title.trim() || 'YUMS operatori', text: text.trim() }, 'Xabar yuborildi');
    setBusy(false);
    if (ok) { setTitle(''); setText(''); onClose(); }
  };
  return (
    <Dialog visible={visible} onClose={onClose} title={driver ? `Xabar: ${driver.name}` : 'Haydovchilarga xabar'}
      footer={<><Btn title="Bekor qilish" onPress={onClose} /><Btn title="Yuborish" icon="paper-plane" kind="dark" loading={busy} disabled={!text.trim()} onPress={send} /></>}>
      {!driver ? (
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: c.muted }]}>Kimga</Text>
          <Choice items={[{ id: 'online', label: 'Liniyadagilar' }, { id: 'free', label: "Bo'shlar" }, { id: 'all', label: 'Ilovasi ochiq hammaga' }]} value={target} onChange={setTarget} />
        </View>
      ) : null}
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: c.muted }]}>Tayyor matn</Text>
        <View style={styles.chips}>
          {TEMPLATES.map(tp => (
            <Pressable key={tp.label} onPress={() => { setTitle(tp.title); setText(tp.text); }} style={[styles.chip, { backgroundColor: c.surface2 }]} accessibilityLabel={`Shablon: ${tp.label}`}>
              <Text style={[styles.chipText, { color: c.text }]}>{tp.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Field label="Sarlavha" value={title} onChange={setTitle} placeholder="YUMS operatori" />
      <Field label="Matn" value={text} onChange={setText} placeholder="Xabar matni haydovchi ilovasida bosh ekranda ko'rinadi" multiline />
    </Dialog>
  );
}

const BLOCK_REASONS = ["Ko'p buyurtmani bekor qilish", "Yo'lovchilar shikoyati", 'Hujjatlar mos emas', "«Mijoz chiqmadi»dan noto'g'ri foydalanish", 'Xavfli haydash'];

export function BlockDialog({ visible, onClose, driver }: { visible: boolean; onClose: () => void; driver: { id: string; name: string } }) {
  const { colors: c } = useStore();
  const runCmds = useRun();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const ok = await runCmds({ cmd: 'block', driverId: driver.id, reason: reason.trim() }, `${driver.name} bloklandi`);
    setBusy(false);
    if (ok) { setReason(''); onClose(); }
  };
  return (
    <Dialog visible={visible} onClose={onClose} title={`Bloklash: ${driver.name}`}
      footer={<><Btn title="Bekor qilish" onPress={onClose} /><Btn title="Bloklash" icon="lock-closed" kind="danger" loading={busy} disabled={!reason.trim()} onPress={send} /></>}>
      <Text style={[styles.note, { color: c.muted }]}>Haydovchi darhol liniyadan chiqariladi va yangi buyurtma ololmaydi. Joriy safari bo&apos;lsa — yakunlashiga ruxsat beriladi. Sabab haydovchi ilovasida ko&apos;rinadi.</Text>
      <View style={styles.chips}>
        {BLOCK_REASONS.map(r => (
          <Pressable key={r} onPress={() => setReason(r)} style={[styles.chip, { backgroundColor: reason === r ? c.ink : c.surface2 }]} accessibilityLabel={r}>
            <Text style={[styles.chipText, { color: reason === r ? c.bg : c.text }]}>{r}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Sabab" value={reason} onChange={setReason} placeholder="Masalan: bir kunda 7 ta buyurtmani bekor qilgan" multiline />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', padding: 14 },
  box: { width: '100%', maxWidth: 520, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontFamily: F.display, fontSize: 18, flex: 1 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  label: { fontFamily: F.semi, fontSize: 12.5 },
  input: { height: 46, borderRadius: 12, paddingHorizontal: 12, fontFamily: F.semi, fontSize: 14.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  chipText: { fontFamily: F.bold, fontSize: 13 },
  note: { fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
});
