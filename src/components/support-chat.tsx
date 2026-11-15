import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/toast';
import { Chip, PersonAvatar, Row, Screen, Txt } from '@/components/ui';
import { errorText } from '@/lib/api';
import { useStore } from '@/lib/store';
import { closeTicket, myTickets, openTicket, replyTicket, ticket, type TicketDetail } from '@/lib/support-api';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

const POLL_MS = 8000;
const SUBJECT_MAX = 80;
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/**
 * Operator bilan yozishma — backenddagi murojaat (ticket). Ochiq murojaat bo'lsa davom etadi,
 * bo'lmasa birinchi xabar yangisini ochadi. Operator javobi push bilan keladi, ekranda esa
 * murojaat qisqa oraliqda qayta o'qiladi.
 */
/** draft — oldindan to'ldirilgan matn (masalan, «Professional xizmatlar»dan kelganda xizmat nomi) */
export function SupportChat({ topics, orderId, greeting, draft }: { topics: string[]; orderId?: string; greeting: string; draft?: string }) {
  const { colors: c } = useStore();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState(draft ?? '');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const reload = useCallback(async (id?: string) => {
    if (id) { setCurrent(await ticket(id)); return; }
    const open = (await myTickets()).find(t => t.status !== 'CLOSED');
    setCurrent(open ? await ticket(open.id) : null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- holat server javobi kelgach yangilanadi
    reload().catch(() => {}).finally(() => setLoading(false));
  }, [reload]);

  const ticketId = current?.id;
  useEffect(() => {
    if (!ticketId) return;
    const iv = setInterval(() => { reload(ticketId).catch(() => {}); }, POLL_MS);
    return () => clearInterval(iv);
  }, [ticketId, reload]);

  const send = async (body: string) => {
    const t = body.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const next = current && current.status !== 'CLOSED'
        ? await replyTicket(current.id, t)
        : await openTicket(t.slice(0, SUBJECT_MAX), t, orderId);
      setCurrent(next);
      setText('');
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setSending(false);
    }
  };

  const finish = async () => {
    if (!current) return;
    try {
      await closeTicket(current.id);
      setCurrent(null);
      toast(tr('Murojaat yopildi'), 'checkmark-circle');
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    }
  };

  const messages = current?.messages ?? [];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        title={tr("YUMS qo'llab-quvvatlash")}
        subtitle={current ? tr('Murojaat · {subject}', { subject: current.subject }) : tr('Operator 24/7 javob beradi')}
        scroll={false}
        right={current ? <Pressable onPress={finish} hitSlop={8} accessibilityLabel={tr('Murojaatni yopish')}><Ionicons name="checkmark-done" size={22} color={c.muted} /></Pressable> : undefined}>
        <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: 16, gap: 10 }}>
          <Row gap={8} style={{ alignItems: 'flex-end' }}>
            <PersonAvatar name="YUMS" size={30} />
            <View style={[styles.bubble, { backgroundColor: c.surface, borderBottomLeftRadius: 6, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
              <Txt v="small" style={{ lineHeight: 19 }}>{greeting}</Txt>
            </View>
          </Row>
          {loading && <ActivityIndicator color={c.muted} />}
          {messages.map(m => {
            const mine = m.author === 'USER';
            return (
              <Row key={m.id} gap={8} style={{ alignItems: 'flex-end', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                {!mine ? <PersonAvatar name="YUMS" size={30} /> : null}
                <View style={[styles.bubble, mine ? { backgroundColor: c.brand, borderBottomRightRadius: 6 } : { backgroundColor: c.surface, borderBottomLeftRadius: 6, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
                  <Txt v="small" color={mine ? c.brandText : c.text} style={{ lineHeight: 19 }}>{m.body}</Txt>
                  <Txt v="tiny" color={mine ? 'rgba(14,21,37,0.55)' : c.faint} style={{ alignSelf: 'flex-end', marginTop: 2 }}>{hhmm(m.createdAt)}</Txt>
                </View>
              </Row>
            );
          })}
          {current && current.status === 'OPEN' && messages.length > 0 && messages[messages.length - 1].author === 'USER' && (
            <Txt v="tiny" faint style={{ textAlign: 'center' }}>{tr('Murojaatingiz operatorga yetkazildi — javob shu yerda va bildirishnomada keladi')}</Txt>
          )}
        </ScrollView>
        {!current && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }} style={{ flexGrow: 0 }}>
            {topics.map(t => <Chip key={t} label={tr(t)} onPress={() => setText(tr(t))} />)}
          </ScrollView>
        )}
        <Row gap={8} style={[styles.inputRow, { paddingBottom: insets.bottom + 10, borderTopColor: c.line, backgroundColor: c.bg }]}>
          <TextInput value={text} onChangeText={setText} placeholder={tr('Xabar yozing…')} placeholderTextColor={c.faint} multiline
            style={[styles.input, { backgroundColor: c.surface2, color: c.text }]} accessibilityLabel={tr('Xabar')} />
          <Pressable onPress={() => send(text)} disabled={!text.trim() || sending} accessibilityLabel={tr('Yuborish')}
            style={[styles.send, { backgroundColor: text.trim() ? c.brand : c.surface2 }]}>
            {sending ? <ActivityIndicator color={c.brandText} /> : <Ionicons name="arrow-up" size={20} color={text.trim() ? c.brandText : c.faint} />}
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
