import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, PersonAvatar, Row, Screen, Txt } from '@/components/ui';
import { useDriver } from '@/driver/lib/driver-store';
import { autoAnswer } from '@/driver/lib/support';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

type Msg = { id: string; from: 'me' | 'op'; text: string; at: string };
const KEY = 'yd:supportChat';
const OPERATOR = 'Malika';
const TOPICS = ["Pul kartaga tushmadi", 'Hujjat tekshiruvi', 'Tarif nega yopiq?', 'Mijoz chiqmadi', 'Ilovada xatolik'];
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const msg = (from: Msg['from'], text: string): Msg => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), from, text, at: new Date().toISOString() });

/** Yordam markazi bilan yozishma (operator javoblari — savol-javoblar bazasidan) */
export default function SupportChat() {
  const { colors: c } = useStore();
  const d = useDriver();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      const saved: Msg[] = v ? JSON.parse(v) : [];
      const name = d.profile?.name.split(' ')[0] ?? '';
      setMsgs(saved.length ? saved : [msg('op', `Assalomu alaykum${name ? `, ${name}` : ''}! Men ${OPERATOR}, YUMS haydovchilar yordam xizmati. Savolingizni yozing yoki pastdagi mavzulardan birini tanlang.`)]);
    }).catch(() => {});
    const list = timers.current;
    return () => list.forEach(clearTimeout);
    // faqat ochilganda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (n: Msg[]) => { AsyncStorage.setItem(KEY, JSON.stringify(n.slice(-100))).catch(() => {}); return n; };

  const send = (t: string) => {
    const body = t.trim();
    if (!body) return;
    setText('');
    setMsgs(m => save([...m, msg('me', body)]));
    timers.current.push(setTimeout(() => setTyping(true), 600));
    timers.current.push(setTimeout(() => {
      setTyping(false);
      const f = autoAnswer(body);
      const tripNote = d.trip ? ` Joriy buyurtmangiz (${d.trip.order.pickup.title} → ${d.trip.order.destination.title}) ham ko'rib turibman.` : '';
      const reply = f
        ? `${f.a}${tripNote}\n\nYana savol bo'lsa, yozing.`
        : `Rahmat, murojaatingiz qabul qilindi (№${Math.floor(100000 + Math.random() * 900000)}).${tripNote} Mutaxassis 5 daqiqa ichida shu chatda javob beradi.`;
      setMsgs(m => save([...m, msg('op', reply)]));
    }, 1900));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={OPERATOR} subtitle="YUMS qo'llab-quvvatlash · onlayn" scroll={false}>
        <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {msgs.map(m => (
            <Row key={m.id} gap={8} style={{ alignItems: 'flex-end', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
              {m.from === 'op' ? <PersonAvatar name={OPERATOR} gender="f" size={30} /> : null}
              <View style={[styles.bubble, m.from === 'me' ? { backgroundColor: c.brand, borderBottomRightRadius: 6 } : { backgroundColor: c.surface, borderBottomLeftRadius: 6, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
                <Txt v="small" color={m.from === 'me' ? c.brandText : c.text} style={{ lineHeight: 19 }}>{m.text}</Txt>
                <Txt v="tiny" color={m.from === 'me' ? 'rgba(14,21,37,0.55)' : c.faint} style={{ alignSelf: 'flex-end', marginTop: 2 }}>{hhmm(m.at)}</Txt>
              </View>
            </Row>
          ))}
          {typing && (
            <Row gap={8}>
              <PersonAvatar name={OPERATOR} gender="f" size={30} />
              <View style={[styles.bubble, { backgroundColor: c.surface }]}><Txt v="small" muted>{OPERATOR} yozmoqda…</Txt></View>
            </Row>
          )}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }} style={{ flexGrow: 0 }}>
          {TOPICS.map(t => <Chip key={t} label={t} onPress={() => send(t)} />)}
        </ScrollView>
        <Row gap={8} style={[styles.inputRow, { paddingBottom: insets.bottom + 10, borderTopColor: c.line, backgroundColor: c.bg }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Xabar yozing…" placeholderTextColor={c.faint} multiline
            style={[styles.input, { backgroundColor: c.surface2, color: c.text }]} onSubmitEditing={() => send(text)} accessibilityLabel="Xabar" />
          <Pressable onPress={() => send(text)} disabled={!text.trim()} accessibilityLabel="Yuborish"
            style={[styles.send, { backgroundColor: text.trim() ? c.brand : c.surface2 }]}>
            <Ionicons name="arrow-up" size={20} color={text.trim() ? c.brandText : c.faint} />
          </Pressable>
        </Row>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  inputRow: { paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontFamily: F.medium, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
