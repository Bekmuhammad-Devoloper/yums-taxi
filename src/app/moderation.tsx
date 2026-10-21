import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { toast } from '@/components/toast';
import { Badge, Button, Card, EmptyState, Row, Screen, Segmented, Sheet, Stat, Txt } from '@/components/ui';
import { countryOf, ago, flagged, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';

type Tab = 'queue' | 'reports' | 'verify';
const REJECT = ["Soxta yoki tekshirib bo'lmaydigan ma'lumot", 'Taqiqlangan faoliyat', 'Litsenziya talab qilinadi', "Kontent to'liq emas", "Takroriy e'lon"];
const KIND_LABEL: Record<string, string> = { project: 'Loyiha', market: 'Bozor', company: 'Kompaniya', specialist: 'Mutaxassis', investor: 'Investor', user: 'Foydalanuvchi' };

export default function Moderation() {
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const [tab, setTab] = useState<Tab>('queue');
  const [rejecting, setRejecting] = useState<{ kind: 'project' | 'market'; id: string } | null>(null);

  if (user?.role !== 'moderator' && user?.role !== 'admin') {
    return (
      <Screen title="Moderatsiya">
        <EmptyState icon="lock-closed-outline" title="Ruxsat yo'q" sub="Bu bo'lim faqat moderator va administratorlar uchun. Ruxsat darajasi Xavfsizlik bo'limida ko'rsatilgan." action="Xavfsizlik" onAction={() => router.replace('/security')} />
      </Screen>
    );
  }

  const queue = [
    ...p.projects.filter(x => x.status === 'review').map(x => ({ kind: 'project' as const, id: x.id, title: x.title, owner: x.ownerName, verified: x.ownerVerified, text: x.summary, at: x.createdAt, flags: flagged(x.title, x.summary, x.description, x.goal) })),
    ...p.market.filter(x => x.status === 'review').map(x => ({ kind: 'market' as const, id: x.id, title: x.title, owner: x.sellerName, verified: x.sellerVerified, text: x.desc, at: x.createdAt, flags: flagged(x.title, x.desc) })),
  ].sort((a, b) => b.flags.length - a.flags.length || a.at.localeCompare(b.at));
  const open = p.reports.filter(r => r.status === 'open');
  const closed = p.reports.filter(r => r.status !== 'open');
  const pendingV = p.verifications.filter(v => v.status === 'pending');

  const decide = (kind: 'project' | 'market', id: string, ok: boolean, reason?: string) => {
    haptic.success();
    p.moderate(kind, id, ok, reason);
    toast(ok ? "E'lon tasdiqlandi va katalogda" : "E'lon rad etildi — muallifga sabab yuborildi", ok ? 'checkmark-circle' : 'close-circle');
  };

  return (
    <Screen title="Moderatsiya paneli" subtitle={user.role === 'admin' ? 'Administrator' : 'Moderator'}>
      <Card>
        <Row>
          <Stat value={String(queue.length)} label="Navbatda" />
          <Stat value={String(open.length)} label="Shikoyatlar" />
          <Stat value={String(pendingV.length)} label="Tasdiqlash" />
          <Stat value={String(p.blocked.length)} label="Bloklangan" />
        </Row>
      </Card>

      <Segmented<Tab> value={tab} onChange={setTab} items={[
        { id: 'queue', label: "E'lonlar", badge: queue.length },
        { id: 'reports', label: 'Shikoyatlar', badge: open.length },
        { id: 'verify', label: 'Tasdiqlash', badge: pendingV.length },
      ]} />

      {tab === 'queue' && (queue.length ? queue.map(q => (
        <Card key={q.kind + q.id} style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge label={KIND_LABEL[q.kind]} tone="accent" />
            <Txt v="tiny" faint>{ago(q.at)}</Txt>
          </Row>
          <Pressable onPress={() => router.push(q.kind === 'project' ? { pathname: '/project/[id]', params: { id: q.id } } : { pathname: '/market/[id]', params: { id: q.id } })}>
            <Txt v="h3">{q.title}</Txt>
            <Txt v="small" muted>{q.owner}{q.verified ? ' · tasdiqlangan' : ' · tasdiqlanmagan'}</Txt>
          </Pressable>
          <Txt v="small" muted numberOfLines={3}>{q.text}</Txt>
          {q.flags.length > 0 && (
            <View style={[styles.flag, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="warning" size={16} color={c.danger} />
              <Txt v="small" color={c.danger} style={{ flex: 1, fontWeight: '700' }}>Avto-filtr: «{q.flags.join('», «')}»</Txt>
            </View>
          )}
          <Row gap={8}>
            <Button title="Rad etish" kind="danger" small style={{ flex: 1 }} onPress={() => setRejecting({ kind: q.kind, id: q.id })} />
            <Button title="Tasdiqlash" small icon="checkmark" style={{ flex: 1 }} onPress={() => decide(q.kind, q.id, true)} />
          </Row>
        </Card>
      )) : <EmptyState icon="checkmark-done-outline" title="Navbat bo'sh" sub="Barcha e'lonlar ko'rib chiqildi" />)}

      {tab === 'reports' && (
        <>
          {open.length === 0 && <EmptyState icon="shield-checkmark-outline" title="Ochiq shikoyatlar yo'q" />}
          {open.map(r => (
            <Card key={r.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge label={KIND_LABEL[r.targetKind]} tone="danger" icon="flag" />
                <Txt v="tiny" faint>{ago(r.createdAt)}</Txt>
              </Row>
              <Txt v="h3">{r.targetTitle}</Txt>
              <Txt v="small" style={{ fontWeight: '700' }}>{r.reason}</Txt>
              {r.note ? <Txt v="small" muted>«{r.note}»</Txt> : null}
              <Txt v="tiny" faint>Shikoyatchi: {r.by}</Txt>
              <Row gap={8} style={{ marginTop: 4 }}>
                <Button title="Asos yo'q" kind="ghost" small style={{ flex: 1 }} onPress={() => { p.resolveReport(r.id, 'dismiss'); toast('Shikoyat yopildi', 'checkmark'); }} />
                <Button title="Bloklash" kind="danger" small icon="ban" style={{ flex: 1 }} onPress={() => { p.resolveReport(r.id, 'block'); haptic.success(); toast('Kontent bloklandi va katalogdan olindi', 'ban'); }} />
              </Row>
            </Card>
          ))}
          {closed.length > 0 && <Txt v="tiny" faint style={{ marginTop: 6, marginLeft: 4 }}>KO'RIB CHIQILGAN</Txt>}
          {closed.map(r => (
            <Card key={r.id} style={{ gap: 4, opacity: 0.75 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="small" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.targetTitle}</Txt>
                <Badge label={r.action ?? r.status} tone={r.status === 'resolved' ? 'danger' : 'muted'} />
              </Row>
              <Txt v="tiny" faint>{r.reason}</Txt>
            </Card>
          ))}
        </>
      )}

      {tab === 'verify' && (
        <>
          {pendingV.length === 0 && <EmptyState icon="id-card-outline" title="Tasdiqlash so'rovlari yo'q" />}
          {pendingV.map(v => (
            <Card key={v.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="h3" style={{ flex: 1 }}>{v.name}{v.isMe ? ' (siz)' : ''}</Txt>
                <Badge label={v.kind === 'company' ? 'Kompaniya' : 'Jismoniy shaxs'} />
              </Row>
              <Txt v="small" muted>{countryOf(v.country).flag} {countryOf(v.country).name} · {ago(v.createdAt)}</Txt>
              {v.docs.map(d => (
                <Row key={d} gap={8}><Ionicons name="document-attach-outline" size={16} color={c.muted} /><Txt v="small">{d}</Txt></Row>
              ))}
              <Row gap={8} style={{ marginTop: 4 }}>
                <Button title="Rad etish" kind="danger" small style={{ flex: 1 }} onPress={() => { p.decideVerification(v.id, false); toast('Tasdiqlash rad etildi', 'close-circle'); }} />
                <Button title="Tasdiqlash" small icon="shield-checkmark" style={{ flex: 1 }} onPress={() => { p.decideVerification(v.id, true); haptic.success(); toast('Profil tasdiqlandi', 'shield-checkmark'); }} />
              </Row>
            </Card>
          ))}
        </>
      )}

      <Sheet visible={!!rejecting} onClose={() => setRejecting(null)} title="Rad etish sababi">
        {REJECT.map(r => (
          <Button key={r} title={r} kind="ghost" small onPress={() => { if (rejecting) decide(rejecting.kind, rejecting.id, false, r); setRejecting(null); }} />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flag: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
});
