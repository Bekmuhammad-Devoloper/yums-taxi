// Haydovchi bo'lish arizalari (saytdan): aqlli navbat (kechikayotgan va premium tariflarga mos arizalar oldinda),
// avtomobilning tariflarga mosligi, takroriy va ilovada allaqachon ro'yxatdan o'tgan raqamlar, izoh va holat.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CLASS_NAME, carFit, carTitle, findCar, tariffChecks } from '@/driver/lib/requirements';
import { TARIFFS } from '@/lib/data';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { openUrl, useLayout } from '@/site/components/kit';
import { DocsPill } from '@/site/components/admin/bits';
import { Choice, Dialog } from '@/site/components/admin/dialogs';
import { Btn, Cell, Cols, Empty, Page, Panel, Pill, Seg, StatTile, STATUS_COLOR, Table, ago, dateHM, type Column, type Tone } from '@/site/components/admin/ui';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import type { AdminDriver } from '@/site/lib/admin-types';
import type { Lead, LeadStatus } from '@/site/lib/api';
import { langLabel } from '@/site/lib/content';

type Tab = LeadStatus | 'all';
const STATUS: Record<LeadStatus, { label: string; tone: Tone }> = {
  new: { label: 'Yangi', tone: 'info' },
  contacted: { label: "Bog'lanildi", tone: 'warning' },
  approved: { label: 'Qabul qilindi', tone: 'good' },
  rejected: { label: 'Rad etildi', tone: 'muted' },
};
const REJECT = ['Avtomobil talablarga mos emas', 'Telefonga javob bermadi', 'Fikridan qaytdi', "Hujjatlari to'liq emas", 'Takroriy ariza'];
/** Yangi arizaga javob berish muddati (daqiqa) */
const SLA_MIN = 60;

const tName = (id: string) => TARIFFS.find(t => t.id === id)?.name ?? id;
const phoneKey = (p?: string) => (p ?? '').replace(/\D/g, '').slice(-9);
const phoneText = (p: string) => {
  const d = p.replace(/\D/g, '');
  return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}` : p;
};

type Info = {
  lead: Lead; fitNow: string[]; fitLater: string[]; issues: string[];
  driver?: AdminDriver; dupes: number; waitMin: number; late: boolean; score: number;
};

function analyse(leads: Lead[], drivers: AdminDriver[], now: number): Info[] {
  const byPhone = new Map<string, AdminDriver>();
  for (const d of drivers) if (d.phone) byPhone.set(phoneKey(d.phone), d);
  const count = new Map<string, number>();
  for (const l of leads) count.set(phoneKey(l.phone), (count.get(phoneKey(l.phone)) ?? 0) + 1);
  return leads.map(lead => {
    const fit = carFit(lead.car, lead.year);
    const issues: string[] = [];
    const car = findCar(lead.car);
    if (!lead.car) issues.push("Avtomobil ko'rsatilmagan");
    else if (!car) issues.push(`«${lead.car}» katalogda yo'q — sinfini qo'ng'iroqda aniqlang`);
    if (lead.car && !fit.now.length) {
      const year = tariffChecks('start', lead.car, lead.year, { docsApproved: true, rating: 5, trips: 0, activity: 100, deliveryTerms: true }).find(ch => ch.id === 'year');
      issues.push(year && !year.ok ? `${lead.year ?? '—'}-yil: 2008-yildan eski avtomobil yo'lovchi tashishga qabul qilinmaydi` : 'Avtomobil hech bir yo\'lovchi tarifiga mos emas');
    }
    const driver = byPhone.get(phoneKey(lead.phone));
    const dupes = (count.get(phoneKey(lead.phone)) ?? 1) - 1;
    const waitMin = Math.max(0, (now - Date.parse(lead.at)) / 60000);
    const late = lead.status === 'new' && waitMin > SLA_MIN;
    // navbat: kechikayotgan, premium tariflarga mos, muammosiz arizalar oldinda
    const tier = fit.now.includes('business') ? 30 : fit.now.includes('comfort') ? 20 : fit.now.includes('minivan') ? 15 : fit.now.length ? 10 : 0;
    const score = (lead.status === 'new' ? 100 : 0) + tier + Math.min(waitMin / 6, 40) - issues.length * 12 - (driver ? 40 : 0) - dupes * 8;
    return { lead, fitNow: fit.now, fitLater: fit.later, issues, driver, dupes, waitMin, late, score };
  });
}

export default function Leads() {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const params = useLocalSearchParams<{ id?: string }>();
  const { state, derived } = useAdmin();
  const [tab, setTab] = useState<Tab>('new');
  const [q, setQ] = useState('');
  // tanlangan ariza: havoladagi ?id= (qidiruvdan o'tilganda) yoki ro'yxatdan bosilgani
  const [pick, setPick] = useState<{ id: string | null; param?: string }>({ id: params.id ?? null, param: params.id });
  const sel = pick.param === params.id ? pick.id : params.id ?? null;
  const setSel = (id: string | null) => setPick({ id, param: params.id });
  const now = derived?.at ?? 0;
  const drivers = useMemo(() => Object.values(state.drivers), [state.drivers]);
  const infos = useMemo(() => analyse(state.leads, drivers, now), [state.leads, drivers, now]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const digits = query.replace(/\D/g, '');
    return infos.filter(i => (tab === 'all' || i.lead.status === tab) && (!query
      || i.lead.name.toLowerCase().includes(query) || (i.lead.car ?? '').toLowerCase().includes(query) || (digits.length >= 3 && i.lead.phone.replace(/\D/g, '').includes(digits))))
      .sort((a, b) => (tab === 'new' || tab === 'all' ? b.score - a.score : Date.parse(b.lead.updatedAt ?? b.lead.at) - Date.parse(a.lead.updatedAt ?? a.lead.at)));
  }, [infos, tab, q]);

  const stats = useMemo(() => {
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
    const answered = infos.filter(i => i.lead.status !== 'new' && i.lead.updatedAt);
    const reply = answered.map(i => (Date.parse(i.lead.updatedAt!) - Date.parse(i.lead.at)) / 60000).filter(m => m >= 0);
    const decided = infos.filter(i => i.lead.status === 'approved' || i.lead.status === 'rejected');
    return {
      count: (s: LeadStatus) => infos.filter(i => i.lead.status === s).length,
      late: infos.filter(i => i.late).length,
      today: infos.filter(i => Date.parse(i.lead.at) >= d0.getTime()).length,
      reply: reply.length ? reply.reduce((a, b) => a + b, 0) / reply.length : null,
      conv: decided.length ? decided.filter(i => i.lead.status === 'approved').length / decided.length : null,
    };
  }, [infos, now]);

  const current = sel ? infos.find(i => i.lead.id === sel) : undefined;
  const columns: Column<Info>[] = [
    { key: 'name', title: 'Ariza', flex: 1.5, render: i => <Cell strong text={i.lead.name} sub={phoneText(i.lead.phone)} /> },
    { key: 'car', title: 'Avtomobil', flex: 1.2, render: i => <Cell text={i.lead.car ?? '—'} sub={[i.lead.year, i.lead.city].filter(Boolean).join(' · ')} /> },
    { key: 'fit', title: 'Mos tariflar', flex: 1.2, render: i => (i.fitNow.length ? <Cell text={i.fitNow.map(tName).join(', ')} sub={i.fitLater.length ? `keyin: ${i.fitLater.map(tName).join(', ')}` : undefined} /> : <Pill text="Mos emas" tone="critical" icon="close-circle" />) },
    { key: 'status', title: 'Holat', width: 150, render: i => <View style={{ gap: 4, maxWidth: '100%' }}><Pill text={STATUS[i.lead.status].label} tone={STATUS[i.lead.status].tone} /><Flags i={i} /></View> },
    { key: 'at', title: 'Yuborildi', width: 104, align: 'right', render: i => <Cell text={ago(i.lead.at, now).replace(' oldin', '')} sub={dateHM(i.lead.at)} /> },
  ];

  const detail = current ? <LeadDetail key={current.lead.id + (current.lead.updatedAt ?? '')} info={current} now={now} onClose={() => setSel(null)} /> : null;
  return (
    <Page title="Arizalar" sub="Saytdagi «Haydovchi bo'ling» shaklidan · yangi ariza darhol shu yerda paydo bo'ladi">
      <View style={styles.tiles}>
        <StatTile icon="person-add" label="Yangi arizalar" value={String(stats.count('new'))} sub={stats.late ? `${stats.late} tasi ${SLA_MIN} daqiqadan beri javobsiz` : 'hammasiga vaqtida javob berilgan'} onPress={() => setTab('new')} />
        <StatTile icon="today" label="Bugun tushgan" value={String(stats.today)} sub={`jami ${infos.length} ta`} />
        <StatTile icon="time" label="O'rtacha javob" value={stats.reply == null ? '—' : stats.reply < 90 ? `${Math.round(stats.reply)} daq` : `${(stats.reply / 60).toFixed(1).replace('.', ',')} soat`} sub="ariza tushgandan bog'lanishgacha" />
        <StatTile icon="checkmark-done" label="Qabul qilingan" value={stats.conv == null ? '—' : `${Math.round(stats.conv * 100)}%`} sub={`${stats.count('approved')} qabul · ${stats.count('rejected')} rad`} />
      </View>
      <View style={styles.filters}>
        <Seg<Tab> items={[
          { id: 'new', label: 'Yangi', count: stats.count('new') }, { id: 'contacted', label: "Bog'lanildi", count: stats.count('contacted') },
          { id: 'approved', label: 'Qabul qilindi', count: stats.count('approved') }, { id: 'rejected', label: 'Rad etildi', count: stats.count('rejected') }, { id: 'all', label: 'Hammasi', count: infos.length },
        ]} value={tab} onChange={setTab} />
        <View style={[styles.search, { backgroundColor: c.surface2 }]}>
          <Ionicons name="search" size={16} color={c.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Ism, telefon, avtomobil" placeholderTextColor={c.faint} style={[styles.searchInput, { color: c.text }]} accessibilityLabel="Arizalarni qidirish" />
        </View>
      </View>
      <Cols>
        <Panel pad={false} style={{ flex: wide ? 1.7 : undefined, overflow: 'hidden' }}>
          {rows.length ? (
            <Table rows={rows} columns={columns} rowKey={i => i.lead.id} onRow={i => setSel(i.lead.id)} selected={sel} pageSize={30} />
          ) : (
            <Empty icon={tab === 'new' ? 'checkmark-done-circle' : 'document-text'} title={tab === 'new' ? "Yangi ariza yo'q" : "Bu bo'limda ariza yo'q"} sub={tab === 'new' ? "Saytdan yangi ariza kelganda shu yerda va menyuda belgi paydo bo'ladi" : undefined} />
          )}
        </Panel>
        {wide ? (
          <View style={{ flex: 1, minWidth: 0 }}>
            {detail ?? <Panel><Empty icon="hand-left" title="Arizani tanlang" sub="Avtomobil mosligi, tavsiya va amallar shu yerda ko'rinadi" /></Panel>}
          </View>
        ) : null}
      </Cols>
      {!wide ? (
        <Dialog visible={!!current} title={current?.lead.name ?? ''} onClose={() => setSel(null)}>
          {detail}
        </Dialog>
      ) : null}
    </Page>
  );
}

function Flags({ i }: { i: Info }) {
  if (i.driver) return <Pill text="Ilovada bor" tone="info" icon="person" />;
  if (i.late) return <Pill text="Kechikmoqda" tone="critical" icon="alarm" />;
  if (i.dupes) return <Pill text="Takroriy" tone="serious" icon="copy" />;
  if (i.issues.length) return <Pill text="Tekshirish kerak" tone="warning" icon="alert-circle" />;
  if (i.fitNow.includes('business') || i.fitNow.includes('comfort')) return <Pill text="Premium" tone="brand" icon="star" />;
  return null;
}

function LeadDetail({ info, now, onClose }: { info: Info; now: number; onClose: () => void }) {
  const { colors: c } = useStore();
  const runCmds = useRun();
  const { lead } = info;
  const [note, setNote] = useState(lead.note ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState(REJECT[0]);
  const car = findCar(lead.car);
  const dirty = note.trim() !== (lead.note ?? '').trim();

  const patch = async (p: { status?: LeadStatus; note?: string }, done: string, key: string) => {
    setBusy(key);
    const ok = await runCmds({ cmd: 'lead', id: lead.id, patch: dirty && p.note === undefined ? { ...p, note: note.trim() } : p }, done);
    setBusy(null);
    return ok;
  };
  const next = lead.status === 'new'
    ? `Qo'ng'iroq qiling: o'zingizni tanishtiring, ${info.fitNow.length ? `${info.fitNow.map(tName).join(', ')} tarif${info.fitNow.length > 1 ? 'lari' : 'i'}da ishlashi mumkinligini aytib, ` : ''}YUMS Driver ilovasini yuklab hujjatlarini yuborishini so'rang.`
    : lead.status === 'contacted'
      ? info.driver ? `${info.driver.name} ilovada ro'yxatdan o'tgan — hujjatlari tasdiqlansa arizani qabul qiling.` : "Ilovada ro'yxatdan o'tishi kutilmoqda: telefon raqami bir xil bo'lsa, profili shu yerda ko'rinadi."
      : lead.status === 'approved' ? 'Ariza yopilgan: haydovchi YUMSga qabul qilingan.' : 'Ariza rad etilgan.';

  return (
    <Panel>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.title, { color: c.text }]}>{lead.name}</Text>
          <Text style={[styles.phone, { color: c.text }]}>{phoneText(lead.phone)}</Text>
          <View style={styles.chips}>
            <Pill text={STATUS[lead.status].label} tone={STATUS[lead.status].tone} />
            <Pill text={langLabel(lead.lang ?? 'uz')} tone="muted" icon="language" />
            {info.late ? <Pill text={`${Math.round(info.waitMin)} daqiqadan beri javobsiz`} tone="critical" icon="alarm" /> : null}
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Yopish"><Ionicons name="close" size={22} color={c.muted} /></Pressable>
      </View>

      <View style={styles.row}>
        <Btn title="Qo'ng'iroq" icon="call" kind="dark" onPress={() => openUrl(`tel:${lead.phone.replace(/[^\d+]/g, '')}`)} />
        {info.driver ? <Btn title="Profil" icon="person" onPress={() => router.push(`/admin/drivers/${info.driver!.id}` as never)} /> : null}
      </View>

      <View style={[styles.box, { backgroundColor: c.surface2 }]}>
        <InfoRow label="Yuborildi" value={`${dateHM(lead.at)} · ${ago(lead.at, now)}`} />
        <InfoRow label="Shahar" value={lead.city ?? '—'} />
        <InfoRow label="Avtomobil" value={[lead.car ?? '—', lead.year, car ? CLASS_NAME[car.cls] : null].filter(Boolean).join(' · ')} />
        {lead.updatedAt && lead.status !== 'new' ? <InfoRow label="Oxirgi o'zgarish" value={dateHM(lead.updatedAt)} /> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: c.muted }]}>Tariflarga moslik</Text>
        {TARIFFS.map(t => {
          const ok = info.fitNow.includes(t.id), later = info.fitLater.includes(t.id);
          const why = !lead.car ? '' : tariffChecks(t.id, lead.car, lead.year, { docsApproved: true, rating: 5, trips: 0, activity: 100, deliveryTerms: true }).filter(ch => !ch.ok).map(ch => ch.now ? `${ch.label} (hozir: ${ch.now})` : ch.label).join('; ');
          return (
            <View key={t.id} style={styles.fit}>
              <Ionicons name={ok ? 'checkmark-circle' : later ? 'time' : 'close-circle'} size={17} color={ok ? STATUS_COLOR.good : later ? STATUS_COLOR.warning : c.faint} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fitName, { color: c.text }]}>{t.name}{ok ? '' : later ? ' — safarlar soni yetgach' : ''}</Text>
                {!ok && why ? <Text style={[styles.meta, { color: c.muted }]}>{why}</Text> : null}
              </View>
            </View>
          );
        })}
        {car ? <Text style={[styles.meta, { color: c.faint }]}>Katalog: {carTitle(car)} · {CLASS_NAME[car.cls]} · {car.seats} o&apos;rin</Text> : null}
      </View>

      {info.issues.length || info.dupes || info.driver ? (
        <View style={[styles.box, { backgroundColor: c.warnSoft }]}>
          {info.issues.map(x => <Warn key={x} text={x} />)}
          {info.dupes ? <Warn text={`Shu raqamdan yana ${info.dupes} ta ariza bor`} /> : null}
          {info.driver ? (
            <View style={styles.fit}>
              <Ionicons name="person" size={15} color={c.text} />
              <Text style={[styles.meta, { color: c.text, flex: 1 }]}>Ilovada ro&apos;yxatdan o&apos;tgan: {info.driver.name}{info.driver.plate ? ` · ${info.driver.plate}` : ''}</Text>
              <DocsPill d={info.driver} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.box, { backgroundColor: c.accentSoft }]}>
        <View style={styles.fit}>
          <Ionicons name="bulb" size={16} color={c.accent} />
          <Text style={[styles.meta, { color: c.text, flex: 1 }]}>{next}</Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: c.muted }]}>Izoh (faqat operatorlar ko&apos;radi)</Text>
        <TextInput value={note} onChangeText={setNote} multiline placeholder="Masalan: ertaga 10:00 da qayta qo'ng'iroq" placeholderTextColor={c.faint} accessibilityLabel="Izoh"
          style={[styles.note, { backgroundColor: c.surface2, color: c.text }]} maxLength={500} />
        {dirty ? <View style={{ alignSelf: 'flex-end' }}><Btn small title="Izohni saqlash" icon="save" loading={busy === 'note'} onPress={() => patch({ note: note.trim() }, 'Izoh saqlandi', 'note')} /></View> : null}
      </View>

      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {lead.status === 'new' ? <Btn title="Bog'landim" icon="call" kind="dark" loading={busy === 'contacted'} onPress={() => patch({ status: 'contacted' }, "Bog'lanildi deb belgilandi", 'contacted')} /> : null}
        {lead.status === 'new' || lead.status === 'contacted' ? (
          <>
            <Btn title="Qabul qilish" icon="checkmark-circle" kind={lead.status === 'contacted' ? 'dark' : 'ghost'} loading={busy === 'approved'} onPress={() => patch({ status: 'approved' }, 'Ariza qabul qilindi', 'approved')} />
            <Btn title="Rad etish" icon="close-circle" kind="danger" onPress={() => setReject(true)} />
          </>
        ) : (
          <Btn title="Qayta ochish" icon="refresh" loading={busy === 'new'} onPress={() => patch({ status: 'contacted' }, 'Ariza qayta ochildi', 'new')} />
        )}
      </View>

      <Dialog visible={reject} title={`Rad etish: ${lead.name}`} onClose={() => setReject(false)}
        footer={<><Btn title="Bekor qilish" onPress={() => setReject(false)} /><Btn title="Rad etish" icon="close-circle" kind="danger" loading={busy === 'rejected'}
          onPress={async () => {
            const text = [note.trim(), `Rad etildi: ${reason}`].filter(Boolean).join('\n');
            if (await patch({ status: 'rejected', note: text }, 'Ariza rad etildi', 'rejected')) setReject(false);
          }} /></>}>
        <Text style={[styles.meta, { color: c.muted }]}>Sabab izohga yoziladi — keyinroq arizani qayta ochish mumkin.</Text>
        <Choice items={REJECT.map(r => ({ id: r, label: r }))} value={reason} onChange={setReason} />
      </Dialog>
    </Panel>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.info}>
      <Text style={[styles.meta, { color: c.muted, width: 120 }]}>{label}</Text>
      <Text style={[styles.meta, { color: c.text, flex: 1, fontFamily: F.semi }]}>{value}</Text>
    </View>
  );
}

function Warn({ text }: { text: string }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.fit}>
      <Ionicons name="warning" size={15} color={STATUS_COLOR.serious} />
      <Text style={[styles.meta, { color: c.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, borderRadius: 12, paddingHorizontal: 12, flexGrow: 1, minWidth: 220, maxWidth: 380 },
  searchInput: { flex: 1, fontFamily: F.semi, fontSize: 13.5, height: 36 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontFamily: F.display, fontSize: 19, letterSpacing: -0.3 },
  phone: { fontFamily: F.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: { borderRadius: 14, padding: 12, gap: 8 },
  info: { flexDirection: 'row', gap: 10 },
  label: { fontFamily: F.semi, fontSize: 12.5 },
  meta: { fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
  fit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  fitName: { fontFamily: F.bold, fontSize: 13.5 },
  note: { minHeight: 84, borderRadius: 12, padding: 12, fontFamily: F.semi, fontSize: 14, textAlignVertical: 'top' },
});
