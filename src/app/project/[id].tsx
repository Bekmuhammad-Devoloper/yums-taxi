import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyValue, Logo, ReportSheet, SectorGlyph, SectorIcon, StatusBadge } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { ActionSheet, alpha, Avatar, Badge, Button, IOSSwitch, NavButton, NavGroup, Card, DEFAULT_AVATAR, EmptyState, FitImage, ListItem, Row, Screen, shade, Txt, Verified } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { confirm } from '@/lib/confirm';
import { coverOf } from '@/lib/covers';
import { LANGUAGES, SEEKS, STAGES } from '@/lib/platform-data';
import { ago, budget, countryOf, fileSize, flagged, sectorOf, short, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';
import { flipRTL, tr } from '@/lib/i18n';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const start = useStartChat();
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [coverRatio, setCoverRatio] = useState(16 / 9);
  const pr = p.projects.find(x => x.id === id);
  const mine = pr?.ownerId === (user?.id ?? 'me');
  const staff = user?.role === 'moderator' || user?.role === 'admin';
  const { viewProject } = p;

  useEffect(() => { if (id) viewProject(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pr || (!mine && !staff && (pr.status !== 'published' || p.isBlocked('project', pr.id)))) {
    return <Screen title={tr('Loyiha')}><EmptyState icon="alert-circle-outline" title={tr('Loyiha topilmadi')} sub={tr("U o'chirilgan, moderatsiyada yoki bloklangan bo'lishi mumkin")} action={tr('Katalogga qaytish')} onAction={() => router.replace('/projects')} /></Screen>;
  }

  const sec = sectorOf(pr.sector);
  const k = countryOf(pr.country);
  const company = p.companies.find(x => x.id === pr.ownerId);
  const peer = { peerId: pr.ownerId, peerName: pr.ownerName, peerKind: pr.ownerKind === 'company' ? 'company' as const : 'person' as const, peerVerified: pr.ownerVerified };
  const warn = flagged(pr.title, pr.summary, pr.description);

  const share = () => Share.share({ message: tr('YUMS: {title}\n{summary}\nhttps://yums.example/p/{id}', { title: pr.title, summary: pr.summary, id: pr.id }) }).catch(() => {});
  const contact = () => {
    if (pr.contact === 'email' && pr.contactValue) Linking.openURL(`mailto:${pr.contactValue}?subject=${encodeURIComponent('YUMS: ' + pr.title)}`).catch(() => toast(tr('Pochta ilovasi topilmadi'), 'mail'));
    else if (pr.contact === 'phone' && pr.contactValue) Linking.openURL(`tel:${pr.contactValue.replace(/\s/g, '')}`).catch(() => {});
    else start(peer, { subject: pr.title });
  };

  const footer = mine ? (
    <Row gap={10}>
      <Button title={tr('Tahrirlash')} kind="ghost" icon="create-outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/project/edit', params: { id: pr.id } })} />
      {pr.status === 'published' ? (
        <Button title={pr.boosted ? tr('TOPda') : tr('TOPga chiqarish')} icon="flash" disabled={pr.boosted} style={{ flex: 1.3 }} onPress={() => {
          if (p.boostCredits > 0) { p.boostProject(pr.id); toast(tr('Loyiha TOPga chiqarildi — tarif krediti ishlatildi'), 'flash'); }
          else router.push({ pathname: '/plans', params: { boost: pr.id } });
        }} />
      ) : pr.status === 'paused' ? (
        <Button title={tr('Faollashtirish')} icon="play" style={{ flex: 1.3 }} onPress={() => { p.setProjectActive(pr.id, true); toast(tr('Loyiha yana katalogda'), 'eye'); }} />
      ) : pr.status === 'draft' || pr.status === 'rejected' ? (
        <Button title={tr('Yuborish')} icon="send" style={{ flex: 1.3 }} onPress={() => { p.submitProject(pr.id); toast(tr('Loyiha moderatsiyaga yuborildi'), 'hourglass'); }} />
      ) : (
        <Button title={tr('Moderatsiyada')} icon="hourglass-outline" disabled style={{ flex: 1.3 }} />
      )}
    </Row>
  ) : (
    <Row gap={10}>
      <Button title={tr("Hamkorlik so'rovi")} kind="ghost" icon="people-outline" style={{ flex: 1 }} onPress={() => start(peer, { request: true, subject: tr("«{title}» bo'yicha hamkorlik", { title: pr.title }) })} />
      <Button
        title={pr.contact === 'phone' ? tr("Qo'ng'iroq") : pr.contact === 'email' ? tr('Email yozish') : tr('Yozish')}
        icon={pr.contact === 'phone' ? 'call' : pr.contact === 'email' ? 'mail' : 'chatbubble-ellipses'}
        style={{ flex: 1 }}
        onPress={contact}
      />
    </Row>
  );

  const cover = coverOf(pr);
  const saved = p.isFav('project:' + pr.id);
  const heroButtons = (
    <Row style={{ justifyContent: 'space-between' }}>
      <NavButton icon="chevron-back" label={tr('Orqaga')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <NavGroup items={[
        { icon: 'share-outline', label: tr('Ulashish'), onPress: share },
        ...(!mine ? [{
          icon: (saved ? 'bookmark' : 'bookmark-outline') as 'bookmark',
          label: saved ? tr('Saqlanganlardan olib tashlash') : tr('Saqlash'),
          color: saved ? c.brandDeep : undefined,
          onPress: () => { const v = p.toggleFav('project:' + pr.id); toast(v ? tr("Saqlanganlarga qo'shildi") : tr('Saqlanganlardan olib tashlandi'), v ? 'bookmark' : 'bookmark-outline'); },
        }] : []),
        { icon: 'ellipsis-horizontal', label: tr('Amallar'), onPress: () => setMenu(true) },
      ]} />
    </Row>
  );
  const canToggle = mine && (pr.status === 'published' || pr.status === 'paused');
  const active = pr.status === 'published';
  /** Nom (qo'lyozma), soha va holat bitta qatorda; egasi uchun iPhone uslubidagi Faol/Nofaol tugmasi */
  const heroLine = (onColor: boolean) => {
    const fg = onColor ? '#fff' : c.text;
    return (
      <View style={styles.heroLine}>
        <Text style={[styles.heroTitle, { color: fg }]} numberOfLines={2}>{pr.title}</Text>
        <View style={[styles.secPill, { backgroundColor: onColor ? 'rgba(255,255,255,0.22)' : alpha(sec.color, 0.14) }]}>
          <SectorGlyph id={sec.id} size={16} />
          <Text style={[styles.secPillText, { color: onColor ? '#fff' : sec.color }]}>{sec.name}</Text>
        </View>
        {pr.boosted && <Badge label={tr('TOP')} icon="flash" tone="brand" />}
        <View style={{ flex: 1 }} />
        {canToggle ? (
          <View style={styles.toggle}>
            <Text style={[styles.toggleText, { color: active ? (onColor ? '#fff' : c.ok) : (onColor ? 'rgba(255,255,255,0.75)' : c.muted) }]}>{active ? tr('Faol') : tr('Nofaol')}</Text>
            <IOSSwitch value={active} label={tr('Loyiha faolligi')} onChange={v => { p.setProjectActive(pr.id, v); toast(v ? tr('Loyiha yana katalogda') : tr('Loyiha vaqtincha yashirildi'), v ? 'eye' : 'eye-off'); }} />
          </View>
        ) : (mine || staff) ? <StatusBadge status={pr.status} /> : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        {cover ? (
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 12 }}>
            {/* tugmalar rasm ustida emas — alohida qatorda; banner to'liq, yozuvsiz ko'rinadi */}
            {heroButtons}
            <FitImage source={cover} style={[styles.coverBox, { aspectRatio: coverRatio }]} label={pr.title} onAspect={r => setCoverRatio(Math.min(3, Math.max(1.2, r)))} />
            {heroLine(false)}
          </View>
        ) : (
          <View style={[styles.hero, { backgroundColor: sec.color, paddingTop: insets.top + 8 }]}>
            <LinearGradient colors={[sec.color, shade(sec.color, 0.6)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name={sec.icon} size={190} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', right: -30, bottom: -40 }} />
            {heroButtons}
            <View style={{ marginTop: 28 }}>{heroLine(true)}</View>
          </View>
        )}

        <View style={{ padding: 16, gap: 14, marginTop: cover ? 0 : -18 }}>
          <Card style={{ gap: 12 }}>
            <Pressable disabled={!company} onPress={() => company && router.push({ pathname: '/company/[id]', params: { id: company.id } })}>
              <Row>
                {pr.ownerKind === 'company' ? <Logo name={pr.ownerName} color={company?.color ?? c.ok} size={44} /> : <Avatar name={pr.ownerName} size={44} uri={mine ? user?.avatar : undefined} fallback={DEFAULT_AVATAR} />}
                <View style={{ flex: 1 }}>
                  <Row gap={4}><Txt numberOfLines={1} style={styles.handName}>{pr.ownerName}</Txt>{pr.ownerVerified && <Verified />}</Row>
                  <Txt muted style={styles.handSub}>{pr.ownerKind === 'company' ? tr('Kompaniya') : tr('Jismoniy shaxs')} · {ago(pr.createdAt)}</Txt>
                </View>
                {company && <Ionicons name="chevron-forward" size={18} color={c.faint} style={flipRTL()} />}
              </Row>
            </Pressable>
            <Txt style={styles.handBody}>{pr.summary}</Txt>
            <Row gap={16}>
              <Row gap={4}><Ionicons name="eye-outline" size={15} color={c.faint} /><Txt faint style={styles.handMeta}>{tr("{short} ko'rish", { short: short(pr.views) })}</Txt></Row>
              <Row gap={4}><Ionicons name="bookmark-outline" size={15} color={c.faint} /><Txt faint style={styles.handMeta}>{tr('{saves} saqlagan', { saves: pr.saves })}</Txt></Row>
            </Row>
          </Card>

          {mine && pr.status === 'rejected' && (
            <View style={[styles.alert, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="close-circle" size={20} color={c.danger} />
              <View style={{ flex: 1 }}>
                <Txt v="h3" color={c.danger}>{tr('Moderator rad etdi')}</Txt>
                <Txt v="small" color={c.danger}>{tr('{rejectReason}. Tahrirlab qayta yuboring.', { rejectReason: pr.rejectReason ? tr(pr.rejectReason) : tr('Platforma qoidalariga mos emas') })}</Txt>
              </View>
            </View>
          )}
          {mine && pr.status === 'review' && (
            <View style={[styles.alert, { backgroundColor: c.warnSoft }]}>
              <Ionicons name="hourglass" size={20} color={c.warn} />
              <Txt v="small" color={c.warn} style={{ flex: 1, fontFamily: F.bold }}>
                {warn.length ? tr("Loyiha qo'lda tekshiriladi: «{v}» iborasi qoidalarga zid bo'lishi mumkin", { v: warn[0] }) : tr('Moderator tekshirmoqda — odatda bir necha daqiqa')}
              </Txt>
            </View>
          )}

          <KeyValue items={[
            { label: tr('Byudjet'), value: budget(pr.budgetMin, pr.budgetMax), icon: 'cash-outline' },
            { label: tr('Muddat'), value: tr('{n} oy', { n: pr.durationMonths }), icon: 'calendar-outline' },
            { label: tr('Hudud'), value: `${pr.city}, ${k.name}`, icon: 'location-outline', flag: k.code },
            { label: tr('Bosqich'), value: STAGES.find(s => s.id === pr.stage)?.name ?? '', icon: 'git-branch-outline' },
            { label: tr('Jamoa'), value: tr('{n} kishi', { n: pr.team }), icon: 'people-outline' },
            { label: tr('Tillar'), value: pr.languages.map(l => LANGUAGES.find(x => x.id === l)?.name ?? l).join(', '), icon: 'language-outline' },
          ]} />

          <Card style={{ gap: 10 }}>
            <Txt v="h3">{tr('Nima izlanmoqda')}</Txt>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {pr.seeking.map(s => {
                const m = SEEKS.find(x => x.id === s)!;
                return <Badge key={s} label={m.name} icon={m.icon} tone="ok" />;
              })}
            </Row>
          </Card>

          <Card style={{ gap: 8 }}>
            <Txt v="h3">{tr('Loyiha tavsifi')}</Txt>
            <Txt muted style={{ lineHeight: 22 }}>{pr.description}</Txt>
          </Card>

          <Card style={{ gap: 8 }}>
            <Row gap={8}><Ionicons name="flag-outline" size={18} color={sec.color} /><Txt v="h3">{tr('Maqsad')}</Txt></Row>
            <Txt muted style={{ lineHeight: 22 }}>{pr.goal}</Txt>
          </Card>

          <Card style={{ gap: 4, padding: 6 }}>
            <Txt v="h3" style={{ padding: 10, paddingBottom: 4 }}>{tr('Hujjatlar va taqdimot')}</Txt>
            {pr.attachments.length ? pr.attachments.map(a => (
              <ListItem key={a.id} icon={a.name.endsWith('.pdf') ? 'document-text-outline' : 'document-attach-outline'} title={a.name} sub={fileSize(a.size)}
                right={<Ionicons name="download-outline" size={20} color={c.muted} />}
                onPress={() => (a.uri ? Linking.openURL(a.uri).catch(() => toast(tr("Faylni ochib bo'lmadi"), 'alert-circle')) : toast(tr("Fayl muallif ruxsati bilan yuboriladi — so'rov yozing"), 'document-lock'))} />
            )) : <Txt v="small" faint style={{ padding: 10, paddingTop: 0 }}>{tr('Fayllar biriktirilmagan')}</Txt>}
          </Card>

          <Card style={{ gap: 6 }}>
            <Txt v="h3">{tr('Aloqa usuli')}</Txt>
            <Row gap={8}>
              <Ionicons name={pr.contact === 'phone' ? 'call-outline' : pr.contact === 'email' ? 'mail-outline' : 'chatbubbles-outline'} size={18} color={c.muted} />
              <Txt muted>{pr.contact === 'chat' ? tr('YUMS Connect orqali xabar') : pr.contactValue}</Txt>
            </Row>
          </Card>

          <View style={[styles.alert, { backgroundColor: c.surface2 }]}>
            <Ionicons name="information-circle-outline" size={20} color={c.muted} />
            <Txt v="small" muted style={{ flex: 1, lineHeight: 19 }}>{tr("YUMS e'lon ma'lumotlarini avtomatik haqiqat deb qabul qilmaydi. «Tasdiqlangan» belgisi faqat hujjatlar tekshiruvidan keyin beriladi.{v2}", { v2: pr.seeking.includes('investment') ? tr(" Investitsiya qilishdan oldin mustaqil tekshiruv o'tkazing; mablag' qabul qilish faqat litsenziyalangan hamkorlar orqali amalga oshiriladi.") : '' })}
            </Txt>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: c.bg, borderTopColor: c.line }]}>{footer}</View>

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        header={
          <>
            {cover
              ? <FitImage source={cover} style={styles.menuThumb} />
              : <SectorIcon id={sec.id} size={48} />}
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3" numberOfLines={1}>{pr.title}</Txt>
              <Txt v="small" muted numberOfLines={1}>{sec.name} · {budget(pr.budgetMin, pr.budgetMax)}</Txt>
            </View>
          </>
        }
        groups={mine ? [
          [
            { icon: 'share-social-outline', title: tr('Ulashish'), sub: tr('Havolani yuborish'), color: c.accent, onPress: () => { setMenu(false); share(); } },
            { icon: 'create-outline', title: tr('Tahrirlash'), sub: tr("Ma'lumot va bannerni o'zgartirish"), color: c.ok, onPress: () => { setMenu(false); router.push({ pathname: '/project/edit', params: { id: pr.id } }); } },
            ...(pr.status === 'published' && !pr.boosted ? [{ icon: 'flash-outline' as const, title: tr('TOPga chiqarish'), sub: tr("Ko'proq investor va hamkorlar ko'radi"), color: '#E0A800', onPress: () => { setMenu(false); router.push({ pathname: '/plans', params: { boost: pr.id } }); } }] : []),
          ],
          [
            { icon: 'trash-outline', title: tr("Loyihani o'chirish"), sub: tr("Qaytarib bo'lmaydi"), danger: true, onPress: () => {
              setMenu(false);
              confirm(tr("Loyihani o'chirasizmi?"), tr("Bu amalni qaytarib bo'lmaydi."), () => { p.deleteProject(pr.id); toast(tr("Loyiha o'chirildi"), 'trash'); router.back(); }, tr("O'chirish"));
            } },
          ],
        ] : [
          [
            { icon: 'share-social-outline', title: tr('Ulashish'), sub: tr('Havolani yuborish'), color: c.accent, onPress: () => { setMenu(false); share(); } },
            { icon: 'chatbubble-ellipses-outline', title: tr('Muallifga yozish'), sub: pr.ownerName, color: c.ok, onPress: () => { setMenu(false); start(peer, { subject: pr.title }); } },
          ],
          [
            { icon: 'flag-outline', title: tr('Shikoyat qilish'), sub: tr("Qoidalarni buzgan bo'lsa"), danger: true, onPress: () => { setMenu(false); setTimeout(() => setReporting(true), 350); } },
          ],
        ]}
      />
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind="project" id={pr.id} title={pr.title} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 40, overflow: 'hidden' },
  // balandlik rasmning o'z nisbatiga moslanadi (1.2–3), banner to'liq ko'rinadi
  coverBox: { width: '100%', maxHeight: 460, borderRadius: radius.l },
  menuThumb: { width: 64, height: 48, borderRadius: 12 },
  secPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 6, paddingRight: 9, paddingVertical: 4, borderRadius: 9 },
  secPillText: { fontFamily: F.hand, fontSize: 17, lineHeight: 19 },
  heroPill: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  heroPillText: { color: '#fff', fontFamily: F.heavy, fontSize: 11.5 },
  heroLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, rowGap: 6 },
  // Caveat harflari o'ngga qiyshaygan — oxirgi harf kesilmasligi uchun paddingRight
  heroTitle: { color: '#fff', fontSize: 34, fontFamily: F.hand, lineHeight: 38, flexShrink: 1, paddingRight: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontFamily: F.hand, fontSize: 20 },
  // qo'lyozma (Caveat) — kichik harflari Onest'dan maydaroq, shuning uchun o'lchamlar kattaroq
  handName: { fontFamily: F.hand, fontSize: 23, lineHeight: 26, flexShrink: 1, paddingRight: 4 },
  handSub: { fontFamily: F.hand, fontSize: 18, lineHeight: 21 },
  handBody: { fontFamily: F.hand, fontSize: 21, lineHeight: 26 },
  handMeta: { fontFamily: F.hand, fontSize: 17 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.m },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
