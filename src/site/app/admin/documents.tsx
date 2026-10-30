// Hujjatlar: tekshiruv navbati (avtomatik tekshiruv tavsiyasi bilan), muddati tugayotganlar, rad etilganlar.
// Avtomatik tekshiruv yoqilgan bo'lsa aniq holatlarni server o'zi hal qiladi, shubhalilari shu navbatda qoladi.
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IOSSwitch } from '@/components/ui';
import { DOC_KINDS, DOC_META } from '@/driver/lib/docs';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { useLayout } from '@/site/components/kit';
import { DocReviewCard } from '@/site/components/admin/doc-review';
import { Btn, Empty, Page, Panel, Seg } from '@/site/components/admin/ui';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import { docQueue } from '@/site/lib/insights';

type Tab = 'queue' | 'expiring' | 'rejected';

export default function Documents() {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const { state, run } = useAdmin();
  const runCmds = useRun();
  const [tab, setTab] = useState<Tab>('queue');
  const [busy, setBusy] = useState(false);
  const q = useMemo(() => docQueue(state), [state]);
  const rejected = useMemo(() => Object.values(state.drivers).flatMap(d => DOC_KINDS.filter(k => d.docs[k]?.status === 'rejected').map(k => ({ driver: d, kind: k }))), [state.drivers]);
  const ready = q.pending.filter(p => p.check.decision === 'approve');

  const approveAll = () => confirm('Tavsiya etilganlarni tasdiqlash', `${ready.length} ta hujjat avtomatik tekshiruvdan to'liq o'tgan. Hammasi tasdiqlansinmi?`, async () => {
    setBusy(true);
    await runCmds(ready.map(p => ({ cmd: 'docDecision' as const, driverId: p.driver.id, kind: p.kind, status: 'approved' as const })), `${ready.length} ta hujjat tasdiqlandi`);
    setBusy(false);
  }, 'Tasdiqlash');

  const list = tab === 'queue' ? q.pending.map(p => ({ driver: p.driver, kind: p.kind })) : tab === 'expiring' ? q.expiring.map(e => ({ driver: e.driver, kind: e.kind })) : rejected;
  return (
    <Page title="Hujjatlar" sub={`${q.pending.length} ta tekshiruvda · ${q.expiring.length} tasi 30 kun ichida tugaydi`}
      actions={ready.length ? <Btn title={`Tavsiya etilganlarni tasdiqlash (${ready.length})`} icon="sparkles" kind="dark" loading={busy} onPress={approveAll} /> : undefined}>
      <Panel>
        <View style={styles.auto}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.title, { color: c.text }]}>Avtomatik tekshiruv</Text>
            <Text style={[styles.meta, { color: c.muted }]}>
              Raqam formati, sanalar, muddat, «B» toifa, rasmlar va boshqa haydovchida takrorlanish tekshiriladi. Hammasi joyida bo&apos;lsa — hujjat o&apos;zi tasdiqlanadi,
              muddati o&apos;tgan yoki noto&apos;g&apos;ri bo&apos;lsa — sababi bilan rad etiladi, shubhali holatlar (muddat yaqin, staj kam, takroriy raqam) moderatorga qoladi.
            </Text>
          </View>
          <IOSSwitch value={state.config.autoApprove} onChange={v => { run({ cmd: 'config', patch: { autoApprove: v } }); }} label="Avtomatik tekshiruv" />
        </View>
      </Panel>
      <Seg<Tab> items={[{ id: 'queue', label: 'Navbat', count: q.pending.length }, { id: 'expiring', label: 'Muddati tugayotgan', count: q.expiring.length }, { id: 'rejected', label: 'Rad etilgan', count: rejected.length }]} value={tab} onChange={setTab} />
      {list.length ? (
        <View style={styles.grid}>
          {list.map(({ driver, kind }) => (
            <View key={`${driver.id}:${kind}`} style={{ flexBasis: wide ? '31%' : '100%', flexGrow: 1, maxWidth: wide ? '50%' : undefined }}>
              <DocReviewCard driver={driver} kind={kind} showDriver />
            </View>
          ))}
        </View>
      ) : (
        <Panel>
          <Empty icon={tab === 'queue' ? 'checkmark-done-circle' : 'calendar'} title={tab === 'queue' ? "Navbat bo'sh" : tab === 'expiring' ? "Muddati yaqin hujjat yo'q" : "Rad etilgan hujjat yo'q"}
            sub={tab === 'queue' ? 'Yangi hujjat kelganda shu yerda paydo bo\'ladi' : tab === 'expiring' ? `${DOC_META.osago.short}, guvohnoma va litsenziya muddatlari kuzatib boriladi` : undefined} />
        </Panel>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  auto: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { fontFamily: F.display, fontSize: 16.5 },
  meta: { fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
});
