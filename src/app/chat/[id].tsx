import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PEER_LABEL, PeerAvatar, ReportSheet } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Chip, EmptyState, Field, ListItem, Row, Screen, Sheet, Txt, Verified } from '@/components/ui';
import type { Attachment, Message, ReportTarget } from '@/lib/platform-data';
import { fileSize, usePlatform } from '@/lib/platform';
import { FILE_LIMIT } from '@/lib/platform-api';
import { openFile } from '@/lib/open-file';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { fmtDay, weekdayShort } from '@/lib/format';
import { tr } from '@/lib/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const dayKey = (iso: string) => new Date(iso).toDateString();
/** Bir kishining ketma-ket xabarlari (5 daqiqa ichida) bitta guruh — dum faqat oxirgisida */
const GROUP_MS = 5 * 60_000;
// bo‘linmaydigan bo‘shliq: qator oxirida ham kenglikka hisoblanadi (oddiy bo‘shliq web’da «osilib» qoladi)
const NB = ' ';

type ListRow =
  | { kind: 'day'; key: string; at: string }
  | { kind: 'msg'; key: string; m: Message; tail: boolean; joined: boolean };

/** Kun ajratgichlari va guruhlar: ketma-ket xabarlar bir-biriga yaqin, dum faqat oxirgisida */
function buildRows(list: Message[]): ListRow[] {
  const out: ListRow[] = [];
  let lastDay = '';
  const near = (a?: Message, b?: Message) =>
    !!a && !!b && a.from === b.from && a.from !== 'system' && dayKey(a.at) === dayKey(b.at) && Math.abs(Date.parse(b.at) - Date.parse(a.at)) < GROUP_MS;
  list.forEach((m, i) => {
    const day = dayKey(m.at);
    if (day !== lastDay) {
      out.push({ kind: 'day', key: `d${m.id}`, at: m.at });
      lastDay = day;
    }
    out.push({ kind: 'msg', key: m.id, m, tail: !near(m, list[i + 1]), joined: near(list[i - 1], m) });
  });
  return out;
}

/** «Bugun», «Kecha», hafta ichida — kun nomi, undan oldin — sana */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return tr('Bugun');
  if (d.toDateString() === y.toDateString()) return tr('Kecha');
  const days = (today.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) return `${weekdayShort(d)}, ${fmtDay(d)}`;
  return d.getFullYear() === today.getFullYear() ? fmtDay(d) : `${fmtDay(d)} ${d.getFullYear()}`;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c, dark } = useStore();
  const p = usePlatform();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // chat ochilganda darhol pastda turadi (animatsiyasiz), keyingi xabarlarda silliq tushadi
  const opened = useRef(false);
  const [text, setText] = useState('');
  // yozish maydoni matnga qarab o'sadi (6 qatorgacha), keyin ichida aylanadi
  const [inputH, setInputH] = useState(44);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  // web: textarea balandligi matnga qarab qayta o'lchanadi. scrollHeight joriy balandlikdan kichraymaydi,
  // shuning uchun avval 0 ga tushirib o'lchaymiz — aks holda qator o'chirilganda maydon kichraymay qoladi
  const fitWeb = () => {
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!el || typeof el.scrollHeight !== 'number') return;
    const prev = el.style.height;
    el.style.height = '0px';
    const h = el.scrollHeight;
    el.style.height = prev;
    setInputH(Math.min(150, Math.max(44, Math.ceil(h))));
  };
  const [menu, setMenu] = useState(false);
  const [meet, setMeet] = useState(false);
  const [reporting, setReporting] = useState(false);
  const cv = p.conversations.find(x => x.id === id);
  const messages = cv?.messages;
  const count = messages?.length ?? 0;
  const { markRead, loadMessages } = p;

  useEffect(() => { if (id) loadMessages(id).catch(() => {}); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (id) markRead(id); }, [id, count]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = buildRows(messages ?? []);

  if (!cv) return <Screen title={tr('Suhbat')}><EmptyState icon="chatbubbles-outline" title={tr('Suhbat topilmadi')} /></Screen>;

  const pendingOut = cv.kind === 'request' && !cv.incoming && cv.requestStatus === 'pending';
  const pendingIn = cv.kind === 'request' && cv.incoming && cv.requestStatus === 'pending';
  const declined = cv.requestStatus === 'declined';
  const sentRequest = pendingOut && cv.messages.some(m => m.from === 'me');
  const canWrite = !cv.blocked && !declined && !pendingIn && !sentRequest;
  const reportKind: ReportTarget = cv.peerKind === 'company' ? 'company' : cv.peerKind === 'specialist' ? 'specialist' : cv.peerKind === 'investor' ? 'investor' : 'user';
  const profileHref = cv.peerKind === 'company' && p.companies.some(x => x.id === cv.peerId)
    ? { pathname: '/company/[id]' as const, params: { id: cv.peerId } }
    : cv.peerKind === 'specialist' ? { pathname: '/specialist/[id]' as const, params: { id: cv.peerId } } : null;
  const hasText = !!text.trim();
  // fon ustidagi shaffof plashkalar (kun, tizim xabari, kirish kartasi)
  const glass = dark ? 'rgba(20,26,36,0.72)' : 'rgba(255,255,255,0.78)';

  const send = (file?: Attachment) => {
    const t = text.trim();
    if (!t && !file) return;
    haptic.tap();
    p.sendMessage(cv.id, file ? (t || file.name) : t, file);
    setText('');
    setInputH(44);
  };

  const attach = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (r.canceled) return;
      const a = r.assets[0];
      if ((a.size ?? 0) > FILE_LIMIT) { toast(tr('Fayl juda katta — 1 MB gacha yuboring'), 'alert-circle'); return; }
      send({ id: 'f' + a.lastModified, name: a.name, size: a.size, mime: a.mimeType, uri: a.uri });
    } catch {
      toast(tr("Fayl tanlab bo'lmadi"), 'alert-circle');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* sarlavha: tekis, avatar, ism va holat */}
      <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: c.surface, borderBottomColor: c.line }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/connect'))} hitSlop={8} style={styles.headerBtn} accessibilityLabel={tr('Orqaga')}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Pressable style={{ flex: 1 }} disabled={!profileHref} onPress={() => profileHref && router.push(profileHref)}>
          <Row gap={10}>
            <PeerAvatar conv={cv} size={40} />
            <View style={{ flex: 1 }}>
              <Row gap={4}><Text style={[styles.peerName, { color: c.text }]} numberOfLines={1}>{cv.peerName}</Text>{cv.peerVerified && <Verified size={14} />}</Row>
              <Text style={[styles.peerSub, { color: cv.blocked ? c.danger : c.muted }]} numberOfLines={1}>
                {cv.blocked ? tr('Bloklangan') : `${PEER_LABEL[cv.peerKind]}${cv.subject ? ' · ' + cv.subject : ''}`}
              </Text>
            </View>
          </Row>
        </Pressable>
        {canWrite && (
          <Pressable onPress={() => setMeet(true)} hitSlop={6} style={styles.headerBtn} accessibilityLabel={tr('Onlayn uchrashuv belgilash')}>
            <Ionicons name="videocam-outline" size={23} color={c.text} />
          </Pressable>
        )}
        <Pressable onPress={() => setMenu(true)} hitSlop={6} style={styles.headerBtn} accessibilityLabel={tr('Menyu')}>
          <Ionicons name="ellipsis-vertical" size={21} color={c.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          <Wallpaper />
          <ScrollView
            ref={scroll}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => {
              scroll.current?.scrollToEnd({ animated: opened.current });
              if (count) opened.current = true;
            }}
            keyboardShouldPersistTaps="handled">
            {cv.messages.length === 0 && (
              <View style={styles.introWrap}>
                <View style={[styles.intro, { backgroundColor: glass }]}>
                  <View style={[styles.introIcon, { backgroundColor: c.brandSoft }]}>
                    <Ionicons name={pendingOut ? 'people' : 'chatbubbles'} size={28} color={c.brandDeep} />
                  </View>
                  <Txt v="h3" style={{ textAlign: 'center' }}>{pendingOut ? tr("Hamkorlik so'rovi") : tr('Suhbatni boshlang')}</Txt>
                  <Txt v="small" muted style={{ textAlign: 'center' }}>
                    {pendingOut ? tr("{peerName}ga o'zingiz va taklifingiz haqida qisqacha yozing. So'rov qabul qilingach, yozishmani davom ettirasiz.", { peerName: cv.peerName }) : tr("Xabarlar shifrlangan holda yuboriladi. Shaxsiy to'lov ma'lumotlarini hech qachon chatda yubormang.")}
                  </Txt>
                </View>
              </View>
            )}
            {rows.map(r =>
              r.kind === 'day' ? (
                <View key={r.key} style={[styles.pill, { backgroundColor: glass }]}>
                  <Text style={[styles.pillText, { color: dark ? '#E7ECF3' : c.text }]}>{dayLabel(r.at)}</Text>
                </View>
              ) : (
                <Bubble key={r.key} m={r.m} tail={r.tail} joined={r.joined} glass={glass} />
              ),
            )}
          </ScrollView>
        </View>

        {pendingIn && (
          <View style={[styles.banner, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Row gap={8}>
              <Ionicons name="people" size={18} color={c.warn} />
              <Txt v="small" style={{ flex: 1, fontFamily: F.bold }}>{tr('{peerName} siz bilan hamkorlik qilmoqchi', { peerName: cv.peerName })}</Txt>
            </Row>
            <Row gap={8}>
              <Button title={tr('Rad etish')} kind="ghost" small style={{ flex: 1 }} onPress={() => p.respondRequest(cv.id, false)} />
              <Button title={tr('Qabul qilish')} small icon="checkmark" style={{ flex: 1.4 }} onPress={() => { p.respondRequest(cv.id, true); haptic.success(); }} />
            </Row>
          </View>
        )}

        {canWrite ? (
          // yozish paneli: qisqich, matn maydoni, yuborish (bo'sh bo'lsa — uchrashuv)
          <View style={[styles.composer, { paddingBottom: insets.bottom + 6, backgroundColor: c.surface, borderTopColor: c.line }]}>
            <Pressable onPress={attach} hitSlop={6} style={styles.composerBtn} accessibilityLabel={tr('Hujjat biriktirish')}>
              <Ionicons name="attach" size={27} color={c.muted} style={{ transform: [{ rotate: '45deg' }] }} />
            </Pressable>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={t => {
                setText(t);
                if (Platform.OS === 'web') fitWeb();
              }}
              placeholder={pendingOut ? tr("So'rov xabari…") : tr('Xabar')}
              placeholderTextColor={c.faint}
              multiline
              numberOfLines={1}
              onContentSizeChange={Platform.OS === 'web' ? undefined : e => setInputH(Math.min(150, Math.max(44, Math.ceil(e.nativeEvent.contentSize.height) + 22)))}
              // web (kompyuter klaviaturasi): Enter — yuborish, Shift+Enter — yangi qator, Telegram Desktop'dagidek.
              // Telefonda Enter yangi qator qo'shadi, yuborish — tugma bilan (Telegram mobil kabi)
              onKeyPress={Platform.OS === 'web' ? e => {
                const k = e.nativeEvent as unknown as KeyboardEvent;
                if (k.key === 'Enter' && !k.shiftKey && !k.isComposing && k.keyCode !== 229) {
                  e.preventDefault();
                  send();
                }
              } : undefined}
              style={[styles.input, { color: c.text, height: inputH }]}
            />
            {hasText ? (
              <Pressable onPress={() => send()} style={({ pressed }) => [styles.sendBtn, { backgroundColor: c.brand, transform: [{ scale: pressed ? 0.92 : 1 }] }]} accessibilityLabel={tr('Yuborish')}>
                <Ionicons name="send" size={18} color={c.brandText} style={{ marginLeft: 3 }} />
              </Pressable>
            ) : (
              <Pressable onPress={() => setMeet(true)} hitSlop={6} style={styles.composerBtn} accessibilityLabel={tr('Onlayn uchrashuv belgilash')}>
                <Ionicons name="calendar-outline" size={24} color={c.muted} />
              </Pressable>
            )}
          </View>
        ) : (
          <View style={[styles.locked, { paddingBottom: insets.bottom + 14, backgroundColor: c.surface, borderTopColor: c.line }]}>
            <Ionicons name={cv.blocked ? 'ban' : declined ? 'close-circle-outline' : 'hourglass-outline'} size={18} color={c.muted} />
            <Txt v="small" muted style={{ flexShrink: 1, textAlign: 'center' }}>
              {cv.blocked ? tr('Siz bu suhbatni blokladingiz') : declined ? tr("So'rov rad etilgan") : pendingIn ? tr("Yozish uchun so'rovni qabul qiling") : tr("So'rov yuborildi — javob kutilmoqda")}
            </Txt>
            {cv.blocked && <Button title={tr('Blokdan chiqarish')} small kind="ghost" onPress={() => p.toggleBlockChat(cv.id)} />}
          </View>
        )}
      </KeyboardAvoidingView>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={cv.peerName}>
        <View style={{ gap: 2 }}>
          {profileHref && <ListItem icon="person-outline" title={tr("Profilni ko'rish")} onPress={() => { setMenu(false); router.push(profileHref); }} />}
          {canWrite && <ListItem icon="calendar-outline" title={tr('Onlayn uchrashuv belgilash')} onPress={() => { setMenu(false); setTimeout(() => setMeet(true), 350); }} />}
          {canWrite && <ListItem icon="document-attach-outline" title={tr('Hujjat yuborish')} onPress={() => { setMenu(false); attach(); }} />}
          {cv.peerKind !== 'support' && (
            <>
              <ListItem icon={cv.blocked ? 'lock-open-outline' : 'ban-outline'} title={cv.blocked ? tr('Blokdan chiqarish') : tr('Bloklash')} danger={!cv.blocked} onPress={() => { setMenu(false); p.toggleBlockChat(cv.id); toast(cv.blocked ? tr('Blokdan chiqarildi') : tr('Foydalanuvchi bloklandi'), 'ban'); }} />
              <ListItem icon="flag-outline" title={tr('Shikoyat qilish')} danger onPress={() => { setMenu(false); setTimeout(() => setReporting(true), 350); }} />
            </>
          )}
        </View>
      </Sheet>
      <MeetingSheet visible={meet} onClose={() => setMeet(false)} onCreate={(at, title, dur) => { p.scheduleMeeting(cv.id, at, title, dur); toast(tr('Uchrashuv belgilandi'), 'calendar'); }} />
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind={reportKind} id={cv.peerId} title={cv.peerName} />
    </View>
  );
}

/** Suhbat foni: yumshoq gradient va ustida qiya joylashgan xira YUMS belgilari */
const DOODLES: IconName[] = [
  'car-sport-outline', 'rocket-outline', 'briefcase-outline', 'star-outline', 'chatbubble-outline', 'bulb-outline',
  'airplane-outline', 'globe-outline', 'diamond-outline', 'trending-up-outline', 'navigate-outline', 'sparkles-outline',
];
const CELL = 62;

function Wallpaper() {
  const { dark } = useStore();
  const { width, height } = useWindowDimensions();
  const marks = useMemo(() => {
    const cols = Math.ceil(width / CELL) + 1;
    const lines = Math.ceil(height / CELL) + 1;
    const out: { key: string; icon: IconName; left: number; top: number; rotate: string; size: number }[] = [];
    for (let r = 0; r < lines; r++) {
      for (let col = 0; col < cols; col++) {
        const i = r * cols + col;
        // takrorlanuvchi, lekin tartibsiz ko'rinadigan siljish va burilish
        const jitterX = ((i * 37) % 17) - 8;
        const jitterY = ((i * 53) % 15) - 7;
        out.push({
          key: `${r}-${col}`,
          icon: DOODLES[(i * 7 + r) % DOODLES.length],
          left: col * CELL + (r % 2 ? CELL / 2 : 0) + jitterX - 12,
          top: r * CELL + jitterY - 12,
          rotate: `${((i * 41) % 70) - 35}deg`,
          size: 20 + ((i * 13) % 6),
        });
      }
    }
    return out;
  }, [width, height]);
  const color = dark ? 'rgba(255,200,0,0.055)' : 'rgba(40,70,100,0.075)';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={dark ? ['#0E141D', '#0A0F16'] : ['#E7EDF3', '#D9E3EC']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        {marks.map(m => (
          <Ionicons key={m.key} name={m.icon} size={m.size} color={color} style={{ position: 'absolute', left: m.left, top: m.top, transform: [{ rotate: m.rotate }] }} />
        ))}
      </View>
    </View>
  );
}

/** Xabar pufakchasi: guruhda yaqin, oxirgisida dum; vaqt va belgi pufakcha ichida, matn oxirida */
function Bubble({ m, tail, joined, glass }: { m: Message; tail: boolean; joined: boolean; glass: string }) {
  const { colors: c, dark } = useStore();
  const { meetings } = usePlatform();
  if (m.from === 'system') {
    return (
      <View style={[styles.pill, { backgroundColor: glass, maxWidth: '86%' }]}>
        <Text style={[styles.pillText, { color: dark ? '#E7ECF3' : c.text, textAlign: 'center' }]}>{m.text}</Text>
      </View>
    );
  }
  const me = m.from === 'me';
  const meeting = m.meetingId ? meetings.find(x => x.id === m.meetingId) : undefined;
  const bg = me ? c.brand : dark ? '#1A2230' : '#FFFFFF';
  const fg = me ? c.brandText : c.text;
  const metaColor = me ? 'rgba(14,21,37,0.62)' : c.faint;
  const time = hhmm(m.at);
  const meta = (
    <View style={styles.meta}>
      <Text style={[styles.time, { color: metaColor }]}>{time}</Text>
      {me && <Ionicons name="checkmark" size={14} color={metaColor} />}
    </View>
  );
  // guruh ichidagi tomonda burchaklar kichikroq — xabarlar bir-biriga «yopishadi»
  const corners = me
    ? { borderTopRightRadius: joined ? 6 : 18, borderBottomRightRadius: tail ? 4 : 6 }
    : { borderTopLeftRadius: joined ? 6 : 18, borderBottomLeftRadius: tail ? 4 : 6 };

  return (
    <View style={[styles.bubbleRow, { alignSelf: me ? 'flex-end' : 'flex-start', marginTop: joined ? 2 : 7 }]}>
      <View style={[styles.bubble, corners, { backgroundColor: bg }]}>
        {meeting ? (
          <View style={{ gap: 6, minWidth: 200 }}>
            <Row gap={8}><Ionicons name="videocam" size={18} color={fg} /><Text style={{ color: fg, fontFamily: F.bold, fontSize: 15 }}>{tr('Onlayn uchrashuv')}</Text></Row>
            <Text style={{ color: fg, fontFamily: F.semi, fontSize: 15 }}>{meeting.title}</Text>
            <Text style={{ color: fg, opacity: 0.75, fontSize: 13, fontFamily: F.medium }}>
              {tr('{day}, {date} · {time} · {min} daq', { day: weekdayShort(new Date(meeting.at)), date: fmtDay(meeting.at), time: hhmm(meeting.at), min: meeting.durationMin })}</Text>
            {meeting.status === 'cancelled'
              ? <Text style={{ color: fg, fontFamily: F.bold, fontSize: 13 }}>{tr('Bekor qilingan')}</Text>
              : <Pressable onPress={() => Linking.openURL(meeting.link).catch(() => toast(tr('Havola ochilmadi'), 'alert-circle'))} style={[styles.join, { backgroundColor: me ? 'rgba(14,21,37,0.12)' : c.surface2 }]}><Text style={{ color: fg, fontFamily: F.bold }}>{tr("Qo'shilish")}</Text></Pressable>}
            {meta}
          </View>
        ) : m.file ? (
          <Pressable onPress={() => {
            const f = m.file;
            if (!f?.uri) { toast(tr("Fayl hali yuklanmagan"), 'cloud-download-outline'); return; }
            openFile(f.uri, f.name).then(ok => { if (!ok) toast(tr("Faylni ochib bo'lmadi"), 'alert-circle'); }).catch(() => toast(tr("Faylni ochib bo'lmadi"), 'alert-circle'));
          }} style={{ gap: 6 }}>
            <Row gap={10}>
              <View style={[styles.fileIco, { backgroundColor: me ? 'rgba(14,21,37,0.12)' : c.accentSoft }]}><Ionicons name="document-text" size={20} color={me ? fg : c.accent} /></View>
              <View style={{ flexShrink: 1 }}>
                <Text style={{ color: fg, fontFamily: F.bold, fontSize: 14.5 }} numberOfLines={1}>{m.file.name}</Text>
                <Text style={{ color: fg, opacity: 0.7, fontSize: 12, fontFamily: F.medium }}>{fileSize(m.file.size) || 'hujjat'}</Text>
              </View>
            </Row>
            {m.text !== m.file.name ? <Text style={[styles.msgText, { color: fg }]}>{m.text}</Text> : null}
            {meta}
          </Pressable>
        ) : (
          <>
            {/* oxiridagi ko'rinmas joy vaqt uchun — u matnning so'nggi qatoriga sig'sa, o'sha qatorda turadi */}
            <Text style={[styles.msgText, { color: fg }]}>
              {m.text}
              <Text style={[styles.time, styles.spacer]}>{` ${NB}${NB}${time}${NB.repeat(me ? 6 : 1)}`}</Text>
            </Text>
            <View style={styles.metaFloat}>{meta}</View>
          </>
        )}
      </View>
      {tail && <View style={[me ? styles.tailRight : styles.tailLeft, me ? { borderLeftColor: bg } : { borderRightColor: bg }]} />}
    </View>
  );
}

function MeetingSheet({ visible, onClose, onCreate }: { visible: boolean; onClose: () => void; onCreate: (at: Date, title: string, dur: number) => void }) {
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('15:00');
  const [dur, setDur] = useState(30);
  const [title, setTitle] = useState(() => tr("Tanishuv qo'ng'irog'i"));
  const [base] = useState(() => Date.now());
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => new Date(base + i * 86400000));
  const create = () => {
    const at = new Date(days[day]);
    const [h, mm] = time.split(':').map(Number);
    at.setHours(h, mm, 0, 0);
    if (at.getTime() < Date.now()) { toast(tr("O'tgan vaqtni tanlab bo'lmaydi"), 'alert-circle'); return; }
    onCreate(at, title.trim() || tr('Onlayn uchrashuv'), dur);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={tr('Onlayn uchrashuv')} footer={<Button title={tr('Taklif yuborish')} icon="videocam" onPress={create} />}>
      <Field label={tr('Mavzu')} value={title} onChangeText={setTitle} />
      <Txt v="small" muted style={{ fontFamily: F.bold }}>{tr('Kun')}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d, i) => <Chip key={i} label={i === 0 ? tr('Bugun') : i === 1 ? tr('Ertaga') : `${weekdayShort(d)}, ${d.getDate()}`} active={day === i} onPress={() => setDay(i)} />)}
      </ScrollView>
      <Txt v="small" muted style={{ fontFamily: F.bold }}>{tr('Vaqt')}</Txt>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'].map(t => <Chip key={t} label={t} active={time === t} onPress={() => setTime(t)} />)}
      </Row>
      <Txt v="small" muted style={{ fontFamily: F.bold }}>{tr('Davomiyligi')}</Txt>
      <Row gap={8}>{[15, 30, 60].map(m => <Chip key={m} label={tr('{m} daq', { m })} active={dur === m} onPress={() => setDur(m)} />)}</Row>
      <Txt v="tiny" faint>{tr('Video havola avtomatik yaratiladi va suhbatga yuboriladi.')}</Txt>
    </Sheet>
  );
}

const TAIL = 9;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 2 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  peerName: { fontSize: 16.5, fontFamily: F.bold, letterSpacing: -0.2, flexShrink: 1 },
  peerSub: { fontSize: 12.5, fontFamily: F.medium, marginTop: 1 },
  // Telegram'dagidek: xabarlar pastdan boshlanadi, kam bo'lsa ham tepada «osilib» turmaydi
  list: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, flexGrow: 1, justifyContent: 'flex-end' },
  introWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  intro: { alignItems: 'center', gap: 8, padding: 20, borderRadius: 22 },
  introIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  pill: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginVertical: 8 },
  pillText: { fontSize: 13, fontFamily: F.semi },
  bubbleRow: { maxWidth: '84%', position: 'relative' },
  bubble: {
    paddingLeft: 11,
    paddingRight: 10,
    paddingTop: 7,
    paddingBottom: 7,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  msgText: { fontSize: 15.5, lineHeight: 21, fontFamily: F.medium },
  spacer: { color: 'transparent' },
  metaFloat: { position: 'absolute', right: 9, bottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-end' },
  time: { fontSize: 11.5, fontFamily: F.medium, fontVariant: ['tabular-nums'] },
  // dum: pufakcha rangidagi uchburchak, pastki burchakda
  tailRight: { position: 'absolute', right: -TAIL + 2, bottom: 0, width: 0, height: 0, borderTopWidth: TAIL + 3, borderTopColor: 'transparent', borderLeftWidth: TAIL },
  tailLeft: { position: 'absolute', left: -TAIL + 2, bottom: 0, width: 0, height: 0, borderTopWidth: TAIL + 3, borderTopColor: 'transparent', borderRightWidth: TAIL },
  fileIco: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  join: { alignItems: 'center', paddingVertical: 8, borderRadius: 12, marginTop: 2 },
  banner: { marginHorizontal: 10, marginBottom: 8, padding: 12, borderRadius: 18, gap: 10, borderWidth: StyleSheet.hairlineWidth },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingHorizontal: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  composerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, minHeight: 44, maxHeight: 150, paddingHorizontal: 6, paddingTop: 11, paddingBottom: 11, fontSize: 16, fontFamily: F.medium },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', margin: 2 },
  locked: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
});
