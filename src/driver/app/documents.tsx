import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Progress, Row, Screen, Txt } from '@/components/ui';
import { DocForm, DocViewer, STATUS, StatusChip } from '@/driver/components/doc-ui';
import { DOC_KINDS, DOC_META, type DocKind } from '@/driver/lib/docs';
import { useDriver } from '@/driver/lib/driver-store';
import { useStore } from '@/lib/store';
import { tr } from '@/lib/i18n';

export default function Documents() {
  const { colors: c } = useStore();
  const d = useDriver();
  const [view, setView] = useState<DocKind | null>(null);
  const [edit, setEdit] = useState<DocKind | null>(null);
  const [formKey, setFormKey] = useState(0);
  const approved = DOC_KINDS.filter(k => d.docs[k].status === 'approved').length;
  const anyMissing = DOC_KINDS.some(k => d.docs[k].status === 'missing');

  // yuklanmagan hujjat — darhol forma, aks holda hujjatning o'zi ochiladi
  const open = (k: DocKind) => {
    if (d.docs[k].status === 'missing') { setFormKey(n => n + 1); setEdit(k); } else setView(k);
  };

  return (
    <Screen title={tr('Hujjatlar')} subtitle={tr('{approved} / {length} tasdiqlangan', { approved, length: DOC_KINDS.length })}>
      <Card style={{ gap: 10 }}>
        <Row>
          <View style={[styles.big, { backgroundColor: d.docsApproved ? c.okSoft : c.brandSoft }]}>
            <Ionicons name={d.docsApproved ? 'shield-checkmark' : 'document-text'} size={24} color={d.docsApproved ? c.ok : c.brandDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="h3">{d.docsApproved ? tr('Barcha hujjatlar tasdiqlangan') : tr('Liniyaga chiqish uchun hujjatlar kerak')}</Txt>
            <Txt v="small" muted>{d.docsApproved ? tr('Buyurtmalarni qabul qilishingiz mumkin') : tr("To'rtta hujjat ham tekshiruvdan o'tishi kerak")}</Txt>
          </View>
        </Row>
        <Progress value={approved / DOC_KINDS.length} color={d.docsApproved ? c.ok : c.brand} />
      </Card>

      <Card style={{ paddingVertical: 4, paddingHorizontal: 4 }}>
        {DOC_KINDS.map((k, i) => {
          const doc = d.docs[k];
          const meta = DOC_META[k];
          const st = STATUS[doc.status];
          return (
            <Pressable key={k} onPress={() => open(k)} accessibilityLabel={tr(meta.title)}
              style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, pressed && { backgroundColor: c.surface2 }]}>
              {/* belgini bosganda ham hujjat ochiladi */}
              <Pressable onPress={() => open(k)} accessibilityLabel={tr('{title}ni ochish', { title: tr(meta.title) })} style={[styles.icon, { backgroundColor: st.bg }]}>
                <Ionicons name={meta.icon} size={20} color={st.color} />
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3" numberOfLines={1}>{tr(meta.title)}</Txt>
                <Txt v="tiny" muted numberOfLines={1}>
                  {doc.status === 'missing' ? tr('Bosib yuklang') : [doc.number, doc.expires ? tr('{date} gacha', { date: doc.expires }) : doc.categories].filter(Boolean).join(' · ')}
                </Txt>
              </View>
              <StatusChip status={doc.status} />
            </Pressable>
          );
        })}
      </Card>

      {anyMissing && (
        <Button title={tr("Namuna hujjatlar bilan to'ldirish (demo)")} icon="flash" kind="ghost" onPress={d.fillDemoDocs} />
      )}

      <View style={[styles.tip, { backgroundColor: c.accentSoft }]}>
        <Ionicons name="lock-closed" size={18} color={c.accent} />
        <Txt v="small" color={c.accent} style={{ flex: 1, lineHeight: 19 }}>
          
          {tr("Hujjatlar faqat tekshiruv uchun ishlatiladi va yo'lovchilarga ko'rsatilmaydi. Rasm aniq, butun va o'qiladigan bo'lsin.")}
        </Txt>
      </View>

      <DocViewer doc={view ? d.docs[view] : null} visible={!!view} onClose={() => setView(null)}
        onEdit={() => { const k = view; setView(null); setTimeout(() => { setFormKey(n => n + 1); setEdit(k); }, 350); }} />
      <DocForm key={`${edit}-${formKey}`} initial={edit ? d.docs[edit] : null} visible={!!edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
});
