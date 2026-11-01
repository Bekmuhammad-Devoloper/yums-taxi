import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PEER_LABEL, PeerAvatar } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Badge, Button, Card, EmptyState, Row, Segmented, Txt, Verified } from '@/components/ui';
import type { Conversation } from '@/lib/platform-data';
import { ago, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

type Tab = 'chats' | 'requests' | 'meetings';

const preview = (cv: Conversation): { text: string; icon?: 'calendar-outline' | 'attach' } => {
  const m = cv.messages[cv.messages.length - 1];
  if (!m) return { text: cv.subject ?? tr('Yangi suhbat') };
  const who = m.from === 'me' ? tr('Siz: ') : '';
  if (m.meetingId) return { text: tr('{who}Onlayn uchrashuv', { who }), icon: 'calendar-outline' };
  if (m.file) return { text: who + m.file.name, icon: 'attach' };
  return { text: who + m.text };
};

export default function Connect() {
  const { colors: c, t } = useStore();
  const p = usePlatform();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'requests' || params.tab === 'meetings' ? params.tab : 'chats');

  const chats = p.conversations.filter(x => x.kind === 'chat' || x.requestStatus === 'accepted');
  const requests = p.conversations.filter(x => x.kind === 'request' && x.requestStatus !== 'accepted');
  const pendingIn = requests.filter(x => x.incoming && x.requestStatus === 'pending').length;
  const upcoming = p.meetings.filter(m => m.status === 'scheduled');

  const open = (id: string) => { haptic.tap(); router.push({ pathname: '/chat/[id]', params: { id } }); };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, gap: 12, paddingBottom: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt v="h1">{t('connect.title')}</Txt>
            <Txt v="small" muted>{t('sec.connect')}</Txt>
          </View>
        </Row>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { id: 'chats', label: t('connect.chats') },
            { id: 'requests', label: t('connect.requests'), badge: pendingIn },
            { id: 'meetings', label: t('connect.meetings'), badge: upcoming.length },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10, paddingBottom: 30 }}>
        {tab === 'chats' && (chats.length ? chats.map(cv => (
          <Pressable key={cv.id} onPress={() => open(cv.id)} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surface2 : c.surface }]}>
            <PeerAvatar conv={cv} />
            <View style={{ flex: 1, gap: 2 }}>
              <Row gap={4}>
                <Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{cv.peerName}</Txt>
                {cv.peerVerified && <Verified size={14} />}
                {cv.blocked && <Ionicons name="ban" size={14} color={c.danger} />}
              </Row>
              {(() => {
                const pv = preview(cv);
                return (
                  <Row gap={4}>
                    {pv.icon && <Ionicons name={pv.icon} size={14} color={cv.unread ? c.text : c.muted} />}
                    <Txt v="small" muted={!cv.unread} numberOfLines={1} style={[{ flexShrink: 1 }, !!cv.unread && { fontFamily: F.bold }]}>{pv.text}</Txt>
                  </Row>
                );
              })()}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Txt v="tiny" faint>{cv.messages.length ? ago(cv.messages[cv.messages.length - 1].at) : ''}</Txt>
              {cv.unread ? <View style={[styles.unread, { backgroundColor: c.brand }]}><Text style={[styles.unreadText, { color: c.brandText }]}>{cv.unread}</Text></View> : null}
            </View>
          </Pressable>
        )) : <EmptyState icon="chatbubbles-outline" title={tr("Hali suhbatlar yo'q")} sub={tr('Loyiha, kompaniya yoki mutaxassis sahifasidan «Yozish» tugmasini bosing')} action={tr("Qidiruvga o'tish")} onAction={() => router.push('/world')} />)}

        {tab === 'requests' && (requests.length ? requests.map(cv => {
          const status = cv.requestStatus === 'declined' ? { l: tr('Rad etilgan'), tone: 'danger' as const } : cv.incoming ? { l: tr("Yangi so'rov"), tone: 'warn' as const } : { l: tr('Javob kutilmoqda'), tone: 'muted' as const };
          return (
            <Card key={cv.id} onPress={() => open(cv.id)} style={{ gap: 12 }}>
              <Row>
                <PeerAvatar conv={cv} size={46} />
                <View style={{ flex: 1 }}>
                  <Row gap={4}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{cv.peerName}</Txt>{cv.peerVerified && <Verified size={14} />}</Row>
                  <Txt v="small" muted>{PEER_LABEL[cv.peerKind]} · {cv.subject ?? tr("Hamkorlik so'rovi")}</Txt>
                </View>
                <Badge label={status.l} tone={status.tone} />
              </Row>
              {cv.messages[0] ? <Txt v="small" muted numberOfLines={3} style={{ lineHeight: 19 }}>{cv.messages[0].text}</Txt> : null}
              {cv.incoming && cv.requestStatus === 'pending' && (
                <Row gap={8}>
                  <Button title={tr('Rad etish')} kind="ghost" small style={{ flex: 1 }} onPress={() => { p.respondRequest(cv.id, false); toast(tr("So'rov rad etildi"), 'close-circle'); }} />
                  <Button title={tr('Qabul qilish')} small style={{ flex: 1.4 }} icon="checkmark" onPress={() => { p.respondRequest(cv.id, true); toast(tr("So'rov qabul qilindi"), 'people'); open(cv.id); }} />
                </Row>
              )}
            </Card>
          );
        }) : <EmptyState icon="people-outline" title={tr("So'rovlar yo'q")} sub={tr("Investor, hamkor yoki mijozlardan hamkorlik so'rovlari shu yerda ko'rinadi")} />)}

        {tab === 'meetings' && (upcoming.length ? upcoming.map(m => {
          const d = new Date(m.at);
          return (
            <Card key={m.id} style={{ gap: 12 }}>
              <Row>
                <View style={[styles.date, { backgroundColor: c.brandSoft }]}>
                  <Txt v="h2" color={c.brandDeep}>{d.getDate()}</Txt>
                  <Txt v="tiny" color={c.brandDeep}>{['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'][d.getMonth()]}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="h3" numberOfLines={1}>{m.title}</Txt>
                  <Txt v="small" muted>{m.with}</Txt>
                  <Txt v="small" muted>{tr('{v2}:{v3} · {durationMin} daqiqa · video', { v2: String(d.getHours()).padStart(2, '0'), v3: String(d.getMinutes()).padStart(2, '0'), durationMin: m.durationMin })}</Txt>
                </View>
              </Row>
              <Row gap={8}>
                <Button title={tr('Bekor qilish')} kind="ghost" small style={{ flex: 1 }} onPress={() => { p.cancelMeeting(m.id); toast(tr('Uchrashuv bekor qilindi'), 'calendar-clear'); }} />
                <Button title={tr("Qo'shilish")} icon="videocam" kind="dark" small style={{ flex: 1.4 }} onPress={() => Linking.openURL(m.link).catch(() => toast(tr('Havola ochilmadi'), 'alert-circle'))} />
              </Row>
            </Card>
          );
        }) : <EmptyState icon="calendar-outline" title={tr('Uchrashuvlar rejalashtirilmagan')} sub={tr('Suhbat ichidagi kalendar tugmasi orqali onlayn uchrashuv belgilang')} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20 },
  unread: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { fontFamily: F.heavy, fontSize: 12 },
  date: { width: 56, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
