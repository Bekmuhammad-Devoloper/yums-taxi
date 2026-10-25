import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FavButton, KeyValue, Logo, ReportSheet, SectorGlyph, StatusBadge } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { alpha, Avatar, Badge, Button, Card, DEFAULT_AVATAR, EmptyState, FitImage, IconButton, ListItem, Row, Screen, shade, Sheet, Txt, Verified } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { confirm } from '@/lib/confirm';
import { coverOf } from '@/lib/covers';
import { LANGUAGES, SEEKS, STAGES } from '@/lib/platform-data';
import { ago, budget, countryOf, fileSize, flagged, sectorOf, short, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';

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
    return <Screen title="Loyiha"><EmptyState icon="alert-circle-outline" title="Loyiha topilmadi" sub="U o'chirilgan, moderatsiyada yoki bloklangan bo'lishi mumkin" action="Katalogga qaytish" onAction={() => router.replace('/projects')} /></Screen>;
  }

  const sec = sectorOf(pr.sector);
  const k = countryOf(pr.country);
  const company = p.companies.find(x => x.id === pr.ownerId);
  const peer = { peerId: pr.ownerId, peerName: pr.ownerName, peerKind: pr.ownerKind === 'company' ? 'company' as const : 'person' as const, peerVerified: pr.ownerVerified };
  const warn = flagged(pr.title, pr.summary, pr.description);

  const share = () => Share.share({ message: `YUMS: ${pr.title}\n${pr.summary}\nhttps://yums.example/p/${pr.id}` }).catch(() => {});
  const contact = () => {
    if (pr.contact === 'email' && pr.contactValue) Linking.openURL(`mailto:${pr.contactValue}?subject=${encodeURIComponent('YUMS: ' + pr.title)}`).catch(() => toast('Pochta ilovasi topilmadi', 'mail'));
    else if (pr.contact === 'phone' && pr.contactValue) Linking.openURL(`tel:${pr.contactValue.replace(/\s/g, '')}`).catch(() => {});
    else start(peer, { subject: pr.title });
  };

  const footer = mine ? (
    <Row gap={10}>
      <Button title="Tahrirlash" kind="ghost" icon="create-outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/project/edit', params: { id: pr.id } })} />
      {pr.status === 'published' ? (
        <Button title={pr.boosted ? 'TOPda' : 'TOPga chiqarish'} icon="flash" disabled={pr.boosted} style={{ flex: 1.3 }} onPress={() => {
          if (p.boostCredits > 0) { p.boostProject(pr.id); toast('Loyiha TOPga chiqarildi — tarif krediti ishlatildi', 'flash'); }
          else router.push({ pathname: '/plans', params: { boost: pr.id } });
        }} />
      ) : pr.status === 'draft' || pr.status === 'rejected' ? (
        <Button title="Yuborish" icon="send" style={{ flex: 1.3 }} onPress={() => { p.submitProject(pr.id); toast("Loyiha moderatsiyaga yuborildi", 'hourglass'); }} />
      ) : (
        <Button title="Moderatsiyada" icon="hourglass-outline" disabled style={{ flex: 1.3 }} />
      )}
    </Row>
  ) : (
    <Row gap={10}>
      <Button title="Hamkorlik so'rovi" kind="ghost" icon="people-outline" style={{ flex: 1 }} onPress={() => start(peer, { request: true, subject: `«${pr.title}» bo'yicha hamkorlik` })} />
      <Button
        title={pr.contact === 'phone' ? "Qo'ng'iroq" : pr.contact === 'email' ? 'Email yozish' : 'Yozish'}
        icon={pr.contact === 'phone' ? 'call' : pr.contact === 'email' ? 'mail' : 'chatbubble-ellipses'}
        style={{ flex: 1 }}
        onPress={contact}
      />
    </Row>
  );

  const cover = coverOf(pr);
  const heroButtons = (
    <Row style={{ justifyContent: 'space-between' }}>
      <IconButton name="chevron-back" size={42} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Row gap={8}>
        <IconButton name="share-outline" size={42} onPress={share} />
        {!mine && <View style={[styles.favWrap, { backgroundColor: c.surface }]}><FavButton k={'project:' + pr.id} /></View>}
        <IconButton name="ellipsis-horizontal" size={42} onPress={() => setMenu(true)} />
      </Row>
    </Row>
  );
  const heroTitle = (
    <View style={{ gap: 8 }}>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {(mine || staff) && <StatusBadge status={pr.status} />}
        {pr.boosted && <Badge label="TOP" icon="flash" tone="brand" />}
        <View style={styles.heroPill}><Text style={styles.heroPillText}>{sec.name}</Text></View>
      </Row>
      <Text style={styles.heroTitle}>{pr.title}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        {cover ? (
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 12 }}>
            {/* tugmalar rasm ustida emas — alohida qatorda; banner to'liq, yozuvsiz ko'rinadi */}
            {heroButtons}
            <FitImage source={cover} style={[styles.coverBox, { aspectRatio: coverRatio }]} label={pr.title} onAspect={r => setCoverRatio(Math.min(3, Math.max(1.2, r)))} />
            <View style={{ gap: 8, paddingHorizontal: 2 }}>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {(mine || staff) && <StatusBadge status={pr.status} />}
                {pr.boosted && <Badge label="TOP" icon="flash" tone="brand" />}
                <View style={[styles.secPill, { backgroundColor: alpha(sec.color, 0.14) }]}>
                  <SectorGlyph id={sec.id} size={16} />
                  <Text style={[styles.secPillText, { color: sec.color }]}>{sec.name}</Text>
                </View>
              </Row>
              <Text style={[styles.heroTitle, { color: c.text }]}>{pr.title}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.hero, { backgroundColor: sec.color, paddingTop: insets.top + 8 }]}>
            <LinearGradient colors={[sec.color, shade(sec.color, 0.6)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name={sec.icon} size={190} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', right: -30, bottom: -40 }} />
            {heroButtons}
            <View style={{ marginTop: 28 }}>{heroTitle}</View>
          </View>
        )}

        <View style={{ padding: 16, gap: 14, marginTop: cover ? 0 : -18 }}>
          <Card style={{ gap: 12 }}>
            <Pressable disabled={!company} onPress={() => company && router.push({ pathname: '/company/[id]', params: { id: company.id } })}>
              <Row>
                {pr.ownerKind === 'company' ? <Logo name={pr.ownerName} color={company?.color ?? c.ok} size={44} /> : <Avatar name={pr.ownerName} size={44} uri={mine ? user?.avatar : undefined} fallback={DEFAULT_AVATAR} />}
                <View style={{ flex: 1 }}>
                  <Row gap={4}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{pr.ownerName}</Txt>{pr.ownerVerified && <Verified />}</Row>
                  <Txt v="small" muted>{pr.ownerKind === 'company' ? 'Kompaniya' : 'Jismoniy shaxs'} · {ago(pr.createdAt)}</Txt>
                </View>
                {company && <Ionicons name="chevron-forward" size={18} color={c.faint} />}
              </Row>
            </Pressable>
            <Txt style={{ lineHeight: 22 }}>{pr.summary}</Txt>
            <Row gap={16}>
              <Row gap={4}><Ionicons name="eye-outline" size={15} color={c.faint} /><Txt v="small" faint>{short(pr.views)} ko'rish</Txt></Row>
              <Row gap={4}><Ionicons name="bookmark-outline" size={15} color={c.faint} /><Txt v="small" faint>{pr.saves} saqlagan</Txt></Row>
            </Row>
          </Card>

          {mine && pr.status === 'rejected' && (
            <View style={[styles.alert, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="close-circle" size={20} color={c.danger} />
              <View style={{ flex: 1 }}>
                <Txt v="h3" color={c.danger}>Moderator rad etdi</Txt>
                <Txt v="small" color={c.danger}>{pr.rejectReason ?? 'Platforma qoidalariga mos emas'}. Tahrirlab qayta yuboring.</Txt>
              </View>
            </View>
          )}
          {mine && pr.status === 'review' && (
            <View style={[styles.alert, { backgroundColor: c.warnSoft }]}>
              <Ionicons name="hourglass" size={20} color={c.warn} />
              <Txt v="small" color={c.warn} style={{ flex: 1, fontFamily: F.bold }}>
                {warn.length ? `Loyiha qo'lda tekshiriladi: «${warn[0]}» iborasi qoidalarga zid bo'lishi mumkin` : "Moderator tekshirmoqda — odatda bir necha daqiqa"}
              </Txt>
            </View>
          )}

          <KeyValue items={[
            { label: 'Byudjet', value: budget(pr.budgetMin, pr.budgetMax), icon: 'cash-outline' },
            { label: 'Muddat', value: `${pr.durationMonths} oy`, icon: 'calendar-outline' },
            { label: 'Hudud', value: `${pr.city}, ${k.name}`, icon: 'location-outline', flag: k.code },
            { label: 'Bosqich', value: STAGES.find(s => s.id === pr.stage)?.name ?? '', icon: 'git-branch-outline' },
            { label: 'Jamoa', value: `${pr.team} kishi`, icon: 'people-outline' },
            { label: 'Tillar', value: pr.languages.map(l => LANGUAGES.find(x => x.id === l)?.name ?? l).join(', '), icon: 'language-outline' },
          ]} />

          <Card style={{ gap: 10 }}>
            <Txt v="h3">Nima izlanmoqda</Txt>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {pr.seeking.map(s => {
                const m = SEEKS.find(x => x.id === s)!;
                return <Badge key={s} label={m.name} icon={m.icon} tone="ok" />;
              })}
            </Row>
          </Card>

          <Card style={{ gap: 8 }}>
            <Txt v="h3">Loyiha tavsifi</Txt>
            <Txt muted style={{ lineHeight: 22 }}>{pr.description}</Txt>
          </Card>

          <Card style={{ gap: 8 }}>
            <Row gap={8}><Ionicons name="flag-outline" size={18} color={sec.color} /><Txt v="h3">Maqsad</Txt></Row>
            <Txt muted style={{ lineHeight: 22 }}>{pr.goal}</Txt>
          </Card>

          <Card style={{ gap: 4, padding: 6 }}>
            <Txt v="h3" style={{ padding: 10, paddingBottom: 4 }}>Hujjatlar va taqdimot</Txt>
            {pr.attachments.length ? pr.attachments.map(a => (
              <ListItem key={a.id} icon={a.name.endsWith('.pdf') ? 'document-text-outline' : 'document-attach-outline'} title={a.name} sub={fileSize(a.size)}
                right={<Ionicons name="download-outline" size={20} color={c.muted} />}
                onPress={() => (a.uri ? Linking.openURL(a.uri).catch(() => toast('Faylni ochib bo\'lmadi', 'alert-circle')) : toast('Fayl muallif ruxsati bilan yuboriladi — so\'rov yozing', 'document-lock'))} />
            )) : <Txt v="small" faint style={{ padding: 10, paddingTop: 0 }}>Fayllar biriktirilmagan</Txt>}
          </Card>

          <Card style={{ gap: 6 }}>
            <Txt v="h3">Aloqa usuli</Txt>
            <Row gap={8}>
              <Ionicons name={pr.contact === 'phone' ? 'call-outline' : pr.contact === 'email' ? 'mail-outline' : 'chatbubbles-outline'} size={18} color={c.muted} />
              <Txt muted>{pr.contact === 'chat' ? 'YUMS Connect orqali xabar' : pr.contactValue}</Txt>
            </Row>
          </Card>

          <View style={[styles.alert, { backgroundColor: c.surface2 }]}>
            <Ionicons name="information-circle-outline" size={20} color={c.muted} />
            <Txt v="small" muted style={{ flex: 1, lineHeight: 19 }}>
              YUMS e'lon ma'lumotlarini avtomatik haqiqat deb qabul qilmaydi. «Tasdiqlangan» belgisi faqat hujjatlar tekshiruvidan keyin beriladi.
              {pr.seeking.includes('investment') ? " Investitsiya qilishdan oldin mustaqil tekshiruv o'tkazing; mablag' qabul qilish faqat litsenziyalangan hamkorlar orqali amalga oshiriladi." : ''}
            </Txt>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: c.bg, borderTopColor: c.line }]}>{footer}</View>

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Amallar">
        <View style={{ gap: 2 }}>
          <ListItem icon="share-social-outline" title="Ulashish" onPress={() => { setMenu(false); share(); }} />
          {mine ? (
            <>
              <ListItem icon="create-outline" title="Tahrirlash" onPress={() => { setMenu(false); router.push({ pathname: '/project/edit', params: { id: pr.id } }); }} />
              <ListItem icon="trash-outline" title="Loyihani o'chirish" danger onPress={() => {
                setMenu(false);
                confirm("Loyihani o'chirasizmi?", "Bu amalni qaytarib bo'lmaydi.", () => { p.deleteProject(pr.id); toast("Loyiha o'chirildi", 'trash'); router.back(); }, "O'chirish");
              }} />
            </>
          ) : (
            <>
              <ListItem icon="chatbubble-ellipses-outline" title="Muallifga yozish" onPress={() => { setMenu(false); start(peer, { subject: pr.title }); }} />
              <ListItem icon="flag-outline" title="Shikoyat qilish" danger onPress={() => { setMenu(false); setTimeout(() => setReporting(true), 350); }} />
            </>
          )}
        </View>
      </Sheet>
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind="project" id={pr.id} title={pr.title} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 40, overflow: 'hidden' },
  // balandlik rasmning o'z nisbatiga moslanadi (1.2–3), banner to'liq ko'rinadi
  coverBox: { width: '100%', maxHeight: 460, borderRadius: radius.l },
  secPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 6, paddingRight: 9, paddingVertical: 4, borderRadius: 9 },
  secPillText: { fontFamily: F.heavy, fontSize: 11.5 },
  heroPill: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  heroPillText: { color: '#fff', fontFamily: F.heavy, fontSize: 11.5 },
  heroTitle: { color: '#fff', fontSize: 23, fontFamily: F.display, letterSpacing: -0.7, lineHeight: 29 },
  favWrap: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.m },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
