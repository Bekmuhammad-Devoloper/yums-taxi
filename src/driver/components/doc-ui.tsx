import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/toast';
import { Button, Chip, Field, Row, Segmented, Sheet, Txt } from '@/components/ui';
import { DOC_META, SAMPLE, fmtDate, fmtDocNumber, validateDoc, type DriverDoc } from '@/driver/lib/docs';
import { useDriver } from '@/driver/lib/driver-store';
import { fmtDate as fmtTime } from '@/lib/format';
import { pickImage } from '@/lib/media';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

import { DocCard, STATUS, StatusChip } from './doc-card';

export { DocCard, STATUS, StatusChip };

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
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={tr('Yopish')} style={[styles.close, { backgroundColor: c.surface2 }]}><Ionicons name="close" size={20} color={c.text} /></Pressable>
          <View style={{ flex: 1 }}>
            <Txt v="h2" numberOfLines={1}>{tr(meta.title)}</Txt>
            <Txt v="small" muted>{doc.number || tr('Raqam kiritilmagan')}</Txt>
          </View>
          <StatusChip status={doc.status} />
        </Row>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
          {meta.back ? <Segmented<'front' | 'back'> items={[{ id: 'front', label: tr('Old tomoni') }, { id: 'back', label: tr('Orqa tomoni') }]} value={side} onChange={setSide} /> : null}
          <DocCard doc={doc} profile={profile} side={meta.back ? side : 'front'} />
          {doc.status === 'rejected' && doc.note ? (
            <View style={[styles.note, { backgroundColor: STATUS.rejected.bg }]}><Ionicons name="alert-circle" size={18} color={STATUS.rejected.color} /><Txt v="small" color={STATUS.rejected.color} style={{ flex: 1 }}>{doc.note}</Txt></View>
          ) : null}
          {doc.status === 'review' ? (
            <View style={[styles.note, { backgroundColor: STATUS.review.bg }]}><Ionicons name="time" size={18} color={STATUS.review.color} /><Txt v="small" color={STATUS.review.color} style={{ flex: 1 }}>{tr('Moderator tekshirmoqda — odatda bir necha daqiqa')}</Txt></View>
          ) : null}
          <View style={[styles.info, { backgroundColor: c.surface, borderColor: c.line }]}>
            <InfoRow label={tr(meta.numberLabel)} value={doc.number} />
            {doc.categories ? <InfoRow label={tr('Toifalar')} value={doc.categories} /> : null}
            <InfoRow label={tr('Berilgan sana')} value={doc.issued} />
            {meta.expires ? <InfoRow label={tr('Amal qilish muddati')} value={doc.expires} /> : null}
            {doc.submittedAt ? <InfoRow label={tr('Yuborilgan')} value={fmtTime(doc.submittedAt)} /> : null}
            {doc.checkedAt ? <InfoRow label={tr('Tekshirilgan')} value={fmtTime(doc.checkedAt)} /> : null}
          </View>
          {photos.length ? (
            <View style={{ gap: 8 }}>
              <Txt v="small" muted style={{ fontFamily: F.bold }}>{tr('Yuklangan rasmlar')}</Txt>
              <Row gap={10}>
                {photos.map((p, i) => (
                  <Pressable key={i} onPress={() => setZoom(p)} style={{ flex: 1 }} accessibilityLabel={tr('Rasmni kattalashtirish')}>
                    <Image source={{ uri: p }} style={styles.thumb} contentFit="cover" />
                  </Pressable>
                ))}
              </Row>
            </View>
          ) : null}
          <Button title={doc.status === 'rejected' ? tr('Qayta yuklash') : tr('Tahrirlash')} icon="create-outline" kind={doc.status === 'rejected' ? 'brand' : 'ghost'} onPress={onEdit} />
        </ScrollView>
        <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
          <Pressable style={styles.zoomBg} onPress={() => setZoom(null)} accessibilityLabel={tr('Yopish')}>
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
    else if (r.reason === 'denied') toast(tr('Kameraga ruxsat berilmadi'), 'camera');
    else if (r.reason === 'error') toast(tr("Rasmni yuklab bo'lmadi"), 'alert-circle');
  };

  const submit = () => {
    setTried(true);
    if (Object.keys(err).length) { toast(tr("Maydonlarni to'g'ri to'ldiring"), 'alert-circle'); return; }
    submitDoc(d);
    onClose();
    toast(tr('Hujjat tekshiruvga yuborildi'), 'paper-plane');
  };

  const slot = (which: 'front' | 'back', label: string) => {
    const v = d[which];
    return (
      <View style={{ flex: 1, gap: 6 }}>
        <Txt v="tiny" muted style={{ fontFamily: F.bold }}>{label}</Txt>
        <View style={[styles.slot, { backgroundColor: c.surface2, borderColor: tried && err[which] ? c.danger : c.line }]}>
          {v && v !== SAMPLE ? <Image source={{ uri: v }} style={StyleSheet.absoluteFill} contentFit="cover" />
            : v === SAMPLE ? <View style={styles.slotEmpty}><Ionicons name="document-text" size={26} color={c.ok} /><Txt v="tiny" color={c.ok}>{tr('Namuna')}</Txt></View>
            : <View style={styles.slotEmpty}><Ionicons name={busy === which ? 'hourglass' : 'camera-outline'} size={26} color={c.faint} /><Txt v="tiny" faint>{tr("Rasm yo'q")}</Txt></View>}
        </View>
        <Row gap={6}>
          <Pressable onPress={() => pick(which, 'camera')} style={[styles.slotBtn, { backgroundColor: c.surface2 }]} accessibilityLabel={tr('{label}: kamera', { label })}><Ionicons name="camera" size={16} color={c.text} /></Pressable>
          <Pressable onPress={() => pick(which, 'library')} style={[styles.slotBtn, { backgroundColor: c.surface2, flex: 1 }]} accessibilityLabel={tr('{label}: galereya', { label })}><Ionicons name="images" size={16} color={c.text} /><Txt v="tiny" style={{ fontFamily: F.bold }}>{tr('Galereya')}</Txt></Pressable>
        </Row>
        {tried && err[which] ? <Txt v="tiny" color={c.danger}>{err[which]}</Txt> : null}
      </View>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={tr(meta.title)} footer={<Button title={tr('Tekshiruvga yuborish')} icon="paper-plane" onPress={submit} style={{ marginTop: 12 }} />}>
      <Txt v="small" muted>{tr(meta.hint)}</Txt>
      <Field label={tr(meta.numberLabel)} placeholder={meta.placeholder} autoCapitalize="characters" value={d.number} onChangeText={v => set({ number: fmtDocNumber(v) })} error={tried ? err.number : ''} inputStyle={{ fontFamily: F.heavy, letterSpacing: 1 }} />
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Field style={{ flex: 1 }} label={tr('Berilgan sana')} placeholder={tr('KK.OO.YYYY')} keyboardType="number-pad" value={d.issued ?? ''} onChangeText={v => set({ issued: fmtDate(v) })} error={tried ? err.issued : ''} />
        {meta.expires ? <Field style={{ flex: 1 }} label={tr('Amal qiladi')} placeholder={tr('KK.OO.YYYY')} keyboardType="number-pad" value={d.expires ?? ''} onChangeText={v => set({ expires: fmtDate(v) })} error={tried ? err.expires : ''} /> : null}
      </Row>
      {meta.categories ? (
        <View style={{ gap: 6 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold }}>{tr('Toifalar')}</Txt>
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
        {slot('front', tr('Old tomoni'))}
        {meta.back ? slot('back', tr('Orqa tomoni')) : <View style={{ flex: 1 }} />}
      </Row>
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
