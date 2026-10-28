import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/toast';
import { Button, Chip, Field, Row, Segmented, Sheet, Txt } from '@/components/ui';
import { DOC_META, SAMPLE, fmtDate, fmtDocNumber, validateDoc, type DocKind, type DocStatus, type DriverDoc } from '@/driver/lib/docs';
import { useDriver, type DriverProfile } from '@/driver/lib/driver-store';
import { fmtDate as fmtTime } from '@/lib/format';
import { pickImage } from '@/lib/media';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

export const STATUS: Record<DocStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  missing: { label: 'Yuklanmagan', color: '#8A93A6', bg: 'rgba(138,147,166,0.14)', icon: 'cloud-upload-outline' },
  review: { label: 'Tekshirilmoqda', color: '#D97706', bg: 'rgba(217,119,6,0.13)', icon: 'time' },
  approved: { label: 'Tasdiqlangan', color: '#12A66A', bg: 'rgba(18,166,106,0.13)', icon: 'checkmark-circle' },
  rejected: { label: 'Rad etildi', color: '#E5484D', bg: 'rgba(229,72,77,0.13)', icon: 'close-circle' },
};

export function StatusChip({ status }: { status: DocStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={13} color={s.color} />
      <Text style={[styles.chipText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

const CARD_THEME: Record<DocKind, { colors: [string, string]; ink: string; title: string; sub: string }> = {
  license: { colors: ['#F7D9E3', '#D5E6F7'], ink: '#2B2350', title: 'HAYDOVCHILIK GUVOHNOMASI', sub: 'DRIVING LICENCE' },
  techPassport: { colors: ['#DDF0E1', '#F3F1D9'], ink: '#1E3B2A', title: "TRANSPORT VOSITASI GUVOHNOMASI", sub: 'VEHICLE REGISTRATION CERTIFICATE' },
  taxiLicense: { colors: ['#DCE8FF', '#EEF3FF'], ink: '#14285C', title: 'TAKSI XIZMATI LITSENZIYASI', sub: 'TAXI SERVICE LICENCE' },
  osago: { colors: ['#FFFFFF', '#EAF2FF'], ink: '#0F2A57', title: "OSAGO SUG'URTA POLISI", sub: 'MAJBURIY SUG\'URTA' },
};

/** Hujjatning o'zi — haqiqiy hujjat dizayniga o'xshash, haydovchi ma'lumotlari bilan */
export function DocCard({ doc, profile, side = 'front' }: { doc: DriverDoc; profile: DriverProfile; side?: 'front' | 'back' }) {
  const t = CARD_THEME[doc.kind];
  const [surname, ...rest] = profile.name.toUpperCase().split(' ').reverse();
  const given = rest.reverse().join(' ');
  const photo = side === 'front' ? doc.front : doc.back;
  // haydovchi o'zi yuklagan rasm bo'lsa — shu rasm ko'rsatiladi
  if (photo && photo !== SAMPLE) {
    return <Image source={{ uri: photo }} style={styles.card} contentFit="cover" accessibilityLabel={`${DOC_META[doc.kind].title} — ${side === 'front' ? 'old' : 'orqa'} tomoni`} />;
  }
  const f = (n: string, label: string, value?: string, big?: boolean) => (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'baseline' }} key={n}>
      <Text style={[styles.fNum, { color: t.ink }]}>{n}</Text>
      <View style={{ flexShrink: 1 }}>
        <Text style={[styles.fLabel, { color: t.ink }]}>{label}</Text>
        <Text style={[big ? styles.fBig : styles.fVal, { color: t.ink }]} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
  return (
    <LinearGradient colors={t.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.flag}><View style={[styles.flagStripe, { backgroundColor: '#1EB5E8' }]} /><View style={[styles.flagStripe, { backgroundColor: '#fff' }]} /><View style={[styles.flagStripe, { backgroundColor: '#2BB34A' }]} /></View>
      <Row gap={8} style={{ alignItems: 'flex-start' }}>
        <View style={[styles.uz, { borderColor: t.ink }]}><Text style={[styles.uzText, { color: t.ink }]}>UZ</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.country, { color: t.ink }]}>O&apos;ZBEKISTON RESPUBLIKASI</Text>
          <Text style={[styles.cardTitle, { color: t.ink }]} numberOfLines={1}>{t.title}</Text>
          <Text style={[styles.cardSub, { color: t.ink }]}>{t.sub}</Text>
        </View>
      </Row>
      {side === 'front' ? (
        <Row gap={10} style={{ alignItems: 'flex-start', marginTop: 8, flex: 1 }}>
          {doc.kind === 'license' && (
            <View style={[styles.photo, { borderColor: t.ink }]}>
              <Text style={[styles.photoText, { color: t.ink }]}>{profile.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 3 }}>
            {doc.kind === 'license' && <>{f('1.', 'Familiya', surname)}{f('2.', 'Ism', given)}<Row gap={14}>{f('4a.', 'Berilgan', doc.issued)}{f('4b.', 'Amal qiladi', doc.expires)}</Row>{f('5.', 'Raqam', doc.number, true)}</>}
            {doc.kind === 'techPassport' && <>{f('A.', 'Davlat raqami', profile.plate, true)}{f('D.1', 'Marka, model', profile.car)}<Row gap={14}>{f('B.', 'Yili', profile.year ? String(profile.year) : undefined)}{f('R.', 'Rangi', profile.color)}</Row>{f('C.1', 'Egasi', profile.name.toUpperCase())}</>}
            {doc.kind === 'taxiLicense' && <>{f('№', 'Litsenziya', doc.number, true)}{f('', 'Litsenziat', profile.name.toUpperCase())}<Row gap={14}>{f('', 'Avtomobil', profile.plate)}{f('', 'Amal qiladi', doc.expires)}</Row></>}
            {doc.kind === 'osago' && <>{f('№', 'Polis', doc.number, true)}{f('', "Sug'urtalangan", profile.name.toUpperCase())}<Row gap={14}>{f('', 'Avtomobil', profile.plate)}{f('', 'Amal qiladi', doc.expires)}</Row></>}
          </View>
        </Row>
      ) : (
        <View style={{ marginTop: 8, flex: 1, gap: 4 }}>
          {doc.kind === 'license' ? (
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {['A', 'B', 'BE', 'C', 'CE', 'D'].map(cat => {
                const on = (doc.categories ?? '').split(/[\s,]+/).includes(cat);
                return (
                  <View key={cat} style={[styles.cat, { borderColor: t.ink, opacity: on ? 1 : 0.3 }]}>
                    <Text style={[styles.catText, { color: t.ink }]}>{cat}</Text>
                    <Text style={[styles.fLabel, { color: t.ink }]}>{on ? doc.issued : '—'}</Text>
                  </View>
                );
              })}
            </Row>
          ) : (
            <>{f('', 'Seriya va raqam', doc.number, true)}{f('', 'Berilgan sana', doc.issued)}</>
          )}
          <Text style={[styles.mrz, { color: t.ink }]} numberOfLines={1}>{`${doc.kind === 'license' ? 'DL' : 'VR'}UZB${doc.number.replace(/\s/g, '')}<<${profile.name.toUpperCase().replace(/\s+/g, '<')}<<<<<<<<`}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

/** Hujjatni ko'rish oynasi: hujjat, old/orqa tomoni, holati va ma'lumotlari */
export function DocViewer({ doc, visible, onClose, onEdit }: { doc: DriverDoc | null; visible: boolean; onClose: () => void; onEdit: () => void }) {
  const { colors: c } = useStore();
  const { profile } = useDriver();
  const insets = useSafeAreaInsets();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [zoom, setZoom] = useState<string | null>(null);
  if (!doc || !profile) return null;
  const meta = DOC_META[doc.kind];
  const photos = [doc.front, doc.back].filter((p): p is string => !!p && p !== SAMPLE);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <Row style={styles.viewerHead}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Yopish" style={[styles.close, { backgroundColor: c.surface2 }]}><Ionicons name="close" size={20} color={c.text} /></Pressable>
          <View style={{ flex: 1 }}>
            <Txt v="h2" numberOfLines={1}>{meta.title}</Txt>
            <Txt v="small" muted>{doc.number || 'Raqam kiritilmagan'}</Txt>
          </View>
          <StatusChip status={doc.status} />
        </Row>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
          {meta.back ? <Segmented<'front' | 'back'> items={[{ id: 'front', label: 'Old tomoni' }, { id: 'back', label: 'Orqa tomoni' }]} value={side} onChange={setSide} /> : null}
          <DocCard doc={doc} profile={profile} side={meta.back ? side : 'front'} />
          {doc.status === 'rejected' && doc.note ? (
            <View style={[styles.note, { backgroundColor: STATUS.rejected.bg }]}><Ionicons name="alert-circle" size={18} color={STATUS.rejected.color} /><Txt v="small" color={STATUS.rejected.color} style={{ flex: 1 }}>{doc.note}</Txt></View>
          ) : null}
          {doc.status === 'review' ? (
            <View style={[styles.note, { backgroundColor: STATUS.review.bg }]}><Ionicons name="time" size={18} color={STATUS.review.color} /><Txt v="small" color={STATUS.review.color} style={{ flex: 1 }}>Moderator tekshirmoqda — odatda bir necha daqiqa</Txt></View>
          ) : null}
          <View style={[styles.info, { backgroundColor: c.surface, borderColor: c.line }]}>
            <InfoRow label={meta.numberLabel} value={doc.number} />
            {doc.categories ? <InfoRow label="Toifalar" value={doc.categories} /> : null}
            <InfoRow label="Berilgan sana" value={doc.issued} />
            {meta.expires ? <InfoRow label="Amal qilish muddati" value={doc.expires} /> : null}
            {doc.submittedAt ? <InfoRow label="Yuborilgan" value={fmtTime(doc.submittedAt)} /> : null}
            {doc.checkedAt ? <InfoRow label="Tekshirilgan" value={fmtTime(doc.checkedAt)} /> : null}
          </View>
          {photos.length ? (
            <View style={{ gap: 8 }}>
              <Txt v="small" muted style={{ fontFamily: F.bold }}>Yuklangan rasmlar</Txt>
              <Row gap={10}>
                {photos.map((p, i) => (
                  <Pressable key={i} onPress={() => setZoom(p)} style={{ flex: 1 }} accessibilityLabel="Rasmni kattalashtirish">
                    <Image source={{ uri: p }} style={styles.thumb} contentFit="cover" />
                  </Pressable>
                ))}
              </Row>
            </View>
          ) : null}
          <Button title={doc.status === 'rejected' ? 'Qayta yuklash' : 'Tahrirlash'} icon="create-outline" kind={doc.status === 'rejected' ? 'brand' : 'ghost'} onPress={onEdit} />
        </ScrollView>
        <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
          <Pressable style={styles.zoomBg} onPress={() => setZoom(null)} accessibilityLabel="Yopish">
            {zoom ? <Image source={{ uri: zoom }} style={{ width: '100%', height: '80%' }} contentFit="contain" /> : null}
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  const { colors: c } = useStore();
  return (
    <Row style={[styles.infoRow, { borderBottomColor: c.line }]}>
      <Txt v="small" muted style={{ flex: 1 }}>{label}</Txt>
      <Txt v="small" style={{ fontFamily: F.bold }}>{value || '—'}</Txt>
    </Row>
  );
}

const CATEGORIES = ['A', 'B', 'BE', 'C', 'CE', 'D'];

/** Hujjatni yuklash formasi: raqam, sanalar, toifalar va old/orqa tomoni rasmi (boshqa hujjat uchun `key` bilan qayta yaratiladi) */
export function DocForm({ initial, visible, onClose }: { initial: DriverDoc | null; visible: boolean; onClose: () => void }) {
  const { colors: c } = useStore();
  const { submitDoc } = useDriver();
  const [d, setD] = useState<DriverDoc | null>(initial);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<'front' | 'back' | null>(null);
  if (!d) return null;
  const meta = DOC_META[d.kind];
  const err = validateDoc(d);
  const set = (p: Partial<DriverDoc>) => setD(cur => (cur ? { ...cur, ...p } : cur));

  const pick = async (which: 'front' | 'back', source: 'camera' | 'library') => {
    setBusy(which);
    const r = await pickImage('document', source);
    setBusy(null);
    if (r.ok) set({ [which]: r.uri });
    else if (r.reason === 'denied') toast("Kameraga ruxsat berilmadi", 'camera');
    else if (r.reason === 'error') toast("Rasmni yuklab bo'lmadi", 'alert-circle');
  };

  const submit = () => {
    setTried(true);
    if (Object.keys(err).length) { toast("Maydonlarni to'g'ri to'ldiring", 'alert-circle'); return; }
    submitDoc(d);
    onClose();
    toast('Hujjat tekshiruvga yuborildi', 'paper-plane');
  };

  const slot = (which: 'front' | 'back', label: string) => {
    const v = d[which];
    return (
      <View style={{ flex: 1, gap: 6 }}>
        <Txt v="tiny" muted style={{ fontFamily: F.bold }}>{label}</Txt>
        <View style={[styles.slot, { backgroundColor: c.surface2, borderColor: tried && err[which] ? c.danger : c.line }]}>
          {v && v !== SAMPLE ? <Image source={{ uri: v }} style={StyleSheet.absoluteFill} contentFit="cover" />
            : v === SAMPLE ? <View style={styles.slotEmpty}><Ionicons name="document-text" size={26} color={c.ok} /><Txt v="tiny" color={c.ok}>Namuna</Txt></View>
            : <View style={styles.slotEmpty}><Ionicons name={busy === which ? 'hourglass' : 'camera-outline'} size={26} color={c.faint} /><Txt v="tiny" faint>Rasm yo&apos;q</Txt></View>}
        </View>
        <Row gap={6}>
          <Pressable onPress={() => pick(which, 'camera')} style={[styles.slotBtn, { backgroundColor: c.surface2 }]} accessibilityLabel={`${label}: kamera`}><Ionicons name="camera" size={16} color={c.text} /></Pressable>
          <Pressable onPress={() => pick(which, 'library')} style={[styles.slotBtn, { backgroundColor: c.surface2, flex: 1 }]} accessibilityLabel={`${label}: galereya`}><Ionicons name="images" size={16} color={c.text} /><Txt v="tiny" style={{ fontFamily: F.bold }}>Galereya</Txt></Pressable>
        </Row>
        {tried && err[which] ? <Txt v="tiny" color={c.danger}>{err[which]}</Txt> : null}
      </View>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={meta.title} footer={<Button title="Tekshiruvga yuborish" icon="paper-plane" onPress={submit} style={{ marginTop: 12 }} />}>
      <Txt v="small" muted>{meta.hint}</Txt>
      <Field label={meta.numberLabel} placeholder={meta.placeholder} autoCapitalize="characters" value={d.number} onChangeText={v => set({ number: fmtDocNumber(v) })} error={tried ? err.number : ''} inputStyle={{ fontFamily: F.heavy, letterSpacing: 1 }} />
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Field style={{ flex: 1 }} label="Berilgan sana" placeholder="KK.OO.YYYY" keyboardType="number-pad" value={d.issued ?? ''} onChangeText={v => set({ issued: fmtDate(v) })} error={tried ? err.issued : ''} />
        {meta.expires ? <Field style={{ flex: 1 }} label="Amal qiladi" placeholder="KK.OO.YYYY" keyboardType="number-pad" value={d.expires ?? ''} onChangeText={v => set({ expires: fmtDate(v) })} error={tried ? err.expires : ''} /> : null}
      </Row>
      {meta.categories ? (
        <View style={{ gap: 6 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold }}>Toifalar</Txt>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const list = (d.categories ?? '').split(/[\s,]+/).filter(Boolean);
              const on = list.includes(cat);
              return <Chip key={cat} label={cat} active={on} onPress={() => set({ categories: (on ? list.filter(x => x !== cat) : [...list, cat]).sort((a, b) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b)).join(', ') })} />;
            })}
          </Row>
          {tried && err.categories ? <Txt v="tiny" color={c.danger}>{err.categories}</Txt> : null}
        </View>
      ) : null}
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        {slot('front', 'Old tomoni')}
        {meta.back ? slot('back', 'Orqa tomoni') : <View style={{ flex: 1 }} />}
      </Row>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  chipText: { fontFamily: F.bold, fontSize: 12 },
  card: { width: '100%', aspectRatio: 1.586, borderRadius: 18, padding: 14, overflow: 'hidden' },
  flag: { position: 'absolute', right: 14, top: 14, width: 28, height: 18, borderRadius: 3, overflow: 'hidden' },
  flagStripe: { flex: 1 },
  uz: { width: 30, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  uzText: { fontFamily: F.heavy, fontSize: 10 },
  country: { fontFamily: F.bold, fontSize: 8.5, letterSpacing: 0.8, opacity: 0.8 },
  cardTitle: { fontFamily: F.heavy, fontSize: 12.5, letterSpacing: 0.3, marginRight: 34 },
  cardSub: { fontFamily: F.semi, fontSize: 8, letterSpacing: 0.6, opacity: 0.65 },
  photo: { width: '26%', aspectRatio: 0.78, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' },
  photoText: { fontFamily: F.heavy, fontSize: 22, opacity: 0.6 },
  fNum: { fontFamily: F.bold, fontSize: 9, opacity: 0.6 },
  fLabel: { fontFamily: F.semi, fontSize: 8, opacity: 0.6 },
  fVal: { fontFamily: F.bold, fontSize: 12 },
  fBig: { fontFamily: F.mono, fontSize: 15, letterSpacing: 1 },
  cat: { width: '30%', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  catText: { fontFamily: F.heavy, fontSize: 13 },
  mrz: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1, opacity: 0.75, marginTop: 'auto' },
  viewerHead: { paddingHorizontal: 16, paddingVertical: 10 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  info: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  infoRow: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: '100%', aspectRatio: 1.6, borderRadius: 12 },
  zoomBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  slot: { aspectRatio: 1.6, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden' },
  slotEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  slotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 10 },
});
