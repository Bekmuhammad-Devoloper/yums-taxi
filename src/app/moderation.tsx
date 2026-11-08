import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { toast } from '@/components/toast';
import { Badge, Button, Card, EmptyState, Row, Screen, Segmented, Sheet, Stat, Txt } from '@/components/ui';
import { Place } from '@/components/platform-ui';
import { openFile } from '@/lib/open-file';
import { ago, flagged, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, tx } from '@/lib/i18n';

type Tab = 'queue' | 'reports' | 'verify' | 'ads';
type Rejecting = { kind: 'project' | 'market' | 'ad' | 'verify'; id: string };
const VERIFY_REJECT = [tx("Hujjatlar aniq ko'rinmadi"), tx("Ma'lumotlar reyestr bilan mos kelmadi"), tx("Hujjat muddati o'tgan"), tx("Hujjatlar to'liq emas")];
const AD_REJECT = [tx('Taqiqlangan mahsulot yoki xizmat'), tx("Chalg'ituvchi va'da"), tx("Banner sifati past yoki matn o'qilmaydi"), tx('Litsenziya talab qilinadi')];
const REJECT = [tx("Soxta yoki tekshirib bo'lmaydigan ma'lumot"), tx('Taqiqlangan faoliyat'), tx('Litsenziya talab qilinadi'), tx("Kontent to'liq emas"), tx("Takroriy e'lon")];
const KIND_LABEL: Record<string, string> = {
  get project() { return tr('Loyiha'); }, get market() { return tr('Bozor'); }, get company() { return tr('Kompaniya'); },
  get specialist() { return tr('Mutaxassis'); }, get investor() { return tr('Investor'); }, get user() { return tr('Foydalanuvchi'); },
};

export default function Moderation() {
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const [tab, setTab] = useState<Tab>('queue');
  const [rejecting, setRejecting] = useState<Rejecting | null>(null);

  if (user?.role !== 'moderator' && user?.role !== 'admin') {
    return (
      <Screen title={tr('Moderatsiya')}>
        <EmptyState icon="lock-closed-outline" title={tr("Ruxsat yo'q")} sub={tr("Bu bo'lim faqat moderator va administratorlar uchun. Ruxsat darajasi Xavfsizlik bo'limida ko'rsatilgan.")} action={tr('Xavfsizlik')} onAction={() => router.replace('/security')} />
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
  const ads = p.reviewAds;

  const decide = (kind: Rejecting['kind'], id: string, ok: boolean, reason?: string) => {
    haptic.success();
    if (kind === 'verify') {
      p.decideVerification(id, ok, reason);
      toast(ok ? tr('Profil tasdiqlandi') : tr('Tasdiqlash rad etildi'), ok ? 'shield-checkmark' : 'close-circle');
      return;
    }
    p.moderate(kind, id, ok, reason);
    if (kind === 'ad') toast(ok ? tr('Reklama faollashtirildi') : tr("Reklama rad etildi — byudjet qaytarildi"), ok ? 'megaphone' : 'close-circle');
    else toast(ok ? tr("E'lon tasdiqlandi va katalogda") : tr("E'lon rad etildi — muallifga sabab yuborildi"), ok ? 'checkmark-circle' : 'close-circle');
  };
  const reasons = rejecting?.kind === 'verify' ? VERIFY_REJECT : rejecting?.kind === 'ad' ? AD_REJECT : REJECT;
  const open$ = (uri: string, name: string) => {
    openFile(uri, name).then(ok => { if (!ok) toast(tr("Faylni ochib bo'lmadi"), 'alert-circle'); }).catch(() => toast(tr("Faylni ochib bo'lmadi"), 'alert-circle'));
  };

  return (
    <Screen title={tr('Moderatsiya paneli')} subtitle={user.role === 'admin' ? tr('Administrator') : tr('Moderator')}>
      <Card>
        <Row>
          <Stat value={String(queue.length)} label={tr('Navbatda')} />
          <Stat value={String(open.length)} label={tr('Shikoyatlar')} />
          <Stat value={String(pendingV.length)} label={tr('Tasdiqlash')} />
          <Stat value={String(ads.length)} label={tr('Reklama')} />
        </Row>
      </Card>

      <Segmented<Tab> value={tab} onChange={setTab} items={[
        { id: 'queue', label: tr("E'lonlar"), badge: queue.length },
        { id: 'reports', label: tr('Shikoyatlar'), badge: open.length },
        { id: 'verify', label: tr('Tasdiqlash'), badge: pendingV.length },
        { id: 'ads', label: tr('Reklama'), badge: ads.length },
      ]} />

      {tab === 'queue' && (queue.length ? queue.map(q => (
        <Card key={q.kind + q.id} style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge label={KIND_LABEL[q.kind]} tone="accent" />
            <Txt v="tiny" faint>{ago(q.at)}</Txt>
          </Row>
          <Pressable onPress={() => router.push(q.kind === 'project' ? { pathname: '/project/[id]', params: { id: q.id } } : { pathname: '/market/[id]', params: { id: q.id } })}>
            <Txt v="h3">{q.title}</Txt>
            <Txt v="small" muted>{q.owner}{q.verified ? tr(' · tasdiqlangan') : tr(' · tasdiqlanmagan')}</Txt>
          </Pressable>
          <Txt v="small" muted numberOfLines={3}>{q.text}</Txt>
          {q.flags.length > 0 && (
            <View style={[styles.flag, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="warning" size={16} color={c.danger} />
              <Txt v="small" color={c.danger} style={{ flex: 1, fontFamily: F.bold }}>{tr('Avto-filtr: «{flags}»', { flags: q.flags.join('», «') })}</Txt>
            </View>
          )}
          <Row gap={8}>
            <Button title={tr('Rad etish')} kind="danger" small style={{ flex: 1 }} onPress={() => setRejecting({ kind: q.kind, id: q.id })} />
            <Button title={tr('Tasdiqlash')} small icon="checkmark" style={{ flex: 1 }} onPress={() => decide(q.kind, q.id, true)} />
          </Row>
        </Card>
      )) : <EmptyState icon="checkmark-done-outline" title={tr("Navbat bo'sh")} sub={tr("Barcha e'lonlar ko'rib chiqildi")} />)}

      {tab === 'reports' && (
        <>
          {open.length === 0 && <EmptyState icon="shield-checkmark-outline" title={tr("Ochiq shikoyatlar yo'q")} />}
          {open.map(r => (
            <Card key={r.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge label={KIND_LABEL[r.targetKind]} tone="danger" icon="flag" />
                <Txt v="tiny" faint>{ago(r.createdAt)}</Txt>
              </Row>
              <Txt v="h3">{r.targetTitle}</Txt>
              <Txt v="small" style={{ fontFamily: F.bold }}>{tr(r.reason)}</Txt>
              {r.note ? <Txt v="small" muted>«{r.note}»</Txt> : null}
              <Txt v="tiny" faint>{tr('Shikoyatchi: {by}', { by: r.by })}</Txt>
              <Row gap={8} style={{ marginTop: 4 }}>
                <Button title={tr("Asos yo'q")} kind="ghost" small style={{ flex: 1 }} onPress={() => { p.resolveReport(r.id, 'dismiss'); toast(tr('Shikoyat yopildi'), 'checkmark'); }} />
                <Button title={tr('Bloklash')} kind="danger" small icon="ban" style={{ flex: 1 }} onPress={() => { p.resolveReport(r.id, 'block'); haptic.success(); toast(tr('Kontent bloklandi va katalogdan olindi'), 'ban'); }} />
              </Row>
            </Card>
          ))}
          {closed.length > 0 && <Txt v="tiny" faint style={{ marginTop: 6, marginLeft: 4 }}>{tr("KO'RIB CHIQILGAN")}</Txt>}
          {closed.map(r => (
            <Card key={r.id} style={{ gap: 4, opacity: 0.75 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="small" style={{ fontFamily: F.bold, flex: 1 }} numberOfLines={1}>{r.targetTitle}</Txt>
                <Badge label={r.action ?? r.status} tone={r.status === 'resolved' ? 'danger' : 'muted'} />
              </Row>
              <Txt v="tiny" faint>{tr(r.reason)}</Txt>
            </Card>
          ))}
        </>
      )}

      {tab === 'verify' && (
        <>
          {pendingV.length === 0 && <EmptyState icon="id-card-outline" title={tr("Tasdiqlash so'rovlari yo'q")} />}
          {pendingV.map(v => (
            <Card key={v.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="h3" style={{ flex: 1 }}>{v.name}{v.isMe ? tr(' (siz)') : ''}</Txt>
                <Badge label={v.kind === 'company' ? tr('Kompaniya') : tr('Jismoniy shaxs')} />
              </Row>
              <Place code={v.country} after={` · ${ago(v.createdAt)}`} />
              {v.docs.map((d, i) => {
                const file = v.files?.find(f => f.name === d) ?? v.files?.[i];
                return (
                  <Pressable key={d + i} disabled={!file} onPress={() => file && open$(file.data, file.name)}>
                    <Row gap={8}>
                      <Ionicons name="document-attach-outline" size={16} color={file ? c.accent : c.muted} />
                      <Txt v="small" style={{ flex: 1 }} color={file ? c.accent : undefined}>{d}</Txt>
                      {file && <Ionicons name="open-outline" size={16} color={c.accent} />}
                    </Row>
                  </Pressable>
                );
              })}
              <Row gap={8} style={{ marginTop: 4 }}>
                <Button title={tr('Rad etish')} kind="danger" small style={{ flex: 1 }} onPress={() => setRejecting({ kind: 'verify', id: v.id })} />
                <Button title={tr('Tasdiqlash')} small icon="shield-checkmark" style={{ flex: 1 }} onPress={() => decide('verify', v.id, true)} />
              </Row>
            </Card>
          ))}
        </>
      )}

      {tab === 'ads' && (
        <>
          {ads.length === 0 && <EmptyState icon="megaphone-outline" title={tr("Tekshiruvdagi reklama yo'q")} />}
          {ads.map(a => (
            <Card key={a.id} style={{ gap: 8 }}>
              {a.image ? <Image source={{ uri: a.image }} style={styles.banner} contentFit="cover" /> : null}
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="h3" style={{ flex: 1 }}>{a.title}</Txt>
                <Txt v="tiny" faint>{ago(a.createdAt)}</Txt>
              </Row>
              <Txt v="small" muted>{tr('Byudjet: ${budget} · balansdan yechilgan', { budget: a.budgetUsd })}</Txt>
              <Row gap={8} style={{ marginTop: 4 }}>
                <Button title={tr('Rad etish')} kind="danger" small style={{ flex: 1 }} onPress={() => setRejecting({ kind: 'ad', id: a.id })} />
                <Button title={tr('Faollashtirish')} small icon="checkmark" style={{ flex: 1 }} onPress={() => decide('ad', a.id, true)} />
              </Row>
            </Card>
          ))}
        </>
      )}

      <Sheet visible={!!rejecting} onClose={() => setRejecting(null)} title={tr('Rad etish sababi')}>
        {reasons.map(r => (
          <Button key={r} title={tr(r)} kind="ghost" small onPress={() => { if (rejecting) decide(rejecting.kind, rejecting.id, false, r); setRejecting(null); }} />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flag: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
  banner: { width: '100%', aspectRatio: 2, borderRadius: 12 },
});
