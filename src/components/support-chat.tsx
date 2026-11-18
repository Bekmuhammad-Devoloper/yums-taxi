import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/toast';
import { Chip, PersonAvatar, Row, Screen, Txt } from '@/components/ui';
import { errorText } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { KEYBOARD_BEHAVIOR, useKeyboardOpen } from '@/lib/keyboard';
import { useStore } from '@/lib/store';
import { closeTicket, myTickets, openTicket, replyTicket, ticket, type TicketDetail } from '@/lib/support-api';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

const POLL_MS = 8000;
// YUMS AI javobini kutish: shu orada tez-tez tekshiriladi, keyin «operatorga yetkazildi» ko'rsatiladi
const AI_POLL_MS = 2500;
const AI_WAIT_MS = 45_000;
const AI_TINT = '#7C3AED';
const SUBJECT_MAX = 80;
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/**
 * Operator bilan yozishma — backenddagi murojaat (ticket). Ochiq murojaat bo'lsa davom etadi,
 * bo'lmasa birinchi xabar yangisini ochadi. Operator javobi push bilan keladi, ekranda esa
 * murojaat qisqa oraliqda qayta o'qiladi.
 */
/** draft — oldindan to'ldirilgan matn (masalan, «Professional xizmatlar»dan kelganda xizmat nomi) */
/** ticketId — aynan shu murojaatni ochish (masalan, xizmat buyurtmasidan keyin) */
export function SupportChat({ topics, orderId, greeting, draft, ticketId: openId }: { topics: string[]; orderId?: string; greeting: string; draft?: string; ticketId?: string }) {
  const { colors: c, settings } = useStore();
  const aiOn = settings?.supportAi === true;
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOpen();
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
    reload(openId).catch(() => {}).finally(() => setLoading(false));
  }, [reload, openId]);

  // soat: «AI yozmoqda» qancha turishini bilish uchun (render ichida Date.now() chaqirilmaydi)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(iv);
  }, []);

  const ticketId = current?.id;
  const list = current?.messages ?? [];
  const last = list[list.length - 1];
  // YUMS AI javob yozyapti: oxirgi xabar foydalanuvchiniki, operator hali qo'shilmagan, kutish uzoq emas
  const awaitingAi = aiOn && current?.status === 'OPEN' && last?.author === 'USER'
    && !list.some(m => m.author === 'STAFF') && now - Date.parse(last.createdAt) < AI_WAIT_MS;
  useEffect(() => {
    if (!ticketId) return;
    // AI javobini kutayotganda tez-tez, keyin odatdagidek tekshiriladi
    const iv = setInterval(() => { reload(ticketId).catch(() => {}); }, awaitingAi ? AI_POLL_MS : POLL_MS);
    return () => clearInterval(iv);
  }, [ticketId, reload, awaitingAi]);

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

  // AI javobi noto'g'ri yoki nomaqbul: shikoyat shu murojaatga yoziladi va operatorga uzatiladi
  const reportAi = (body: string) => confirm(tr('YUMS AI javobi ustidan shikoyat'), tr("Javob noto'g'ri yoki nomaqbulmi? Operator ko'rib chiqadi."), () => {
    if (!current) return;
    const quote = body.length > 300 ? `${body.slice(0, 300)}…` : body;
    replyTicket(current.id, `${tr("YUMS AI javobi ustidan shikoyat — operator ko'rib chiqsin")}:
«${quote}»`)
      .then(next => { setCurrent(next); toast(tr('Shikoyat yuborildi'), 'flag'); })
      .catch(error => toast(errorText(error), 'alert-circle'));
  }, tr('Yuborish'));

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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={KEYBOARD_BEHAVIOR}>
      <Screen
        title={tr("YUMS qo'llab-quvvatlash")}
        subtitle={current ? tr('Murojaat · {subject}', { subject: current.subject }) : aiOn ? tr('YUMS AI darhol javob beradi · operator 24/7') : tr('Operator 24/7 javob beradi')}
        scroll={false}
        right={current ? <Pressable onPress={finish} hitSlop={8} accessibilityLabel={tr('Murojaatni yopish')}><Ionicons name="checkmark-done" size={22} color={c.muted} /></Pressable> : undefined}>
        {/* Telegram'dagidek: xabarlar pastdan boshlanadi va yuqoriga o'sib boradi */}
        <ScrollView
          ref={scroll}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          onLayout={() => scroll.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1, justifyContent: 'flex-end' }}
          keyboardShouldPersistTaps="handled">
          <Row gap={8} style={{ alignItems: 'flex-end' }}>
            {aiOn ? <AiAvatar /> : <PersonAvatar name="YUMS" size={30} />}
            <View style={[styles.bubble, { backgroundColor: c.surface, borderBottomLeftRadius: 6, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
              {aiOn ? <Txt v="tiny" style={[styles.who, { color: AI_TINT }]}>YUMS AI</Txt> : null}
              <Txt v="small" style={{ lineHeight: 19 }}>{aiOn ? tr("Men YUMS AI yordamchisiman — savolingizga darhol javob beraman. Kerak bo'lsa, operator shu chatga ulanadi.") : greeting}</Txt>
            </View>
          </Row>
          {loading && <ActivityIndicator color={c.muted} />}
          {messages.map(m => {
            const mine = m.author === 'USER';
            const ai = m.author === 'AI';
            return (
              <Row key={m.id} gap={8} style={{ alignItems: 'flex-end', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                {!mine ? (ai ? <AiAvatar /> : <PersonAvatar name="YUMS" size={30} />) : null}
                <View style={[styles.bubble, mine ? { backgroundColor: c.brand, borderBottomRightRadius: 6 } : { backgroundColor: c.surface, borderBottomLeftRadius: 6, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
                  {!mine ? <Txt v="tiny" style={[styles.who, { color: ai ? AI_TINT : c.ok }]}>{ai ? 'YUMS AI' : tr('Operator')}</Txt> : null}
                  <Txt v="small" color={mine ? c.brandText : c.text} style={{ lineHeight: 19 }}>{m.body}</Txt>
                  <Row gap={10} style={{ alignSelf: 'flex-end', marginTop: 2 }}>
                    {/* AI javobi ustidan shikoyat — operator ko'rib chiqadi (Google Play: AI kontentini belgilash) */}
                    {ai && current?.status !== 'CLOSED' ? (
                      <Pressable onPress={() => reportAi(m.body)} hitSlop={10} accessibilityLabel={tr('Shikoyat qilish')}>
                        <Ionicons name="flag-outline" size={13} color={c.faint} />
                      </Pressable>
                    ) : null}
                    <Txt v="tiny" color={mine ? 'rgba(14,21,37,0.55)' : c.faint}>{hhmm(m.createdAt)}</Txt>
                  </Row>
                </View>
              </Row>
            );
          })}
          {awaitingAi ? (
            <Row gap={8} style={{ alignItems: 'flex-end' }}>
              <AiAvatar />
              <View style={[styles.bubble, styles.typing, { backgroundColor: c.surface, borderColor: c.line }]}>
                <ActivityIndicator size="small" color={AI_TINT} />
                <Txt v="small" muted>{tr('YUMS AI yozmoqda…')}</Txt>
              </View>
            </Row>
          ) : current && current.status === 'OPEN' && last && (last.author === 'USER' || last.author === 'AI') ? (
            // AI operatorga uzatgan yoki AI o'chiq: operator javobi shu yerda va bildirishnomada keladi
            <Txt v="tiny" faint style={{ textAlign: 'center' }}>{last.author === 'AI' ? tr('Operator tez orada shu chatga ulanadi') : tr('Murojaatingiz operatorga yetkazildi — javob shu yerda va bildirishnomada keladi')}</Txt>
          ) : null}
        </ScrollView>
        {!current && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }} style={{ flexGrow: 0 }}>
            {topics.map(t => <Chip key={t} label={tr(t)} onPress={() => setText(tr(t))} />)}
          </ScrollView>
        )}
        <Row gap={8} style={[styles.inputRow, { paddingBottom: (keyboard ? 0 : insets.bottom) + 10, borderTopColor: c.line, backgroundColor: c.bg }]}>
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

/** YUMS AI belgisi: binafsha–ko'k gradient doirada uchqunlar */
function AiAvatar() {
  return (
    <LinearGradient colors={['#8B5CF6', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiAvatar}>
      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  who: { fontFamily: F.heavy, fontSize: 11, marginBottom: 2 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  aiAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  inputRow: { paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontFamily: F.medium, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
