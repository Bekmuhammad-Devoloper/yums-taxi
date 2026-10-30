// Hujjat tekshiruvi: avtomatik tekshiruv natijasi (ball, belgilar, tavsiya), hujjatni ko'rish va qaror.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DocCard } from '@/driver/components/doc-card';
import { DOC_META, SAMPLE, type DocKind, type DriverDoc } from '@/driver/lib/docs';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import type { AdminDriver, DocMeta } from '@/site/lib/admin-types';
import { daysLeft, precheck, REJECT_REASONS, type Precheck } from '@/site/lib/precheck';

import { DriverAvatar } from './bits';
import { Choice, Dialog, Field } from './dialogs';
import { Btn, Meter, Pill, STATUS_COLOR, ago, dateHM } from './ui';

const DOC_STATUS = {
  review: { label: 'Tekshirilmoqda', tone: 'warning' as const, icon: 'time' as const },
  approved: { label: 'Tasdiqlangan', tone: 'good' as const, icon: 'checkmark-circle' as const },
  rejected: { label: 'Rad etilgan', tone: 'critical' as const, icon: 'close-circle' as const },
};

export function DocStatusPill({ doc }: { doc?: DocMeta }) {
  if (!doc) return <Pill text="Yuklanmagan" tone="muted" icon="cloud-upload-outline" />;
  const s = DOC_STATUS[doc.status];
  return <Pill text={`${s.label}${doc.by === 'auto' && doc.status !== 'review' ? ' · avtomatik' : ''}`} tone={s.tone} icon={s.icon} />;
}

const DECISION = {
  approve: { label: 'Tavsiya: tasdiqlash', tone: 'good' as const, color: STATUS_COLOR.good },
  manual: { label: "Moderator ko'rishi kerak", tone: 'warning' as const, color: STATUS_COLOR.warning },
  reject: { label: 'Tavsiya: rad etish', tone: 'critical' as const, color: STATUS_COLOR.critical },
};

export function CheckSummary({ check }: { check: Precheck }) {
  const { colors: c } = useStore();
  const d = DECISION[check.decision];
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        <Pill text={d.label} tone={d.tone} icon="sparkles" />
        <Text style={[styles.meta, { color: c.muted }]}>ishonch {check.score}%</Text>
      </View>
      <Meter value={check.score / 100} color={d.color} height={6} />
      {check.flags.length ? (
        <View style={{ gap: 4 }}>
          {check.flags.map(f => (
            <View key={f.text} style={styles.row}>
              <Ionicons name={f.level === 'error' ? 'close-circle' : f.level === 'warn' ? 'warning' : 'information-circle'} size={14} color={f.level === 'error' ? STATUS_COLOR.critical : f.level === 'warn' ? STATUS_COLOR.serious : c.muted} />
              <Text style={[styles.meta, { color: c.text, flex: 1 }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.row}><Ionicons name="checkmark-circle" size={14} color={STATUS_COLOR.good} /><Text style={[styles.meta, { color: c.text }]}>Format, sanalar, muddat, toifa va rasmlar joyida, takrorlanish yo&apos;q</Text></View>
      )}
    </View>
  );
}

/** Bitta hujjat kartasi: ma'lumotlar, tekshiruv natijasi va amallar */
export function DocReviewCard({ driver, kind, showDriver }: { driver: AdminDriver; kind: DocKind; showDriver?: boolean }) {
  const { colors: c } = useStore();
  const { state } = useAdmin();
  const runCmds = useRun();
  const [view, setView] = useState(false);
  const [reject, setReject] = useState(false);
  const [busy, setBusy] = useState(false);
  const doc = driver.docs[kind];
  const meta = DOC_META[kind];
  const check = doc ? precheck(doc, driver, Object.values(state.drivers)) : null;
  const left = doc ? daysLeft(doc) : null;
  const approve = async () => { setBusy(true); await runCmds({ cmd: 'docDecision', driverId: driver.id, kind, status: 'approved' }, `${meta.short} tasdiqlandi`); setBusy(false); };
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: doc?.status === 'review' ? c.brand : c.line }]}>
      {showDriver ? (
        <View style={styles.row}>
          <DriverAvatar d={driver} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{driver.name}</Text>
            <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>{driver.plate} · {driver.car}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: c.surface2 }]}><Ionicons name={meta.icon} size={18} color={c.text} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>{meta.title}</Text>
          <Text style={[styles.meta, { color: c.muted }]}>{doc ? `${doc.number}${doc.issued ? ` · berilgan ${doc.issued}` : ''}${doc.expires ? ` · ${doc.expires} gacha` : ''}` : 'Yuklanmagan'}</Text>
        </View>
        <DocStatusPill doc={doc} />
      </View>
      {doc ? (
        <>
          {doc.categories ? <Text style={[styles.meta, { color: c.muted }]}>Toifalar: {doc.categories}</Text> : null}
          {left != null && doc.status === 'approved' && left <= 30 ? <Pill text={left < 0 ? "Muddati o'tgan" : `Muddati ${left} kunda tugaydi`} tone={left <= 7 ? 'critical' : 'warning'} icon="calendar" /> : null}
          {doc.status === 'rejected' && doc.note ? <Text style={[styles.meta, { color: STATUS_COLOR.critical }]}>Sabab: {doc.note}</Text> : null}
          {doc.status === 'review' && check ? <CheckSummary check={check} /> : null}
          <Text style={[styles.meta, { color: c.faint }]}>
            {doc.status === 'review' ? `Yuborilgan: ${ago(doc.receivedAt ?? doc.submittedAt)}` : `Qaror: ${dateHM(doc.checkedAt)}${doc.by === 'auto' ? ' · avtomatik tekshiruv' : doc.by === 'admin' ? ' · operator' : ''}`}
          </Text>
          <View style={styles.actions}>
            <Btn small title="Ko'rish" icon="eye" onPress={() => setView(true)} />
            {doc.status === 'review' ? (
              <>
                <Btn small title="Tasdiqlash" icon="checkmark" kind="dark" loading={busy} onPress={approve} />
                <Btn small title="Rad etish" icon="close" kind="danger" onPress={() => setReject(true)} />
              </>
            ) : doc.status === 'approved' ? (
              <Btn small title="Bekor qilish" icon="refresh" onPress={() => setReject(true)} />
            ) : null}
          </View>
        </>
      ) : null}
      {doc ? <DocViewDialog visible={view} onClose={() => setView(false)} driver={driver} doc={doc} /> : null}
      {doc ? <RejectDialog visible={reject} onClose={() => setReject(false)} driver={driver} kind={kind} suggestion={check?.note} /> : null}
    </View>
  );
}

function RejectDialog({ visible, onClose, driver, kind, suggestion }: { visible: boolean; onClose: () => void; driver: AdminDriver; kind: DocKind; suggestion?: string }) {
  const runCmds = useRun();
  const [note, setNote] = useState(suggestion ?? '');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const ok = await runCmds({ cmd: 'docDecision', driverId: driver.id, kind, status: 'rejected', note: note.trim() }, `${DOC_META[kind].short} rad etildi`);
    setBusy(false);
    if (ok) onClose();
  };
  const presets = [...new Set([suggestion, ...REJECT_REASONS].filter(Boolean) as string[])];
  return (
    <Dialog visible={visible} onClose={onClose} title={`Rad etish: ${DOC_META[kind].short} · ${driver.name}`}
      footer={<><Btn title="Bekor qilish" onPress={onClose} /><Btn title="Rad etish" icon="close" kind="danger" loading={busy} disabled={!note.trim()} onPress={send} /></>}>
      <Choice items={presets.map(p => ({ id: p, label: p }))} value={note} onChange={setNote} />
      <Field label="Sabab (haydovchi ilovasida ko'rinadi)" value={note} onChange={setNote} multiline />
    </Dialog>
  );
}

/** Hujjatning o'zi: yuklangan rasm yoki (namuna bo'lsa) hujjat dizayni, old va orqa tomoni */
export function DocViewDialog({ visible, onClose, driver, doc }: { visible: boolean; onClose: () => void; driver: AdminDriver; doc: DocMeta }) {
  const { colors: c } = useStore();
  const { run } = useAdmin();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [photos, setPhotos] = useState<{ front?: string; back?: string } | null>(null);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    run({ cmd: 'docPhotos', driverId: driver.id, kind: doc.kind }).then(a => { if (alive) setPhotos(a.ok ? a.photos ?? {} : {}); });
    return () => { alive = false; setPhotos(null); setSide('front'); };
  }, [visible, run, driver.id, doc.kind]);
  const full: DriverDoc = { ...doc, front: photos?.front ?? SAMPLE, back: photos?.back ?? (DOC_META[doc.kind].back ? SAMPLE : undefined) };
  const owner = { name: driver.name, plate: driver.plate, car: driver.car, color: driver.color, year: driver.year };
  const shown = side === 'front' ? full.front : full.back;
  return (
    <Dialog visible={visible} onClose={onClose} title={`${DOC_META[doc.kind].title} · ${driver.name}`}>
      {DOC_META[doc.kind].back ? <Choice items={[{ id: 'front', label: 'Old tomoni' }, { id: 'back', label: 'Orqa tomoni' }]} value={side} onChange={setSide} /> : null}
      {!photos ? (
        <View style={[styles.photo, { backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={c.muted} /></View>
      ) : shown && shown !== SAMPLE ? (
        <Pressable onPress={() => globalThis.open?.(shown, '_blank')} accessibilityLabel="Rasmni to'liq ochish">
          <Image source={{ uri: shown }} style={styles.photo} contentFit="contain" />
        </Pressable>
      ) : (
        <View style={{ gap: 6 }}>
          <DocCard doc={full} profile={owner} side={side} />
          <Text style={[styles.meta, { color: c.faint }]}>{doc.sample ? 'Namuna (demo) hujjat — rasm o\'rniga hujjat dizayni ko\'rsatilgan' : "Rasm demo rejimda — hujjat dizayni ko'rsatilgan"}</Text>
        </View>
      )}
      <View style={{ gap: 4 }}>
        {[['Raqam', doc.number], ['Berilgan', doc.issued], ['Amal qiladi', doc.expires], ['Toifalar', doc.categories]].filter(([, v]) => v).map(([k, v]) => (
          <View key={k} style={styles.row}><Text style={[styles.meta, { color: c.muted, width: 110 }]}>{k}</Text><Text style={[styles.meta, { color: c.text, fontFamily: F.bold }]}>{v}</Text></View>
        ))}
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.bold, fontSize: 14.5 },
  meta: { fontFamily: F.medium, fontSize: 12.5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: '100%', aspectRatio: 1.586, borderRadius: 16 },
});
