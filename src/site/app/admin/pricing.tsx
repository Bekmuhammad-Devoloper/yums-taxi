// Narxlar va hududlar: yuqori talab hududlari (xaritada belgilanadi), talab/taklif tahlili va tavsiyalar,
// tariflar narxi va komissiya. Har bir o'zgarish serverdan darhol yo'lovchi, haydovchi ilovalari va saytga yetadi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { confirm } from '@/lib/confirm';
import { PLACES, TARIFFS, type LatLng, type Tariff } from '@/lib/data';
import { distanceKm, priceFor, som } from '@/lib/geo';
import { DEFAULT_COMMISSION, surgeLevel, zoneActive, type SurgeZone, type TariffPatch } from '@/lib/remote-config';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { PickerModal, useLayout } from '@/site/components/kit';
import { Choice } from '@/site/components/admin/dialogs';
import OpsMap from '@/site/components/admin/ops-map';
import { Btn, Cell, Cols, Empty, Page, Panel, Pill, STATUS_COLOR, Table, hm, money, type Column, type Tone } from '@/site/components/admin/ui';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import type { LiveDriver, OrderRec } from '@/site/lib/admin-types';
import { districtOf, type Hotspot } from '@/site/lib/insights';

type Field = 'base' | 'perKm' | 'perMin' | 'minFare';
const FIELDS: { k: Field; label: string; max: number }[] = [
  { k: 'base', label: "Boshlang'ich", max: 1e6 },
  { k: 'perKm', label: 'Har km', max: 1e5 },
  { k: 'perMin', label: 'Har daqiqa', max: 1e5 },
  { k: 'minFare', label: 'Eng kam narx', max: 1e6 },
];
/** Narx namunasi: shahar ichidagi o'rtacha safar */
const SAMPLE = { km: 8, min: 18 };
const RADII = ['0.8', '1', '1.5', '2', '3'];
const SURGES = ['1.2', '1.3', '1.5', '1.8', '2'];
const DURATIONS = [{ id: '30', label: '30 daqiqa' }, { id: '60', label: '1 soat' }, { id: '120', label: '2 soat' }, { id: '240', label: '4 soat' }, { id: '0', label: 'Muddatsiz' }];
const COMMISSIONS = [0.05, 0.08, 0.1, 0.12, 0.15, 0.2];
const SURGE_TONE: Record<1 | 2 | 3, Tone> = { 1: 'warning', 2: 'serious', 3: 'critical' };

const untilIn = (min: number) => (min ? new Date(Date.now() + min * 60000).toISOString() : undefined);
/** Hudud muddatini uzaytirish: hozirgi tugash vaqtidan (o'tib ketgan bo'lsa — hozirdan) */
const extended = (z: SurgeZone, min: number) => new Date(Math.max(Date.now(), z.until ? Date.parse(z.until) : 0) + min * 60000).toISOString();
const pctText = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
const kmText = (r: number) => `${String(r).replace('.', ',')} km`;
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function leftText(until: string | undefined, now: number) {
  if (!until) return 'muddatsiz';
  const m = Math.max(0, Math.round((Date.parse(until) - now) / 60000));
  const h = Math.floor(m / 60);
  return `${h ? `${h} soat ` : ''}${m % 60} daq qoldi · ${hm(until)} gacha`;
}

type Draft = { center: LatLng; label: string; radiusKm: number; surge: number; minutes: number };
type Inside = { waiting: number; free: number; recent: number };

export default function Pricing() {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const { state, list, derived } = useAdmin();
  const runCmds = useRun();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [focusAt, setFocusAt] = useState<LatLng[] | null>(null);
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const now = derived?.at ?? 0;

  const zones = useMemo(() => state.config.zones.filter(z => zoneActive(z, now)), [state.config.zones, now]);
  const live = useMemo(() => Object.values(state.live).filter((l): l is LiveDriver & { pos: LatLng } => !!l.pos && !l.pending && !state.drivers[l.id]?.blocked), [state.live, state.drivers]);
  const waiting = useMemo(() => list.filter(o => o.status === 'searching'), [list]);
  const recentOrders = useMemo(() => list.slice(-400).filter(o => now - Date.parse(o.createdAt) <= 15 * 60000), [list, now]);
  const spots = useMemo(() => (derived?.spots ?? []).filter(h => h.demand > 0), [derived?.spots]);
  const recs = spots.filter(h => h.surge > 1 && !h.covered);

  const inside = (z: { center: LatLng; radiusKm: number }): Inside => ({
    waiting: waiting.filter(o => distanceKm(o.pickup, z.center) <= z.radiusKm).length,
    free: live.filter(l => !l.busy && distanceKm(l.pos, z.center) <= z.radiusKm).length,
    recent: recentOrders.filter((o: OrderRec) => distanceKm(o.pickup, z.center) <= z.radiusKm).length,
  });

  const begin = (p: LatLng, label?: string, surge?: number, fly = false) => {
    setDraft(d => ({ center: { latitude: p.latitude, longitude: p.longitude }, label: label ?? districtOf(p).title, radiusKm: d?.radiusKm ?? 1.5, surge: surge ?? d?.surge ?? 1.3, minutes: d?.minutes ?? 60 }));
    if (fly) setFocusAt([{ latitude: p.latitude, longitude: p.longitude }]);
  };

  const enable = async (zone: { label?: string; center: LatLng; radiusKm: number; surge: number; until?: string; id?: string }, done: string, key: string) => {
    setBusy(key);
    const ok = await runCmds({ cmd: 'zone', zone }, done);
    setBusy(null);
    return ok;
  };
  const saveDraft = async () => {
    if (!draft) return;
    const ok = await enable({ label: draft.label.trim() || undefined, center: draft.center, radiusKm: draft.radiusKm, surge: draft.surge, until: untilIn(draft.minutes) }, `Hudud yoqildi: ×${draft.surge}`, 'draft');
    if (ok) setDraft(null);
  };
  const quick = (h: Hotspot) => enable({ label: h.place.title, center: { latitude: h.place.latitude, longitude: h.place.longitude }, radiusKm: 1.5, surge: h.surge, until: untilIn(30) }, `${h.place.title}: ×${h.surge} yoqildi`, h.place.id!);
  const quickAll = () => confirm('Tavsiyalarni yoqish', recs.map(h => `${h.place.title} — ×${h.surge}`).join('\n') + '\n\nHar biri 1,5 km radiusda, 30 daqiqaga yoqiladi.', async () => {
    setBusy('all');
    await runCmds(recs.map(h => ({ cmd: 'zone' as const, zone: { label: h.place.title, center: { latitude: h.place.latitude, longitude: h.place.longitude }, radiusKm: 1.5, surge: h.surge, until: untilIn(30) } })), `${recs.length} ta hudud yoqildi`);
    setBusy(null);
  }, 'Yoqish');
  const remove = (z: SurgeZone) => confirm("Hududni o'chirish", `${z.label ?? 'Hudud'} (×${z.surge}) o'chirilsinmi? Narx darhol odatiy holatga qaytadi.`, () => { runCmds({ cmd: 'zoneRemove', id: z.id }, "Hudud o'chirildi"); }, "O'chirish");

  const draftZone = useMemo(() => (draft ? { center: draft.center, radiusKm: draft.radiusKm, surge: draft.surge } : null), [draft]);
  const mapOrders = useMemo(() => waiting.slice(-150), [waiting]);
  const draftIn = draft ? inside(draft) : null;
  const overlap = draft ? zones.find(z => distanceKm(z.center, draft.center) < z.radiusKm + draft.radiusKm) : undefined;
  const nearRec = draft ? spots.find(h => h.surge > 1 && distanceKm(h.place, draft.center) <= Math.max(1, draft.radiusKm)) : undefined;
  const start = TARIFFS[0];

  const spotCols: Column<Hotspot>[] = [
    { key: 'place', title: 'Hudud', flex: 2, render: h => <Cell strong text={h.place.title} sub={h.place.subtitle} /> },
    { key: 'waiting', title: 'Kutmoqda', width: 86, align: 'right', render: h => <Cell mono text={String(h.waiting)} /> },
    { key: 'recent', title: '15 daqiqada', width: 96, align: 'right', render: h => <Cell mono text={String(h.recent)} /> },
    { key: 'free', title: "Bo'sh haydovchi", width: 120, align: 'right', render: h => <Cell mono text={String(h.free)} sub="2 km ichida" /> },
    { key: 'state', title: 'Holat', width: 190, render: h => (h.covered ? <Pill text="Hudud yoqilgan" tone="good" icon="checkmark-circle" /> : h.surge > 1 ? <Pill text={`Tavsiya ×${h.surge.toFixed(1)}`} tone="serious" icon="flame" /> : <Pill text="Muvozanatda" tone="good" icon="checkmark-circle" />) },
    { key: 'act', title: '', width: 120, align: 'right', render: h => (h.surge > 1 && !h.covered ? <Btn small title="Yoqish" icon="flash" kind="dark" loading={busy === h.place.id} onPress={() => quick(h)} /> : <Btn small title="Sozlash" onPress={() => begin(h.place, h.place.title, h.surge > 1 ? h.surge : undefined, true)} />) },
  ];

  return (
    <Page title="Narxlar va hududlar" sub="O'zgarish darhol yo'lovchi va haydovchi ilovalari hamda saytdagi narxlarga yetadi">
      {recs.length ? (
        <Panel title="Aqlli tavsiya" sub="Talab bo'sh haydovchilardan ancha ko'p — koeffitsient haydovchilarni shu hududga jalb qiladi"
          right={recs.length > 1 ? <Btn small title={`Hammasini yoqish (${recs.length})`} icon="flash" kind="dark" loading={busy === 'all'} onPress={quickAll} /> : undefined}>
          <View style={styles.recs}>
            {recs.slice(0, 4).map(h => (
              <View key={h.place.id} style={[styles.rec, { backgroundColor: c.surface2, flexBasis: wide ? '45%' : '100%' }]}>
                <View style={[styles.recIcon, { backgroundColor: c.dangerSoft }]}><Ionicons name="flame" size={18} color={STATUS_COLOR.critical} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.strong, { color: c.text }]}>{h.place.title}: ×{h.surge.toFixed(1)}</Text>
                  <Text style={[styles.meta, { color: c.muted }]}>{h.waiting} ta buyurtma kutmoqda, 15 daqiqada {h.recent} ta, yaqinida {h.free} ta bo&apos;sh haydovchi</Text>
                </View>
                <Btn small title="Sozlash" onPress={() => begin(h.place, h.place.title, h.surge, true)} />
                <Btn small title="30 daq" icon="flash" kind="dark" loading={busy === h.place.id} onPress={() => quick(h)} />
              </View>
            ))}
          </View>
        </Panel>
      ) : null}

      <Cols>
        <Panel title="Hudud xaritasi" sub={draft ? 'Markazni o\'zgartirish uchun xaritani bosing' : 'Yangi hudud uchun xaritani bosing yoki joyni tanlang'} pad={false} style={{ flex: wide ? 1.6 : undefined }}
          right={<View style={{ paddingRight: 0 }}><Btn small title="Joy tanlash" icon="search" onPress={() => setPick(true)} /></View>}>
          <View style={[styles.map, { height: wide ? 470 : 340 }]}>
            <OpsMap drivers={state.drivers} live={live} orders={mapOrders} zones={zones} hotspots={derived?.spots} onMapClick={p => begin(p)} draftZone={draftZone} focus={focusAt} />
          </View>
        </Panel>

        <View style={{ flex: wide ? 1 : undefined, gap: 16, minWidth: 0 }}>
          {draft ? (
            <Panel title="Yangi hudud" sub={`Markaz: ${draft.center.latitude.toFixed(4)}, ${draft.center.longitude.toFixed(4)}`}>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: c.muted }]}>Nomi</Text>
                <TextInput value={draft.label} onChangeText={v => setDraft({ ...draft, label: v })} placeholder="Masalan: Chorsu bozori" placeholderTextColor={c.faint} accessibilityLabel="Hudud nomi"
                  style={[styles.input, { backgroundColor: c.surface2, color: c.text }]} maxLength={60} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: c.muted }]}>Koeffitsient</Text>
                <Choice items={SURGES.map(s => ({ id: s, label: `×${s.replace('.', ',')}` }))} value={String(draft.surge)} onChange={v => setDraft({ ...draft, surge: Number(v) })} />
                {nearRec && nearRec.surge !== draft.surge ? (
                  <Text style={[styles.meta, { color: c.muted }]}>Tahlil bo&apos;yicha tavsiya: <Text style={{ color: c.text, fontFamily: F.bold }} onPress={() => setDraft({ ...draft, surge: nearRec.surge })}>×{nearRec.surge.toFixed(1)}</Text></Text>
                ) : null}
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: c.muted }]}>Radius</Text>
                <Choice items={RADII.map(r => ({ id: r, label: kmText(Number(r)) }))} value={String(draft.radiusKm)} onChange={v => setDraft({ ...draft, radiusKm: Number(v) })} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: c.muted }]}>Muddat</Text>
                <Choice items={DURATIONS} value={String(draft.minutes)} onChange={v => setDraft({ ...draft, minutes: Number(v) })} />
              </View>
              <View style={[styles.box, { backgroundColor: c.surface2 }]}>
                <Line icon="hourglass" text={`Hudud ichida ${draftIn!.waiting} ta buyurtma kutmoqda, 15 daqiqada ${draftIn!.recent} ta tushgan`} />
                <Line icon="car-sport" text={`${draftIn!.free} ta bo'sh haydovchi`} />
                <Line icon="pricetag" text={`${start.name}, ${SAMPLE.km} km: ${som(priceFor(start, SAMPLE.km, SAMPLE.min))} → ${som(priceFor(start, SAMPLE.km, SAMPLE.min, draft.surge))}`} />
                {overlap ? <Line icon="warning" text={`«${overlap.label ?? 'Hudud'}» (×${overlap.surge}) bilan kesishadi — kesishgan joyda kattasi amal qiladi`} warn /> : null}
              </View>
              <View style={styles.row}>
                <Btn title="Bekor qilish" onPress={() => setDraft(null)} />
                <View style={{ flex: 1 }} />
                <Btn title="Hududni yoqish" icon="flame" kind="dark" loading={busy === 'draft'} onPress={saveDraft} />
              </View>
            </Panel>
          ) : null}

          <Panel title="Faol hududlar" sub={zones.length ? `${zones.length} ta · yo'lovchi narxida va haydovchi xaritasida ko'rinadi` : undefined}>
            {zones.length ? zones.map(z => {
              const lv = surgeLevel(z.surge);
              const inn = inside(z);
              return (
                <View key={z.id} style={[styles.zone, { borderColor: c.line }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pill text={`×${z.surge.toFixed(1)}`} tone={SURGE_TONE[lv]} icon="flame" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.strong, { color: c.text }]} numberOfLines={1}>{z.label ?? 'Hudud'}</Text>
                      <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>{kmText(z.radiusKm)} · {leftText(z.until, now)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.meta, { color: c.muted }]}>Ichida: {inn.waiting} ta kutmoqda · {inn.free} ta bo&apos;sh haydovchi · 15 daqiqada {inn.recent} ta buyurtma</Text>
                  <View style={styles.row}>
                    {z.until ? <Btn small title="+30 daq" icon="time" loading={busy === z.id} onPress={() => enable({ ...z, until: extended(z, 30) }, `${z.label ?? 'Hudud'}: muddat uzaytirildi`, z.id)} /> : null}
                    <Btn small title="Xaritada" icon="locate" onPress={() => setFocusAt([z.center])} />
                    <View style={{ flex: 1 }} />
                    <Btn small title="O'chirish" icon="trash" kind="danger" onPress={() => remove(z)} />
                  </View>
                </View>
              );
            }) : (
              <Empty icon="flame" title="Faol hudud yo'q" sub={recs.length ? 'Yuqoridagi tavsiyani yoqing yoki xaritada belgilang' : "Talab va taklif muvozanatda — butun shaharda odatiy narx"} />
            )}
          </Panel>
        </View>
      </Cols>

      <Panel title="Talab va taklif" sub="So'nggi 20 daqiqa, joylar bo'yicha · har 2 soniyada yangilanadi" pad={false} style={{ overflow: 'hidden' }}>
        <View style={{ marginTop: 6 }}>
          <Table rows={spots} columns={spotCols} rowKey={h => h.place.id!} pageSize={10} empty="So'nggi 20 daqiqada buyurtma tushmagan" />
        </View>
      </Panel>

      <Panel title="Tariflar" sub={`Narx namunasi — ${SAMPLE.km} km, ${SAMPLE.min} daqiqalik safar. Bo'sh qoldirilgan tarif standart narxda ishlaydi`}>
        {TARIFFS.map(t => {
          const patch = state.config.tariffs[t.id];
          return <TariffEditor key={`${t.id}:${JSON.stringify(patch ?? {})}`} t={t} patch={patch} />;
        })}
      </Panel>

      <Commission />

      <PickerModal visible={pick} title="Joy tanlash" items={PLACES.map(p => ({ id: p.id!, title: p.title, sub: p.subtitle }))} onClose={() => setPick(false)}
        onPick={id => { const p = PLACES.find(x => x.id === id)!; begin(p, p.title, undefined, true); }} searchPlaceholder="Joy nomi" />
    </Page>
  );
}

function Line({ icon, text, warn }: { icon: keyof typeof Ionicons.glyphMap; text: string; warn?: boolean }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={15} color={warn ? STATUS_COLOR.serious : c.muted} />
      <Text style={[styles.meta, { color: c.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

/* ---------- Tarif narxi ---------- */

function TariffEditor({ t, patch }: { t: Tariff; patch?: TariffPatch }) {
  const { colors: c } = useStore();
  const { mid } = useLayout();
  const runCmds = useRun();
  const eff: Tariff = { ...t, ...patch };
  const [vals, setVals] = useState<Record<Field, string>>(() => ({ base: String(eff.base), perKm: String(eff.perKm), perMin: String(eff.perMin), minFare: String(eff.minFare) }));
  const [busy, setBusy] = useState(false);
  const parsed = Object.fromEntries(FIELDS.map(f => [f.k, Number(vals[f.k].replace(/\s/g, ''))])) as Record<Field, number>;
  const bad = FIELDS.filter(f => !vals[f.k].trim() || !Number.isFinite(parsed[f.k]) || parsed[f.k] < 0 || parsed[f.k] > f.max);
  const dirty = FIELDS.some(f => parsed[f.k] !== eff[f.k]);
  const custom = !!patch && Object.keys(patch).length > 0;
  const next: Tariff = bad.length ? eff : { ...t, ...parsed };
  const std = priceFor(t, SAMPLE.km, SAMPLE.min);
  const sample = priceFor(next, SAMPLE.km, SAMPLE.min);
  const diff = sample / std - 1;
  const warn = bad.length ? "Qiymat noto'g'ri — faqat musbat son kiriting"
    : diff >= 0.3 ? `Standartdan ${pctText(diff)} qimmat — buyurtmalar kamayishi mumkin`
    : diff <= -0.2 ? `Standartdan ${pctText(diff)} arzon — haydovchilar daromadi kamayadi`
    : next.minFare < next.base ? "Eng kam narx boshlang'ich to'lovdan kichik — u hech qachon qo'llanmaydi" : null;

  const save = async () => {
    const p: TariffPatch = {};
    for (const f of FIELDS) if (parsed[f.k] !== t[f.k]) p[f.k] = parsed[f.k];
    setBusy(true);
    await runCmds({ cmd: 'config', patch: { tariffs: { [t.id]: Object.keys(p).length ? p : null } } }, `${t.name}: narx saqlandi`);
    setBusy(false);
  };
  const reset = () => confirm('Standart narx', `${t.name} tarifi standart narxga qaytarilsinmi?`, async () => {
    setBusy(true);
    await runCmds({ cmd: 'config', patch: { tariffs: { [t.id]: null } } }, `${t.name}: standart narx`);
    setBusy(false);
  }, 'Qaytarish');

  return (
    <View style={[styles.tariff, { borderColor: c.line }, mid && { flexDirection: 'row', alignItems: 'flex-start' }]}>
      <View style={{ width: mid ? 150 : undefined, gap: 4 }}>
        <Text style={[styles.strong, { color: c.text }]}>{t.name}</Text>
        <Text style={[styles.meta, { color: c.muted }]}>{t.desc}</Text>
        {custom ? <Pill text="O'zgartirilgan" tone="brand" icon="create" /> : <Pill text="Standart" tone="muted" />}
      </View>
      <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
        <View style={styles.inputs}>
          {FIELDS.map(f => {
            const changed = parsed[f.k] !== t[f.k];
            return (
              <View key={f.k} style={styles.inputBox}>
                <Text style={[styles.label, { color: c.muted }]}>{f.label}</Text>
                <TextInput value={vals[f.k]} onChangeText={v => setVals(s => ({ ...s, [f.k]: v.replace(/[^\d]/g, '') }))} inputMode="numeric" accessibilityLabel={`${t.name}: ${f.label}`}
                  style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: changed ? c.brand : 'transparent' }, bad.includes(f) && { borderColor: STATUS_COLOR.critical }]} />
                <Text style={[styles.hint, { color: c.faint }]}>{changed ? `standart ${fmt(t[f.k])}` : "so'm"}</Text>
              </View>
            );
          })}
        </View>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          <Text style={[styles.meta, { color: c.text }]}>
            Namuna: <Text style={{ fontFamily: F.heavy }}>{som(sample)}</Text>
            {sample !== std ? <Text style={{ color: c.muted }}>  · standart {som(std)} ({pctText(diff)})</Text> : null}
          </Text>
          <View style={{ flex: 1 }} />
          {custom ? <Btn small title="Standartga qaytarish" icon="refresh" onPress={reset} /> : null}
          <Btn small title="Saqlash" icon="checkmark" kind="dark" disabled={!dirty || !!bad.length} loading={busy} onPress={save} />
        </View>
        {warn ? (
          <View style={styles.line}>
            <Ionicons name="warning" size={15} color={bad.length ? STATUS_COLOR.critical : STATUS_COLOR.serious} />
            <Text style={[styles.meta, { color: c.text, flex: 1 }]}>{warn}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ---------- Komissiya ---------- */

function Commission() {
  const { colors: c } = useStore();
  const { state, derived } = useAdmin();
  const runCmds = useRun();
  const cur = state.config.commission ?? DEFAULT_COMMISSION;
  const k = derived?.kpis;
  const short = k && k.searching > k.free + 2;
  const set = (v: number) => {
    if (v === cur) return;
    confirm(`Komissiya ${Math.round(v * 100)}%`, `Haydovchi har safardan ${Math.round((1 - v) * 100)}% oladi. Yangi safarlarga darhol qo'llanadi, haydovchi ilovasidagi daromad ham shunga ko'ra hisoblanadi.`,
      () => { runCmds({ cmd: 'config', patch: { commission: v === DEFAULT_COMMISSION ? null : v } }, `Komissiya: ${Math.round(v * 100)}%`); }, "O'zgartirish");
  };
  return (
    <Panel title="Komissiya" sub="YUMS har bir bajarilgan safar summasidan oladigan ulush">
      <Choice items={COMMISSIONS.map(v => ({ id: String(v), label: `${Math.round(v * 100)}%${v === DEFAULT_COMMISSION ? ' · standart' : ''}` }))} value={String(cur)} onChange={v => set(Number(v))} />
      <View style={[styles.box, { backgroundColor: c.surface2 }]}>
        <Line icon="calculator" text={`100 000 so'mlik safardan: YUMS — ${fmt(100000 * cur)} so'm, haydovchi — ${fmt(100000 * (1 - cur))} so'm`} />
        {k ? <Line icon="cash" text={`Bugun: safarlar ${money(k.gross)} · YUMS daromadi ${money(Math.round(k.gross * cur))} · haydovchilarga ${money(Math.round(k.gross * (1 - cur)))}`} /> : null}
        {short ? <Line icon="bulb" text={`Hozir ${k!.searching} ta buyurtmaga ${k!.free} ta bo'sh haydovchi. Komissiyani vaqtincha pasaytirish yoki hudud koeffitsienti ko'proq haydovchini liniyaga chiqaradi.`} warn /> : null}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  recs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rec: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  recIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  map: { marginTop: 12, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  strong: { fontFamily: F.bold, fontSize: 14.5 },
  meta: { fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: F.semi, fontSize: 12.5 },
  hint: { fontFamily: F.semi, fontSize: 11.5 },
  input: { height: 44, borderRadius: 12, paddingHorizontal: 12, fontFamily: F.bold, fontSize: 15, borderWidth: 1.5, borderColor: 'transparent', fontVariant: ['tabular-nums'] },
  box: { borderRadius: 14, padding: 12, gap: 8 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zone: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  tariff: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, gap: 14 },
  inputs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inputBox: { flexGrow: 1, flexBasis: 120, gap: 5 },
});
