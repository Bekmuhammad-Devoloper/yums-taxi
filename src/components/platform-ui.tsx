import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { REPORT_REASONS, type Conversation, SEEKS, STAGES, STATUS_META, INVESTOR_KINDS, type Company, type Investor, type ListingStatus, type MarketItem, type Project, type ReportTarget, type Specialist } from '@/lib/platform-data';
import { budget, countryOf, sectorOf, short, usd, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F, radius, shadow } from '@/lib/theme';

import { toast } from './toast';
import { Avatar, Badge, Button, Card, IconTile, Row, Sheet, Txt, Verified, shade, type IconName } from './ui';

/* ---------- Kichik bo'laklar ---------- */

export function Logo({ name, color, size = 48 }: { name: string; color: string; size?: number }) {
  const init = name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3.2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: F.heavy, fontSize: size * 0.36 }}>{init}</Text>
    </View>
  );
}

export function SectorIcon({ id, size = 44 }: { id: string; size?: number }) {
  const s = sectorOf(id);
  return <IconTile name={s.icon} color={s.color} size={size} />;
}

export function StatusBadge({ status }: { status: ListingStatus }) {
  const m = STATUS_META[status];
  return <Badge label={m.name} icon={m.icon} tone={m.tone} />;
}

export function FavButton({ k, style, size = 22 }: { k: string; style?: StyleProp<ViewStyle>; size?: number }) {
  const { colors: c } = useStore();
  const { isFav, toggleFav } = usePlatform();
  const on = isFav(k);
  return (
    <Pressable
      hitSlop={10}
      accessibilityLabel={on ? 'Saqlanganlardan olib tashlash' : 'Saqlash'}
      onPress={() => { haptic.tap(); const v = toggleFav(k); toast(v ? 'Saqlanganlarga qo\'shildi' : 'Saqlanganlardan olib tashlandi', v ? 'bookmark' : 'bookmark-outline'); }}
      style={style}>
      <Ionicons name={on ? 'bookmark' : 'bookmark-outline'} size={size} color={on ? c.brandDeep : c.muted} />
    </Pressable>
  );
}

export function Place({ code, city }: { code: string; city?: string }) {
  const k = countryOf(code);
  return <Txt v="small" muted numberOfLines={1}>{k.flag} {city ? `${city}, ` : ''}{k.name}</Txt>;
}

const stageName = (id: string) => STAGES.find(s => s.id === id)?.name ?? id;

/* ---------- Loyiha kartalari ---------- */

export function ProjectCard({ p, mine }: { p: Project; mine?: boolean }) {
  const { colors: c } = useStore();
  const sec = sectorOf(p.sector);
  return (
    <Card onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })} style={{ gap: 10 }}>
      <Row>
        <SectorIcon id={p.sector} />
        <View style={{ flex: 1 }}>
          <Txt v="tiny" color={sec.color} numberOfLines={1}>{sec.name.toUpperCase()}</Txt>
          <Row gap={4}>
            <Txt v="small" muted numberOfLines={1} style={{ flexShrink: 1 }}>{p.ownerName}</Txt>
            {p.ownerVerified && <Verified size={13} />}
          </Row>
        </View>
        {mine ? <StatusBadge status={p.status} /> : <FavButton k={'project:' + p.id} />}
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
  return (
    <Pressable
      onPress={() => { haptic.tap(); router.push({ pathname: '/project/[id]', params: { id: p.id } }); }}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.surface, borderColor: c.line, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow(c, 0.25)]}>
      <LinearGradient colors={[sec.color, shade(sec.color)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileTop}>
        <Ionicons name={sec.icon} size={96} color="rgba(255,255,255,0.13)" style={{ position: 'absolute', right: -10, bottom: -18 }} />
        <Row gap={6}>
          {p.boosted && <View style={styles.topBadge}><Ionicons name="flash" size={11} color="#0E1525" /><Text style={styles.topBadgeText}>TOP</Text></View>}
          <View style={[styles.topBadge, { backgroundColor: 'rgba(255,255,255,0.9)' }]}><Text style={styles.topBadgeText}>{stageName(p.stage)}</Text></View>
        </Row>
        <Text style={styles.tileSector} numberOfLines={1}>{sec.name}</Text>
      </LinearGradient>
      <View style={{ padding: 14, gap: 6, flex: 1 }}>
        <Txt v="h3" numberOfLines={2} style={{ minHeight: 42 }}>{p.title}</Txt>
        <Row gap={4}>
          <Txt v="small" muted numberOfLines={1} style={{ flexShrink: 1 }}>{countryOf(p.country).flag} {p.ownerName}</Txt>
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
        <FavButton k={'company:' + co.id} />
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
          <Avatar name={sp.name} size={52} bg={sectorOf(sp.sector).color} />
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
      <Avatar name={sp.name} size={56} bg={sectorOf(sp.sector).color} />
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
          <Txt v="small" muted>{INVESTOR_KINDS[inv.kind]} · {countryOf(inv.country).flag} {countryOf(inv.country).name}</Txt>
        </View>
        <FavButton k={'investor:' + inv.id} />
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

export function MarketCard({ m, style }: { m: MarketItem; style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useStore();
  return (
    <Pressable
      onPress={() => { haptic.tap(); router.push({ pathname: '/market/[id]', params: { id: m.id } }); }}
      style={({ pressed }) => [styles.market, { backgroundColor: c.surface, opacity: pressed ? 0.88 : 1 }, shadow(c, 0.5), style]}>
      <View style={[styles.marketImg, { backgroundColor: sectorOf(m.sector).color + '1A' }]}>
        <Text style={{ fontSize: 46 }}>{m.emoji}</Text>
        <FavButton k={'market:' + m.id} size={20} style={[styles.marketFav, { backgroundColor: c.surface }]} />
      </View>
      <View style={{ padding: 12, gap: 4, flex: 1 }}>
        <Txt v="small" style={{ fontFamily: F.bold, minHeight: 36 }} numberOfLines={2}>{m.title}</Txt>
        <Txt v="h3">{usd(m.price)}{m.unit ? <Txt v="tiny" faint> / {m.unit}</Txt> : null}</Txt>
        <Row gap={3}>
          <Txt v="tiny" faint numberOfLines={1} style={{ flexShrink: 1 }}>{countryOf(m.country).flag} {m.sellerName}</Txt>
          {m.sellerVerified && <Verified size={12} />}
        </Row>
      </View>
    </Pressable>
  );
}

/* ---------- Suhbatdosh ---------- */

export const PEER_LABEL: Record<Conversation['peerKind'], string> = {
  company: 'Kompaniya', person: 'Foydalanuvchi', investor: 'Investor', specialist: 'Mutaxassis', support: 'YUMS',
};

export function PeerAvatar({ conv, size = 50 }: { conv: Conversation; size?: number }) {
  const { colors: c } = useStore();
  if (conv.peerKind === 'support') {
    return <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.heavy, fontSize: size * 0.42, color: c.brandText }}>Y</Text></View>;
  }
  if (conv.peerKind === 'company' || conv.peerKind === 'investor') return <Logo name={conv.peerName} color={conv.peerKind === 'investor' ? c.violet : c.ok} size={size} />;
  return <Avatar name={conv.peerName} size={size} bg={c.accent} />;
}

/* ---------- Reklama ---------- */

export function AdBanner() {
  const { t } = useStore();
  return (
    <Pressable onPress={() => { haptic.tap(); router.push({ pathname: '/company/[id]', params: { id: 'c20' } }); }} style={({ pressed }) => [styles.ad, { opacity: pressed ? 0.9 : 1 }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.adLabel}>{t('home.ad').toUpperCase()} · Silk Road Logistics</Text>
        <Text style={styles.adTitle}>Xitoydan Toshkentgacha{'\n'}yuk — 12 kunda</Text>
        <Text style={styles.adSub}>Konsolidatsiya · bojxona · ombor</Text>
      </View>
      <IconTile name="cube-outline" color="#FFC800" size={58} glass />
    </Pressable>
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

export type PickOption = { id: string; label: string; icon?: IconName; emoji?: string; sub?: string };

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
              {o.emoji ? <Text style={{ fontSize: 22 }}>{o.emoji}</Text> : o.icon ? <Ionicons name={o.icon} size={20} color={c.text} /> : null}
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

export function KeyValue({ items }: { items: { label: string; value: string; icon?: IconName }[] }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.kvGrid}>
      {items.map(it => (
        <View key={it.label} style={[styles.kvCell, { backgroundColor: c.surface2 }]}>
          <Row gap={6}>
            {it.icon && <Ionicons name={it.icon} size={14} color={c.muted} />}
            <Txt v="tiny" faint>{it.label}</Txt>
          </Row>
          <Txt v="h3" style={{ fontSize: 14.5 }} numberOfLines={2}>{it.value}</Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
  tile: { width: 262, borderRadius: radius.l, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  tileTop: { height: 112, padding: 14, justifyContent: 'space-between', overflow: 'hidden' },
  topBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFC800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  topBadgeText: { color: '#0E1525', fontSize: 11, fontFamily: F.heavy },
  tileSector: { color: '#fff', fontFamily: F.heavy, fontSize: 13, opacity: 0.95 },
  dot: { position: 'absolute', right: -2, bottom: -2, width: 15, height: 15, borderRadius: 8, borderWidth: 3 },
  mini: { width: 128, padding: 12, borderRadius: radius.l, alignItems: 'center', gap: 4 },
  kv: { flex: 1, padding: 10, borderRadius: 14, gap: 2 },
  market: { borderRadius: radius.l, overflow: 'hidden' },
  marketImg: { height: 112, alignItems: 'center', justifyContent: 'center' },
  marketFav: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ad: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, borderRadius: radius.l, backgroundColor: '#0F1E3D' },
  adLabel: { color: '#FFC800', fontSize: 10.5, fontFamily: F.heavy, letterSpacing: 0.8 },
  adTitle: { color: '#fff', fontSize: 16, fontFamily: F.display, letterSpacing: -0.5, lineHeight: 22 },
  adSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, fontFamily: F.semi },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14 },
  input: { minHeight: 80, borderRadius: 16, padding: 14, fontSize: 15, textAlignVertical: 'top' },
  pickSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, paddingHorizontal: 12 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: radius.m, borderWidth: 1.5, paddingHorizontal: 14 },
  kvGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kvCell: { flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 14, gap: 4 },
});
