import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PEER_LABEL, PeerAvatar, ReportSheet } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Chip, EmptyState, Field, IconButton, ListItem, Row, Screen, Sheet, Txt, Verified } from '@/components/ui';
import type { Attachment, Message, ReportTarget } from '@/lib/platform-data';
import { fileSize, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';

const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const DAYS = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c } = useStore();
  const p = usePlatform();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [meet, setMeet] = useState(false);
  const [reporting, setReporting] = useState(false);
  const cv = p.conversations.find(x => x.id === id);
  const count = cv?.messages.length ?? 0;
  const { markRead } = p;

  useEffect(() => { if (id) markRead(id); }, [id, count]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cv) return <Screen title="Suhbat"><EmptyState icon="chatbubbles-outline" title="Suhbat topilmadi" /></Screen>;

  const pendingOut = cv.kind === 'request' && !cv.incoming && cv.requestStatus === 'pending';
  const pendingIn = cv.kind === 'request' && cv.incoming && cv.requestStatus === 'pending';
  const declined = cv.requestStatus === 'declined';
  const sentRequest = pendingOut && cv.messages.some(m => m.from === 'me');
  const canWrite = !cv.blocked && !declined && !pendingIn && !sentRequest;
  const reportKind: ReportTarget = cv.peerKind === 'company' ? 'company' : cv.peerKind === 'specialist' ? 'specialist' : cv.peerKind === 'investor' ? 'investor' : 'user';
  const profileHref = cv.peerKind === 'company' && p.companies.some(x => x.id === cv.peerId)
    ? { pathname: '/company/[id]' as const, params: { id: cv.peerId } }
    : cv.peerKind === 'specialist' ? { pathname: '/specialist/[id]' as const, params: { id: cv.peerId } } : null;

  const send = (file?: Attachment) => {
    const t = text.trim();
    if (!t && !file) return;
    haptic.tap();
    p.sendMessage(cv.id, file ? (t || file.name) : t, file);
    setText('');
  };

  const attach = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (r.canceled) return;
      const a = r.assets[0];
      if ((a.size ?? 0) > 25e6) { toast('Fayl 25 MB dan katta', 'alert-circle'); return; }
      send({ id: 'f' + a.lastModified, name: a.name, size: a.size, mime: a.mimeType, uri: a.uri });
    } catch {
      toast("Fayl tanlab bo'lmadi", 'alert-circle');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: c.bg, borderBottomColor: c.line }]}>
        <IconButton name="chevron-back" size={42} onPress={() => (router.canGoBack() ? router.back() : router.replace('/connect'))} />
        <Pressable style={{ flex: 1 }} disabled={!profileHref} onPress={() => profileHref && router.push(profileHref)}>
          <Row gap={10}>
            <PeerAvatar conv={cv} size={40} />
            <View style={{ flex: 1 }}>
              <Row gap={4}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{cv.peerName}</Txt>{cv.peerVerified && <Verified size={14} />}</Row>
              <Txt v="tiny" faint numberOfLines={1}>{cv.blocked ? 'Bloklangan' : `${PEER_LABEL[cv.peerKind]}${cv.subject ? ' · ' + cv.subject : ''}`}</Txt>
            </View>
          </Row>
        </Pressable>
        {canWrite && <IconButton name="calendar-outline" size={42} onPress={() => setMeet(true)} />}
        <IconButton name="ellipsis-vertical" size={42} onPress={() => setMenu(true)} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled">
          {cv.messages.length === 0 && (
            <View style={[styles.intro, { backgroundColor: c.surface }]}>
              <Ionicons name={pendingOut ? 'people' : 'chatbubbles'} size={28} color={c.brandDeep} />
              <Txt v="h3" style={{ textAlign: 'center' }}>{pendingOut ? "Hamkorlik so'rovi" : 'Suhbatni boshlang'}</Txt>
              <Txt v="small" muted style={{ textAlign: 'center' }}>
                {pendingOut ? `${cv.peerName}ga o'zingiz va taklifingiz haqida qisqacha yozing. So'rov qabul qilingach, yozishmani davom ettirasiz.` : "Xabarlar shifrlangan holda yuboriladi. Shaxsiy to'lov ma'lumotlarini hech qachon chatda yubormang."}
              </Txt>
            </View>
          )}
          {cv.messages.map(m => <Bubble key={m.id} m={m} />)}
        </ScrollView>

        {pendingIn && (
          <View style={[styles.banner, { backgroundColor: c.warnSoft }]}>
            <Txt v="small" color={c.warn} style={{ fontWeight: '700' }}>{cv.peerName} siz bilan hamkorlik qilmoqchi</Txt>
            <Row gap={8}>
              <Button title="Rad etish" kind="ghost" small style={{ flex: 1 }} onPress={() => p.respondRequest(cv.id, false)} />
              <Button title="Qabul qilish" small icon="checkmark" style={{ flex: 1.4 }} onPress={() => { p.respondRequest(cv.id, true); haptic.success(); }} />
            </Row>
          </View>
        )}

        {canWrite ? (
          <View style={[styles.composer, { paddingBottom: insets.bottom + 10, backgroundColor: c.bg, borderTopColor: c.line }]}>
            <Pressable onPress={attach} hitSlop={8} style={[styles.round, { backgroundColor: c.surface2 }]} accessibilityLabel="Hujjat biriktirish">
              <Ionicons name="attach" size={22} color={c.text} />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={pendingOut ? "So'rov xabari…" : 'Xabar…'}
              placeholderTextColor={c.faint}
              multiline
              numberOfLines={1}
              style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.line }]}
            />
            <Pressable onPress={() => send()} disabled={!text.trim()} style={[styles.round, { backgroundColor: text.trim() ? c.brand : c.surface2 }]} accessibilityLabel="Yuborish">
              <Ionicons name="arrow-up" size={22} color={text.trim() ? c.brandText : c.faint} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.locked, { paddingBottom: insets.bottom + 14, borderTopColor: c.line }]}>
            <Ionicons name={cv.blocked ? 'ban' : declined ? 'close-circle-outline' : 'hourglass-outline'} size={18} color={c.muted} />
            <Txt v="small" muted style={{ flex: 1 }}>
              {cv.blocked ? 'Siz bu suhbatni blokladingiz' : declined ? "So'rov rad etilgan" : pendingIn ? "Yozish uchun so'rovni qabul qiling" : "So'rov yuborildi — javob kutilmoqda"}
            </Txt>
            {cv.blocked && <Button title="Blokdan chiqarish" small kind="ghost" onPress={() => p.toggleBlockChat(cv.id)} />}
          </View>
        )}
      </KeyboardAvoidingView>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={cv.peerName}>
        <View style={{ gap: 2 }}>
          {profileHref && <ListItem icon="person-outline" title="Profilni ko'rish" onPress={() => { setMenu(false); router.push(profileHref); }} />}
          {canWrite && <ListItem icon="calendar-outline" title="Onlayn uchrashuv belgilash" onPress={() => { setMenu(false); setTimeout(() => setMeet(true), 350); }} />}
          {canWrite && <ListItem icon="document-attach-outline" title="Hujjat yuborish" onPress={() => { setMenu(false); attach(); }} />}
          {cv.peerKind !== 'support' && (
            <>
              <ListItem icon={cv.blocked ? 'lock-open-outline' : 'ban-outline'} title={cv.blocked ? 'Blokdan chiqarish' : 'Bloklash'} danger={!cv.blocked} onPress={() => { setMenu(false); p.toggleBlockChat(cv.id); toast(cv.blocked ? 'Blokdan chiqarildi' : 'Foydalanuvchi bloklandi', 'ban'); }} />
              <ListItem icon="flag-outline" title="Shikoyat qilish" danger onPress={() => { setMenu(false); setTimeout(() => setReporting(true), 350); }} />
            </>
          )}
        </View>
      </Sheet>
      <MeetingSheet visible={meet} onClose={() => setMeet(false)} onCreate={(at, title, dur) => { p.scheduleMeeting(cv.id, at, title, dur); toast('Uchrashuv belgilandi', 'calendar'); }} />
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind={reportKind} id={cv.peerId} title={cv.peerName} />
    </View>
  );
}

function Bubble({ m }: { m: Message }) {
  const { colors: c } = useStore();
  const { meetings } = usePlatform();
  if (m.from === 'system') {
    return <View style={[styles.system, { backgroundColor: c.surface2 }]}><Txt v="tiny" muted style={{ textAlign: 'center' }}>{m.text}</Txt></View>;
  }
  const me = m.from === 'me';
  const meeting = m.meetingId ? meetings.find(x => x.id === m.meetingId) : undefined;
  const fg = me ? c.brandText : c.text;
  return (
    <View style={[styles.bubble, me ? { alignSelf: 'flex-end', backgroundColor: c.brand, borderBottomRightRadius: 6 } : { alignSelf: 'flex-start', backgroundColor: c.surface, borderBottomLeftRadius: 6 }]}>
      {meeting ? (
        <View style={{ gap: 6 }}>
          <Row gap={8}><Ionicons name="videocam" size={18} color={fg} /><Text style={{ color: fg, fontWeight: '800', fontSize: 15 }}>Onlayn uchrashuv</Text></Row>
          <Text style={{ color: fg, fontWeight: '600' }}>{meeting.title}</Text>
          <Text style={{ color: fg, opacity: 0.75, fontSize: 13 }}>
            {DAYS[new Date(meeting.at).getDay()]}, {new Date(meeting.at).getDate()}-{['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'][new Date(meeting.at).getMonth()]} · {hhmm(meeting.at)} · {meeting.durationMin} daq
          </Text>
          {meeting.status === 'cancelled'
            ? <Text style={{ color: fg, fontWeight: '800', fontSize: 13 }}>Bekor qilingan</Text>
            : <Pressable onPress={() => Linking.openURL(meeting.link).catch(() => toast('Havola ochilmadi', 'alert-circle'))} style={[styles.join, { backgroundColor: me ? 'rgba(14,21,37,0.12)' : c.surface2 }]}><Text style={{ color: fg, fontWeight: '800' }}>Qo'shilish</Text></Pressable>}
        </View>
      ) : m.file ? (
        <Pressable onPress={() => (m.file?.uri ? Linking.openURL(m.file.uri).catch(() => toast("Faylni ochib bo'lmadi", 'alert-circle')) : toast('Fayl yuklab olindi', 'download'))} style={{ gap: 6 }}>
          <Row gap={10}>
            <View style={[styles.fileIco, { backgroundColor: me ? 'rgba(14,21,37,0.12)' : c.accentSoft }]}><Ionicons name="document-text" size={20} color={me ? fg : c.accent} /></View>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ color: fg, fontWeight: '800' }} numberOfLines={1}>{m.file.name}</Text>
              <Text style={{ color: fg, opacity: 0.7, fontSize: 12 }}>{fileSize(m.file.size) || 'hujjat'}</Text>
            </View>
          </Row>
          {m.text !== m.file.name ? <Text style={{ color: fg, fontSize: 15 }}>{m.text}</Text> : null}
        </Pressable>
      ) : (
        <Text style={{ color: fg, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
      )}
      <Text style={{ color: fg, opacity: 0.55, fontSize: 10.5, alignSelf: 'flex-end', marginTop: 2 }}>{hhmm(m.at)}</Text>
    </View>
  );
}

function MeetingSheet({ visible, onClose, onCreate }: { visible: boolean; onClose: () => void; onCreate: (at: Date, title: string, dur: number) => void }) {
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('15:00');
  const [dur, setDur] = useState(30);
  const [title, setTitle] = useState('Tanishuv qo\'ng\'irog\'i');
  const [base] = useState(() => Date.now());
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => new Date(base + i * 86400000));
  const create = () => {
    const at = new Date(days[day]);
    const [h, mm] = time.split(':').map(Number);
    at.setHours(h, mm, 0, 0);
    if (at.getTime() < Date.now()) { toast("O'tgan vaqtni tanlab bo'lmaydi", 'alert-circle'); return; }
    onCreate(at, title.trim() || 'Onlayn uchrashuv', dur);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Onlayn uchrashuv" footer={<Button title="Taklif yuborish" icon="videocam" onPress={create} />}>
      <Field label="Mavzu" value={title} onChangeText={setTitle} />
      <Txt v="small" muted style={{ fontWeight: '700' }}>Kun</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d, i) => <Chip key={i} label={i === 0 ? 'Bugun' : i === 1 ? 'Ertaga' : `${DAYS[d.getDay()]}, ${d.getDate()}`} active={day === i} onPress={() => setDay(i)} />)}
      </ScrollView>
      <Txt v="small" muted style={{ fontWeight: '700' }}>Vaqt</Txt>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'].map(t => <Chip key={t} label={t} active={time === t} onPress={() => setTime(t)} />)}
      </Row>
      <Txt v="small" muted style={{ fontWeight: '700' }}>Davomiyligi</Txt>
      <Row gap={8}>{[15, 30, 60].map(m => <Chip key={m} label={`${m} daq`} active={dur === m} onPress={() => setDur(m)} />)}</Row>
      <Txt v="tiny" faint>Video havola avtomatik yaratiladi va suhbatga yuboriladi.</Txt>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  intro: { alignItems: 'center', gap: 6, padding: 20, borderRadius: 20, marginVertical: 20 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  system: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, maxWidth: '90%' },
  fileIco: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  join: { alignItems: 'center', paddingVertical: 8, borderRadius: 12, marginTop: 2 },
  banner: { margin: 12, marginBottom: 0, padding: 12, borderRadius: 16, gap: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
});
