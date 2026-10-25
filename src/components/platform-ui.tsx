import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { REPORT_REASONS, type Conversation, SEED_SPECIALISTS, SEEKS, STAGES, STATUS_META, INVESTOR_KINDS, type Company, type Investor, type ListingStatus, type Project, type ReportTarget, type Specialist } from '@/lib/platform-data';
import { coverOf, AD_BANNER } from '@/lib/covers';
import { budget, countryOf, sectorOf, short, usePlatform } from '@/lib/platform';
import { SECTION_ART, SECTION_ART_SCALE } from '@/lib/section-art';
import { PEOPLE_ART } from '@/lib/people-art';
import { SECTOR_ART } from '@/lib/sector-art';
import { COMPANY_LOGOS } from '@/lib/company-logos';
import { haptic, useStore } from '@/lib/store';
import { F, radius, shadow } from '@/lib/theme';

import { toast } from './toast';
import { Avatar, Badge, BrandMark, Button, Card, FitImage, Flag, IconTile, Row, Sheet, Txt, Verified, alpha, shade, type IconName } from './ui';

/* ---------- Kichik bo'laklar ---------- */

/**
 * Kompaniya logotipi: yuklangan rasm → namuna logotip → YUMS emblemasi.
 * `color` endi faqat moslik uchun qoldirilgan.
 */
export function Logo({ name, size = 48, uri }: { name: string; color?: string; size?: number; uri?: string }) {
  const src = uri ? { uri } : COMPANY_LOGOS[name];
  if (!src) return <BrandMark size={size} style={{ borderRadius: size / 3.2 }} />;
  return <Image source={src} style={{ width: size, height: size, borderRadius: size / 3.2, backgroundColor: '#fff' }} contentFit="cover" accessibilityLabel={name} />;
}

/** Rangli shisha katak ichida 3D rasm */
function ArtTile({ art, color, size, scale = 0.8 }: { art: number; color: string; size: number; scale?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: alpha(color, 0.22) }}>
      <LinearGradient colors={[alpha(color, 0.16), alpha(color, 0.05)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={art} style={{ width: size * scale, height: size * scale }} contentFit="contain" />
      </LinearGradient>
    </View>
  );
}

/** Mutaxassis portreti: soha rangidagi yumshoq fonda 3D portret, bo'lmasa bosh harflar */
export function SpecialistAvatar({ sp, size = 52 }: { sp: Pick<Specialist, 'id' | 'name' | 'sector'>; size?: number }) {
  const color = sectorOf(sp.sector).color;
  const art = PEOPLE_ART[sp.id];
  if (!art) return <Avatar name={sp.name} size={size} bg={color} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, overflow: 'hidden' }}>
      <LinearGradient colors={[alpha(color, 0.32), alpha(color, 0.12)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Image source={art} style={{ width: size * 0.9, height: size * 0.9 }} contentFit="contain" accessibilityLabel={sp.name} />
      </LinearGradient>
    </View>
  );
}

export function SectorIcon({ id, size = 44 }: { id: string; size?: number }) {
  const s = sectorOf(id);
  const art = SECTOR_ART[s.id];
  return art ? <ArtTile art={art} color={s.color} size={size} scale={0.84} /> : <IconTile name={s.icon} color={s.color} size={size} />;
}

/** Soha belgisi katak'siz — chiplar, ro'yxatlar va tanlash maydonlari uchun */
export function SectorGlyph({ id, size = 22 }: { id: string; size?: number }) {
  const s = sectorOf(id);
  const art = SECTOR_ART[s.id];
  return art ? <Image source={art} style={{ width: size, height: size }} contentFit="contain" /> : <Ionicons name={s.icon} size={size * 0.8} color={s.color} />;
}

/** Bo'lim belgisi: 3D rasm bo'lsa — rangli shisha katakda, aks holda chiziqli ikonka */
export function SectionArt({ id, icon, color, size = 54 }: { id: string; icon: IconName; color: string; size?: number }) {
  const art = SECTION_ART[id];
  if (!art) return <IconTile name={icon} color={color} size={size} />;
  return <ArtTile art={art} color={color} size={size} scale={SECTION_ART_SCALE[id]} />;
}

export function StatusBadge({ status }: { status: ListingStatus }) {
  const m = STATUS_META[status];
  return <Badge label={m.name} icon={m.icon} tone={m.tone} />;
}

export function FavButton({ k, style, size = 22, round }: { k: string; style?: StyleProp<ViewStyle>; size?: number; round?: boolean }) {
  const { colors: c } = useStore();
  const { isFav, toggleFav } = usePlatform();
  const on = isFav(k);
  return (
    <Pressable
      hitSlop={10}
      accessibilityLabel={on ? 'Saqlanganlardan olib tashlash' : 'Saqlash'}
      onPress={() => { haptic.tap(); const v = toggleFav(k); toast(v ? 'Saqlanganlarga qo\'shildi' : 'Saqlanganlardan olib tashlandi', v ? 'bookmark' : 'bookmark-outline'); }}
      style={[round && [styles.favRound, { backgroundColor: on ? c.brandSoft : c.surface2 }], style]}>
      <Ionicons name={on ? 'bookmark' : 'bookmark-outline'} size={round ? 17 : size} color={on ? c.brandDeep : c.muted} />
    </Pressable>
  );
}

/** Bayroq + joy nomi: «[🇺🇿] Toshkent, O'zbekiston». before/after — qo'shimcha matn */
export function Place({ code, city, before, after, faint }: { code: string; city?: string; before?: string; after?: string; faint?: boolean }) {
  const k = countryOf(code);
  return (
    <Row gap={6} style={{ flexShrink: 1 }}>
      {before ? <Txt v="small" muted={!faint} faint={faint} numberOfLines={1}>{before}</Txt> : null}
      <Flag code={k.code} size={18} />
      <Txt v="small" muted={!faint} faint={faint} numberOfLines={1} style={{ flexShrink: 1 }}>{city ? `${city}, ` : ''}{k.name}{after ?? ''}</Txt>
    </Row>
  );
}

const stageName = (id: string) => STAGES.find(s => s.id === id)?.name ?? id;

/* ---------- Loyiha kartalari ---------- */

export function ProjectCard({ p, mine }: { p: Project; mine?: boolean }) {
  const { colors: c } = useStore();
  const sec = sectorOf(p.sector);
  const cover = coverOf(p);
  return (
    <Card onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })} style={{ gap: 10, overflow: 'hidden' }}>
      {cover ? <FitImage source={cover} style={styles.cardCover} label={p.title} /> : null}
      <Row>
        <SectorIcon id={p.sector} />
        <View style={{ flex: 1 }}>
          <Txt v="tiny" color={sec.color} numberOfLines={1}>{sec.name.toUpperCase()}</Txt>
          <Row gap={4}>
            <Txt v="small" muted numberOfLines={1} style={{ flexShrink: 1 }}>{p.ownerName}</Txt>
            {p.ownerVerified && <Verified size={13} />}
          </Row>
        </View>
        {mine ? <StatusBadge status={p.status} /> : <FavButton k={'project:' + p.id} round />}
      </Row>
      <View style={{ gap: 4 }}>
        <Txt v="h3" numberOfLines={2}>{p.title}</Txt>
        <Txt v="small" muted numberOfLines={2} style={{ lineHeight: 19 }}>{p.summary}</Txt>
      </View>
      <View style={styles.wrap}>
        {p.boosted && <Badge label="TOP" icon="flash" tone="brand" />}
        <Badge label={stageName(p.stage)} tone="accent" />
        {p.seeking.slice(0, 2).map(s => <Badge key={s} label={SEEKS.find(x => x.id === s)?.name ?? s} />)}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}><Place code={p.country} city={p.city} /></View>
        <Txt v="h3" style={{ fontSize: 14.5 }}>{budget(p.budgetMin, p.budgetMax)}</Txt>
      </Row>
      {mine && p.status === 'rejected' && p.rejectReason ? (
        <View style={[styles.note, { backgroundColor: c.dangerSoft }]}>
          <Ionicons name="alert-circle" size={16} color={c.danger} />
          <Txt v="small" color={c.danger} style={{ flex: 1 }}>{p.rejectReason}</Txt>
        </View>
      ) : null}
    </Card>
  );
}

/** Gorizontal karuseldagi ixcham karta */
export function ProjectTile({ p }: { p: Project }) {
  const { colors: c } = useStore();
  const sec = sectorOf(p.sector);
  const cover = coverOf(p);
  return (
    <Pressable
      onPress={() => { haptic.tap(); router.push({ pathname: '/project/[id]', params: { id: p.id } }); }}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.surface, borderColor: c.line, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow(c, 0.25)]}>
      <LinearGradient colors={[sec.color, shade(sec.color)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tileTop, cover ? styles.tileCover : null]}>
        {cover ? (
          // banner o'zi to'liq dizayn — ustiga yozuv qo'ymaymiz
          <FitImage source={cover} style={StyleSheet.absoluteFill} label={p.title} />
        ) : (
          <>
            <Ionicons name={sec.icon} size={96} color="rgba(255,255,255,0.13)" style={{ position: 'absolute', right: -10, bottom: -18 }} />
            <Row gap={6}>
              {p.boosted && <View style={styles.topBadge}><Ionicons name="flash" size={11} color="#0E1525" /><Text style={styles.topBadgeText}>TOP</Text></View>}
              <View style={[styles.topBadge, { backgroundColor: 'rgba(255,255,255,0.9)' }]}><Text style={styles.topBadgeText}>{stageName(p.stage)}</Text></View>
            </Row>
            <Text style={styles.tileSector} numberOfLines={1}>{sec.name}</Text>
          </>
        )}
      </LinearGradient>
      <View style={{ padding: 14, gap: 6, flex: 1 }}>
        <Txt v="h3" numberOfLines={2} style={{ minHeight: 42 }}>{p.title}</Txt>
        <Row gap={4}>
          <Flag code={p.country} size={16} />
          <Txt v="small" muted numberOfLines={1} style={{ flexShrink: 1 }}>{p.ownerName}</Txt>
          {p.ownerVerified && <Verified size={13} />}
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 'auto' }}>
          <Txt v="h3" style={{ fontSize: 14.5 }}>{budget(p.budgetMin, p.budgetMax)}</Txt>
          <Row gap={3}><Ionicons name="eye-outline" size={14} color={c.faint} /><Txt v="tiny" faint>{short(p.views)}</Txt></Row>
        </Row>
      </View>
    </Pressable>
  );
}

/* ---------- Kompaniya, mutaxassis, investor, bozor ---------- */

export function CompanyCard({ co }: { co: Company }) {
  const { colors: c } = useStore();
  return (
    <Card onPress={() => router.push({ pathname: '/company/[id]', params: { id: co.id } })} style={{ gap: 10 }}>
      <Row>
        <Logo name={co.name} color={co.color} />
        <View style={{ flex: 1 }}>
          <Row gap={4}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{co.name}</Txt>{co.verified && <Verified />}</Row>
          <Place code={co.country} city={co.city} />
        </View>
        <FavButton k={'company:' + co.id} round />
      </Row>
      <Txt v="small" muted numberOfLines={2} style={{ lineHeight: 19 }}>{co.about}</Txt>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={styles.wrap}>
          <Badge label={sectorOf(co.sector).name} />
          {co.plan === 'business' && <Badge label="Business" tone="violet" icon="diamond" />}
        </View>
        <Row gap={3}><Ionicons name="star" size={14} color="#F5A524" /><Txt v="small" style={{ fontFamily: F.heavy }}>{co.rating.toFixed(1)}</Txt></Row>
      </Row>
      {co.offers.length ? (
        <View style={[styles.note, { backgroundColor: c.okSoft }]}>
          <Ionicons name="hand-left-outline" size={16} color={c.ok} />
          <Txt v="small" color={c.ok} style={{ flex: 1, fontFamily: F.bold }} numberOfLines={1}>B2B: {co.offers[0].title}</Txt>
        </View>
      ) : null}
    </Card>
  );
}

export function SpecialistCard({ sp }: { sp: Specialist }) {
  const { colors: c } = useStore();
  return (
    <Card onPress={() => router.push({ pathname: '/specialist/[id]', params: { id: sp.id } })} style={{ gap: 10 }}>
      <Row>
        <View>
          <SpecialistAvatar sp={sp} size={52} />
          <View style={[styles.dot, { backgroundColor: sp.available ? c.ok : c.faint, borderColor: c.surface }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Row gap={4}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{sp.name}</Txt>{sp.verified && <Verified />}</Row>
          <Txt v="small" muted numberOfLines={1}>{sp.title}</Txt>
          <Place code={sp.country} city={sp.city} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="h3">${sp.rate}</Txt>
          <Txt v="tiny" faint>soatiga</Txt>
        </View>
      </Row>
      <View style={styles.wrap}>
        {sp.skills.slice(0, 4).map(s => <Badge key={s} label={s} />)}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={3}><Ionicons name="star" size={14} color="#F5A524" /><Txt v="small" style={{ fontFamily: F.heavy }}>{sp.rating.toFixed(1)}</Txt><Txt v="small" faint>({sp.reviews})</Txt></Row>
        <Txt v="small" color={sp.available ? c.ok : c.faint} style={{ fontFamily: F.bold }}>{sp.available ? (sp.remote ? 'Masofaviy · bo\'sh' : 'Bo\'sh') : 'Band'}</Txt>
      </Row>
    </Card>
  );
}

export function SpecialistMini({ sp }: { sp: Specialist }) {
  const { colors: c } = useStore();
  return (
    <Pressable
      onPress={() => { haptic.tap(); router.push({ pathname: '/specialist/[id]', params: { id: sp.id } }); }}
      style={({ pressed }) => [styles.mini, { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 }, shadow(c, 0.5)]}>
      <SpecialistAvatar sp={sp} size={56} />
      <Row gap={3}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1, fontSize: 14.5 }}>{sp.name.split(' ')[0]}</Txt>{sp.verified && <Verified size={13} />}</Row>
      <Txt v="tiny" faint numberOfLines={2} style={{ textAlign: 'center', minHeight: 28 }}>{sp.title}</Txt>
      <Row gap={3}><Ionicons name="star" size={12} color="#F5A524" /><Txt v="tiny">{sp.rating.toFixed(1)} · ${sp.rate}/s</Txt></Row>
    </Pressable>
  );
}

export function InvestorCard({ inv, onContact }: { inv: Investor; onContact: () => void }) {
  const { colors: c } = useStore();
  return (
    <Card style={{ gap: 10 }}>
      <Row>
        <Logo name={inv.name} color={c.violet} size={46} />
        <View style={{ flex: 1 }}>
          <Row gap={4}><Txt v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{inv.name}</Txt>{inv.verified && <Verified />}</Row>
          <Place code={inv.country} before={`${INVESTOR_KINDS[inv.kind]} ·`} />
        </View>
        <FavButton k={'investor:' + inv.id} round />
      </Row>
      <Txt v="small" muted style={{ lineHeight: 19 }}>{inv.about}</Txt>
      <Row gap={10}>
        <View style={[styles.kv, { backgroundColor: c.surface2 }]}>
          <Txt v="tiny" faint>Chek</Txt>
          <Txt v="h3" style={{ fontSize: 14 }}>{budget(inv.ticketMin, inv.ticketMax)}</Txt>
        </View>
        <View style={[styles.kv, { backgroundColor: c.surface2 }]}>
          <Txt v="tiny" faint>Bitimlar</Txt>
          <Txt v="h3" style={{ fontSize: 14 }}>{inv.deals}</Txt>
        </View>
      </Row>
      <View style={styles.wrap}>
        {inv.licensed ? <Badge label="Litsenziyali" icon="shield-checkmark" tone="ok" /> : <Badge label="Xususiy investor" icon="person" />}
        {inv.sectors.slice(0, 3).map(s => <Badge key={s} label={sectorOf(s).name} />)}
      </View>
      <Button title="Taklif yuborish" icon="paper-plane" kind="dark" small onPress={onContact} />
    </Card>
  );
}

export { MarketCard, MarketVisual } from './market-ui';

/* ---------- Suhbatdosh ---------- */

export const PEER_LABEL: Record<Conversation['peerKind'], string> = {
  company: 'Kompaniya', person: 'Foydalanuvchi', investor: 'Investor', specialist: 'Mutaxassis', support: 'YUMS',
};

export function PeerAvatar({ conv, size = 50 }: { conv: Conversation; size?: number }) {
  const { colors: c } = useStore();
  if (conv.peerKind === 'support') {
    return <BrandMark size={size} style={{ borderRadius: size / 3 }} />;
  }
  if (conv.peerKind === 'company' || conv.peerKind === 'investor') return <Logo name={conv.peerName} color={conv.peerKind === 'investor' ? c.violet : c.ok} size={size} />;
  const sp = conv.peerKind === 'specialist' ? SEED_SPECIALISTS.find(x => x.id === conv.peerId) : undefined;
  if (sp) return <SpecialistAvatar sp={sp} size={size} />;
  return <Avatar name={conv.peerName} size={size} bg={c.accent} />;
}

/* ---------- Reklama ---------- */

/** Reklama banneri — 2:1 nisbat; faol kampaniya rasmi bo'lsa o'sha ko'rsatiladi */
export function AdBanner() {
  const { colors: c, t } = useStore();
  const { ads } = usePlatform();
  const own = ads.find(a => a.status === 'active' && a.image);
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={() => { haptic.tap(); if (own) router.push('/plans'); else router.push({ pathname: '/company/[id]', params: { id: 'c20' } }); }}
        style={({ pressed }) => [styles.ad, { opacity: pressed ? 0.92 : 1 }]}
        accessibilityLabel={`${t('home.ad')}: ${own ? own.title : 'Silk Road Logistics'}`}>
        {own ? (
          <>
            <Image source={{ uri: own.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
            <View style={styles.adChip}><Text style={styles.adChipText}>{t('home.ad').toUpperCase()}</Text></View>
            <Text style={[styles.adTitle, styles.adBottom]} numberOfLines={2}>{own.title}</Text>
          </>
        ) : (
          <>
            <Image source={AD_BANNER} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.adChipCorner}><Text style={styles.adChipText}>{t('home.ad').toUpperCase()}</Text></View>
          </>
        )}
      </Pressable>
      <Pressable onPress={() => { haptic.tap(); router.push('/plans'); }} hitSlop={6} style={{ alignSelf: 'flex-end' }}>
        <Row gap={4}>
          <Ionicons name="megaphone-outline" size={13} color={c.faint} />
          <Txt v="tiny" faint>Reklama joylashtirish</Txt>
        </Row>
      </Pressable>
    </View>
  );
}

/* ---------- Shikoyat ---------- */

export function ReportSheet({ visible, onClose, kind, id, title }: { visible: boolean; onClose: () => void; kind: ReportTarget; id: string; title: string }) {
  const { colors: c } = useStore();
  const { report } = usePlatform();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const send = () => {
    if (!reason) return;
    report({ targetKind: kind, targetId: id, targetTitle: title, reason, note: note.trim() || undefined });
    setReason(null); setNote('');
    onClose();
    toast("Shikoyat moderatorlarga yuborildi", 'shield-checkmark');
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Shikoyat qilish" footer={<Button title="Yuborish" kind="danger" disabled={!reason} onPress={send} />}>
      <Txt v="small" muted>«{title}» — sababni tanlang. Moderatorlar 24 soat ichida ko'rib chiqadi, shikoyatchi ma'lumotlari sir saqlanadi.</Txt>
      <View style={{ gap: 4 }}>
        {REPORT_REASONS.map(r => {
          const on = r === reason;
          return (
            <Pressable key={r} onPress={() => { haptic.tap(); setReason(r); }} style={[styles.option, { backgroundColor: on ? c.dangerSoft : 'transparent' }]}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? c.danger : c.faint} />
              <Txt style={{ flex: 1 }}>{r}</Txt>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Qo'shimcha izoh (ixtiyoriy)"
        placeholderTextColor={c.faint}
        multiline
        style={[styles.input, { backgroundColor: c.surface2, color: c.text }]}
      />
    </Sheet>
  );
}

/* ---------- Tanlash oynasi (mamlakat, soha, til) ---------- */

export type PickOption = { id: string; label: string; icon?: IconName; emoji?: string; flag?: string; art?: number; sub?: string };

export function PickerSheet({ visible, onClose, title, options, selected, onChange, multi }: {
  visible: boolean; onClose: () => void; title: string; options: PickOption[]; selected: string[]; onChange: (ids: string[]) => void; multi?: boolean;
}) {
  const { colors: c } = useStore();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter(o => (o.label + ' ' + (o.sub ?? '')).toLowerCase().includes(t)) : options;
  }, [q, options]);
  const pick = (id: string) => {
    haptic.tap();
    if (!multi) { onChange([id]); onClose(); return; }
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={title} footer={multi ? <Button title={`Tayyor${selected.length ? ` · ${selected.length}` : ''}`} onPress={onClose} /> : undefined}>
      {options.length > 8 && (
        <View style={[styles.pickSearch, { backgroundColor: c.surface2 }]}>
          <Ionicons name="search" size={18} color={c.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Qidirish" placeholderTextColor={c.faint} style={{ flex: 1, minWidth: 0, color: c.text, fontSize: 15, fontFamily: F.semi, height: '100%' }} />
        </View>
      )}
      <View style={{ gap: 2 }}>
        {list.map(o => {
          const on = selected.includes(o.id);
          return (
            <Pressable key={o.id} onPress={() => pick(o.id)} style={[styles.option, { backgroundColor: on ? c.brandSoft : 'transparent' }]}>
              {o.flag ? <Flag code={o.flag} size={28} /> : o.art ? <Image source={o.art} style={{ width: 30, height: 30 }} contentFit="contain" /> : o.emoji ? <Text style={{ fontSize: 22 }}>{o.emoji}</Text> : o.icon ? <Ionicons name={o.icon} size={20} color={c.text} /> : null}
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: on ? F.heavy : F.semi }}>{o.label}</Txt>
                {o.sub ? <Txt v="tiny" faint numberOfLines={1}>{o.sub}</Txt> : null}
              </View>
              {on && <Ionicons name={multi ? 'checkbox' : 'checkmark'} size={20} color={c.brandDeep} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Tanlangan qiymatni ko'rsatuvchi maydon — bosilganda PickerSheet ochadi */
export function SelectField({ label, value, placeholder, onPress, icon, left }: { label: string; value?: string; placeholder: string; onPress: () => void; icon?: IconName; left?: ReactNode }) {
  const { colors: c } = useStore();
  return (
    <View style={{ gap: 6 }}>
      <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{label}</Txt>
      <Pressable onPress={() => { haptic.tap(); onPress(); }} style={[styles.select, { backgroundColor: c.surface2, borderColor: c.line }]}>
        {left ?? (icon && <Ionicons name={icon} size={18} color={c.muted} />)}
        <Txt style={{ flex: 1, fontFamily: F.semi }} muted={!value} numberOfLines={1}>{value || placeholder}</Txt>
        <Ionicons name="chevron-down" size={18} color={c.faint} />
      </Pressable>
    </View>
  );
}

export function KeyValue({ items }: { items: { label: string; value: string; icon?: IconName; flag?: string }[] }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.kvGrid}>
      {items.map(it => (
        <View key={it.label} style={[styles.kvCell, { backgroundColor: c.surface2 }]}>
          <Row gap={6}>
            {it.icon && <Ionicons name={it.icon} size={14} color={c.muted} />}
            <Txt v="tiny" faint>{it.label}</Txt>
          </Row>
          <Row gap={6}>
            {it.flag ? <Flag code={it.flag} size={18} /> : null}
            <Txt v="h3" style={{ fontSize: 14.5, flexShrink: 1 }} numberOfLines={2}>{it.value}</Txt>
          </Row>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
  tile: { width: 262, borderRadius: radius.l, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  cardCover: { marginTop: -16, marginHorizontal: -16, marginBottom: 2, aspectRatio: 16 / 9 },
  favRound: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tileTop: { height: 130, padding: 14, justifyContent: 'space-between', overflow: 'hidden' },
  tileCover: { height: (262 * 9) / 16, padding: 0 },
  topBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFC800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  topBadgeText: { color: '#0E1525', fontSize: 11, fontFamily: F.heavy },
  tileSector: { color: '#fff', fontFamily: F.heavy, fontSize: 13, opacity: 0.95 },
  dot: { position: 'absolute', right: -2, bottom: -2, width: 15, height: 15, borderRadius: 8, borderWidth: 3 },
  mini: { width: 128, padding: 12, borderRadius: radius.l, alignItems: 'center', gap: 4 },
  kv: { flex: 1, padding: 10, borderRadius: 14, gap: 2 },
  ad: { width: '100%', aspectRatio: 2, borderRadius: radius.l, overflow: 'hidden', backgroundColor: '#0B1530' },
  adChip: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.45)' },
  adChipCorner: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.45)' },
  adChipText: { color: 'rgba(255,255,255,0.9)', fontSize: 9.5, fontFamily: F.heavy, letterSpacing: 1 },
  adBottom: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  adTitle: { color: '#fff', fontSize: 20, fontFamily: F.display, letterSpacing: -0.6, lineHeight: 25 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14 },
  input: { minHeight: 80, borderRadius: 16, padding: 14, fontSize: 15, textAlignVertical: 'top' },
  pickSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, paddingHorizontal: 12 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: radius.m, borderWidth: 1.5, paddingHorizontal: 14 },
  kvGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kvCell: { flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 14, gap: 4 },
});
