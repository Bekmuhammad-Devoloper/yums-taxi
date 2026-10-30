// Admin panel bloklari: sahifa, panel, ko'rsatkich kartasi, holat belgisi, grafiklar, jadval, tavsiya kartasi.
// Grafik ranglari dataviz palitrasidan (yorug'/qorong'i mavzu uchun alohida, ko'r-ranglilikka tekshirilgan).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { confirm } from '@/lib/confirm';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { useRun } from '@/site/lib/admin-store';
import type { OrderStatus } from '@/site/lib/admin-types';
import type { Insight, Level } from '@/site/lib/insights';

import { useLayout } from '../kit';

/* ---------- Ranglar ---------- */

/** Toifali qatorlar (tartib bilan, aylantirilmaydi) */
export const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
};
/** Holat ranglari — faqat belgi va matn bilan birga */
export const STATUS_COLOR = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };
export const LEVEL: Record<Level, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  critical: { color: STATUS_COLOR.critical, icon: 'alert-circle', label: 'Shoshilinch' },
  warn: { color: STATUS_COLOR.serious, icon: 'warning', label: 'Diqqat' },
  info: { color: '#2a78d6', icon: 'information-circle', label: "Ma'lumot" },
  good: { color: STATUS_COLOR.good, icon: 'checkmark-circle', label: 'Yaxshi' },
};

export function useSeries() {
  const { dark } = useStore();
  return dark ? SERIES.dark : SERIES.light;
}

/* ---------- Format ---------- */

export const num = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const money = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} mln so'm` : som(n));
export const hm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—');
export function ago(iso?: string, now = Date.now()) {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s} soniya oldin`;
  if (s < 3600) return `${Math.floor(s / 60)} daqiqa oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  return `${Math.floor(s / 86400)} kun oldin`;
}
export const dateHM = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? hm(iso) : `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${hm(iso)}`;
};

/** Jadvalni CSV fayl qilib yuklab olish (Excel kirill/lotin harflarini to'g'ri ochishi uchun BOM bilan) */
export function downloadCsv(name: string, head: string[], rows: unknown[][]) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['\ufeff' + [head, ...rows].map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  searching: { label: 'Haydovchi qidirilmoqda', tone: 'warning' },
  accepted: { label: "Haydovchi yo'lda", tone: 'info' },
  arrived: { label: 'Yetib keldi', tone: 'info' },
  started: { label: 'Safarda', tone: 'info' },
  finished: { label: 'Bajarildi', tone: 'good' },
  cancelled: { label: 'Bekor qilindi', tone: 'muted' },
  failed: { label: 'Haydovchi topilmadi', tone: 'critical' },
  noShow: { label: 'Mijoz chiqmadi', tone: 'serious' },
};

/* ---------- Joylashuv ---------- */

export function Page({ title, sub, actions, children, scroll = true }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode; scroll?: boolean }) {
  const { colors: c } = useStore();
  const { mid } = useLayout();
  const head = (
    <View style={[styles.pageHead, !mid && { flexDirection: 'column', alignItems: 'flex-start' }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.pageTitle, { color: c.text }]} accessibilityRole="header">{title}</Text>
        {sub ? <Text style={[styles.pageSub, { color: c.muted }]}>{sub}</Text> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
  if (!scroll) return <View style={[styles.page, { flex: 1, paddingHorizontal: mid ? 28 : 14 }]}>{head}{children}</View>;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.page, { paddingHorizontal: mid ? 28 : 14 }]}>
      {head}
      {children}
    </ScrollView>
  );
}

export function Panel({ title, sub, right, children, style, pad = true }: { title?: string; sub?: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean }) {
  const { colors: c } = useStore();
  return (
    <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.line }, !pad && { padding: 0 }, style]}>
      {title ? (
        <View style={[styles.panelHead, !pad && { padding: 16, paddingBottom: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.panelTitle, { color: c.text }]}>{title}</Text>
            {sub ? <Text style={[styles.panelSub, { color: c.muted }]}>{sub}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Ustunlar: kompyuterda yonma-yon, telefonda ustma-ust */
export function Cols({ children, gap = 16, at = 'wide', style }: { children: ReactNode; gap?: number; at?: 'wide' | 'mid'; style?: StyleProp<ViewStyle> }) {
  const l = useLayout();
  const row = at === 'wide' ? l.wide : l.mid;
  return <View style={[{ flexDirection: row ? 'row' : 'column', gap, alignItems: row ? 'flex-start' : 'stretch' }, style]}>{children}</View>;
}

/* ---------- Tugmalar va belgilar ---------- */

export function Btn({ title, icon, onPress, kind = 'ghost', disabled, loading, small }: {
  title: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void; kind?: 'brand' | 'dark' | 'ghost' | 'danger' | 'outline'; disabled?: boolean; loading?: boolean; small?: boolean;
}) {
  const { colors: c } = useStore();
  const bg = { brand: c.brand, dark: c.ink, ghost: c.surface2, danger: c.dangerSoft, outline: 'transparent' }[kind];
  const fg = { brand: c.brandText, dark: c.bg, ghost: c.text, danger: c.danger, outline: c.text }[kind];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={title}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.btn, small && styles.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : hovered ? 0.92 : 1 }, kind === 'outline' && { borderWidth: 1.5, borderColor: c.line }]}>
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons name={icon} size={small ? 15 : 17} color={fg} /> : null}
      <Text style={[styles.btnText, small && { fontSize: 13 }, { color: fg }]} numberOfLines={1}>{title}</Text>
    </Pressable>
  );
}

export type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'info' | 'muted' | 'brand';
export function Pill({ text, tone = 'muted', icon }: { text: string; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap }) {
  const { colors: c, dark } = useStore();
  const col = { good: STATUS_COLOR.good, warning: dark ? STATUS_COLOR.warning : '#9A6700', serious: dark ? STATUS_COLOR.serious : '#B4410F', critical: STATUS_COLOR.critical, info: dark ? '#6B9EEA' : '#1F5FAF', muted: c.muted, brand: c.brandDeep }[tone];
  const dot = { good: STATUS_COLOR.good, warning: STATUS_COLOR.warning, serious: STATUS_COLOR.serious, critical: STATUS_COLOR.critical, info: '#2a78d6', muted: c.faint, brand: c.brand }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.surface2 }]}>
      {icon ? <Ionicons name={icon} size={12} color={dot} /> : <View style={[styles.pillDot, { backgroundColor: dot }]} />}
      <Text style={[styles.pillText, { color: col }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

export function Seg<T extends string>({ items, value, onChange }: { items: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  const { colors: c } = useStore();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.seg, { backgroundColor: c.surface2 }]} style={{ flexGrow: 0 }}>
      {items.map(it => {
        const on = it.id === value;
        return (
          <Pressable key={it.id} onPress={() => onChange(it.id)} style={[styles.segItem, on && { backgroundColor: c.surface }]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={it.label}>
            <Text style={[styles.segText, { color: on ? c.text : c.muted }]}>{it.label}</Text>
            {it.count != null ? <Text style={[styles.segCount, { color: on ? c.text : c.faint }]}>{it.count}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ---------- Ko'rsatkichlar ---------- */

export function StatTile({ label, value, sub, delta, goodWhenUp = true, spark, icon, onPress }: {
  label: string; value: string; sub?: string; delta?: number | null; goodWhenUp?: boolean; spark?: number[]; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void;
}) {
  const { colors: c } = useStore();
  const good = delta != null && (delta >= 0) === goodWhenUp;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ hovered }: { hovered?: boolean }) => [styles.tile, { backgroundColor: c.surface, borderColor: hovered && onPress ? c.faint : c.line }]} accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.tileHead}>
        {icon ? <Ionicons name={icon} size={15} color={c.muted} /> : null}
        <Text style={[styles.tileLabel, { color: c.muted }]} numberOfLines={1}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1}>{value}</Text>
          {delta != null ? (
            <Text style={[styles.tileSub, { color: good ? STATUS_COLOR.good : STATUS_COLOR.critical }]}>{delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta * 100))}% <Text style={{ color: c.faint }}>o&apos;tgan haftaga</Text></Text>
          ) : sub ? <Text style={[styles.tileSub, { color: c.faint }]} numberOfLines={1}>{sub}</Text> : null}
        </View>
        {spark ? <SparkBars values={spark} /> : null}
      </View>
    </Pressable>
  );
}

/** 12 soatlik mini ustunlar: kulrang, oxirgisi — asosiy rangda */
export function SparkBars({ values }: { values: number[] }) {
  const { colors: c } = useStore();
  const s = useSeries();
  const max = Math.max(1, ...values);
  return (
    <View style={styles.spark} accessibilityLabel={`So'nggi 12 soat: ${values.join(', ')}`}>
      {values.map((v, i) => (
        <View key={i} style={{ width: 4, height: Math.max(2, (v / max) * 30), borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: i === values.length - 1 ? s[0] : c.surface3 }} />
      ))}
    </View>
  );
}

/** Ko'rsatkich chizig'i: to'ldirilgan qism holat rangida, qolgani — shu rangning och tusi */
export function Meter({ value, color, height = 10 }: { value: number; color: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: color + '2E', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Butunning qismlari: baland bo'lakli chiziq + nomlar (raqamlari bilan) */
export function SegmentBar({ parts }: { parts: { label: string; value: number }[] }) {
  const { colors: c } = useStore();
  const s = useSeries();
  const total = parts.reduce((n, p) => n + p.value, 0);
  const [w, setW] = useState(0);
  if (!total) return <Text style={[styles.small, { color: c.faint }]}>Hali ma&apos;lumot yo&apos;q</Text>;
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.segBar} onLayout={e => setW(e.nativeEvent.layout.width)} accessibilityLabel={parts.map(p => `${p.label}: ${p.value}`).join(', ')}>
        {parts.map((p, i) => {
          if (!p.value) return null;
          const share = p.value / total;
          const label = `${Math.round(share * 100)}%`;
          const fits = w * share > label.length * 8 + 12;
          return (
            <View key={p.label} style={[styles.segPart, { flex: p.value, backgroundColor: s[i % s.length] }]}>
              {fits ? <Text style={[styles.segLabel, { color: i === 3 ? '#0b0b0b' : '#fff' }]}>{label}</Text> : null}
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {parts.map((p, i) => (
          <View key={p.label} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: s[i % s.length] }]} />
            <Text style={[styles.small, { color: c.text }]}>{p.label}</Text>
            <Text style={[styles.small, { color: c.muted }]}>{num(p.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Tartiblangan gorizontal ustunlar (bitta rang) */
export function RankBars({ rows, format = num }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const { colors: c } = useStore();
  const s = useSeries();
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <View style={{ gap: 10 }}>
      {rows.map(r => (
        <View key={r.label} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[styles.small, { color: c.text }]}>{r.label}</Text>
            <Text style={[styles.small, { color: c.muted, fontVariant: ['tabular-nums'] }]}>{format(r.value)}</Text>
          </View>
          <View style={{ height: 8 }}>
            <View style={{ width: `${(r.value / max) * 100}%`, height: 8, borderRadius: 4, backgroundColor: s[0], minWidth: r.value ? 4 : 0 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Soatlik buyurtmalar: bugungi (ustun), prognoz (o'sha rangning och tusi) va o'tgan 7 kun o'rtachasi (kulrang chiziqcha).
 * Sichqoncha ustunga kelganda — o'sha soat qiymatlari; «Jadval» — hamma qiymatlar.
 */
export function HourlyChart({ today, avg, forecast, hour }: { today: number[]; avg: number[]; forecast: (number | null)[]; hour: number }) {
  const { colors: c } = useStore();
  const s = useSeries();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(4, ...today, ...avg, ...forecast.map(f => f ?? 0));
  const step = max > 40 ? 20 : max > 20 ? 10 : 5;
  const top = Math.ceil(max / step) * step;
  const H = 170;
  const ticks = [0, top / 2, top];
  const val = (h: number) => (h <= hour ? today[h] : forecast[h] ?? 0);
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.chartTop}>
        <View style={styles.legend}>
          <LegendKey color={s[0]} label="Bugun" />
          <LegendKey color={s[0] + '59'} label="Prognoz" />
          <LegendKey color={c.muted} label="7 kun o'rtachasi" line />
        </View>
        <Pressable onPress={() => setTable(t => !t)} accessibilityRole="button" accessibilityLabel={table ? 'Grafik' : 'Jadval'}>
          <Text style={[styles.link, { color: c.accent }]}>{table ? 'Grafik' : 'Jadval'}</Text>
        </Pressable>
      </View>
      {table ? (
        <View style={{ gap: 2 }}>
          <View style={styles.tRow}>{['Soat', 'Bugun', 'Prognoz', "O'rtacha"].map(h => <Text key={h} style={[styles.th, { color: c.muted }]}>{h}</Text>)}</View>
          {today.map((v, h) => (
            <View key={h} style={[styles.tRow, h === hour && { backgroundColor: c.surface2 }]}>
              <Text style={[styles.td, { color: c.text }]}>{String(h).padStart(2, '0')}:00</Text>
              <Text style={[styles.td, { color: c.text }]}>{h <= hour ? v : '—'}</Text>
              <Text style={[styles.td, { color: c.text }]}>{forecast[h] ?? '—'}</Text>
              <Text style={[styles.td, { color: c.text }]}>{avg[h].toFixed(1)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 28, height: H, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6 }}>
            {[...ticks].reverse().map(t => <Text key={t} style={[styles.axis, { color: c.faint }]}>{t}</Text>)}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ height: H }}>
              {ticks.map(t => <View key={t} style={[styles.grid, { bottom: (t / top) * H, backgroundColor: t === 0 ? c.faint + '66' : c.line }]} />)}
              <View style={styles.cols}>
                {today.map((_, h) => {
                  const future = h > hour;
                  const v = val(h);
                  const a = avg[h];
                  return (
                    <Pressable key={h} style={styles.colSlot} onHoverIn={() => setHover(h)} onHoverOut={() => setHover(x => (x === h ? null : x))} onPress={() => setHover(x => (x === h ? null : h))} onFocus={() => setHover(h)}
                      accessibilityLabel={`${String(h).padStart(2, '0')}:00 — ${future ? `prognoz ${forecast[h] ?? 0}` : `bugun ${today[h]}`}, o'rtacha ${a.toFixed(1)}`}>
                      {a > 0 ? <View style={[styles.avgTick, { bottom: (a / top) * H - 1, backgroundColor: c.muted }]} /> : null}
                      <View style={[styles.col, { height: Math.max(v ? 3 : 0, (v / top) * H), backgroundColor: future ? s[0] + '59' : s[0], opacity: hover != null && hover !== h ? 0.55 : 1 }]} />
                      {h === hour ? <View style={[styles.nowDot, { backgroundColor: s[0] }]} /> : null}
                    </Pressable>
                  );
                })}
              </View>
              {hover != null ? (
                <View pointerEvents="none" style={[styles.tip, { backgroundColor: c.surface, borderColor: c.line, left: `${Math.min(78, Math.max(0, (hover / 24) * 100 - 8))}%` }]}>
                  <Text style={[styles.tipTitle, { color: c.muted }]}>{String(hover).padStart(2, '0')}:00–{String((hover + 1) % 24).padStart(2, '0')}:00</Text>
                  {hover <= hour ? <TipRow color={s[0]} label="Bugun" value={String(today[hover])} /> : null}
                  {forecast[hover] != null && hover >= hour ? <TipRow color={s[0] + '59'} label="Prognoz" value={String(forecast[hover])} /> : null}
                  <TipRow color={c.muted} label="7 kun o'rtachasi" value={avg[hover].toFixed(1)} />
                </View>
              ) : null}
            </View>
            <View style={styles.xAxis}>
              {today.map((_, h) => <Text key={h} style={[styles.axis, styles.xTick, { color: h === hour ? c.text : c.faint }]}>{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</Text>)}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function LegendKey({ color, label, line }: { color: string; label: string; line?: boolean }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.legendItem}>
      <View style={line ? { width: 14, height: 2, borderRadius: 1, backgroundColor: color } : [styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.small, { color: c.text }]}>{label}</Text>
    </View>
  );
}

function TipRow({ color, label, value }: { color: string; label: string; value: string }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.tipRow}>
      <View style={{ width: 10, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <Text style={[styles.tipValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.small, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

/* ---------- Tavsiya kartasi ---------- */

export function InsightCard({ insight, compact }: { insight: Insight; compact?: boolean }) {
  const { colors: c } = useStore();
  const runCmds = useRun();
  const [busy, setBusy] = useState<number | null>(null);
  const lv = LEVEL[insight.level];
  const act = async (i: number) => {
    const a = insight.actions![i];
    if (a.to) { router.push(a.to as never); return; }
    if (!a.cmds) return;
    const go = async () => { setBusy(i); await runCmds(a.cmds!, a.done); setBusy(null); };
    if (a.confirm) confirm(a.label, a.confirm, go, 'Yuborish'); else go();
  };
  return (
    <View style={[styles.insight, { backgroundColor: c.surface, borderColor: c.line, borderLeftColor: lv.color }]} accessibilityLabel={`${lv.label}: ${insight.title}`}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={[styles.insIcon, { backgroundColor: lv.color + '1F' }]}><Ionicons name={insight.icon} size={18} color={lv.color} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.insTitle, { color: c.text }]}>{insight.title}</Text>
          </View>
          {!compact ? <Text style={[styles.insText, { color: c.muted }]}>{insight.text}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={lv.icon} size={12} color={lv.color} />
            <Text style={[styles.insLevel, { color: c.faint }]}>{lv.label}</Text>
          </View>
        </View>
        {insight.metric ? <Text style={[styles.insMetric, { color: c.text }]}>{insight.metric}</Text> : null}
      </View>
      {insight.actions?.length && !compact ? (
        <View style={styles.insActions}>
          {insight.actions.map((a, i) => <Btn key={a.label} small title={a.label} icon={a.to ? 'arrow-forward' : 'flash'} kind={i === 0 ? 'dark' : 'ghost'} loading={busy === i} onPress={() => act(i)} />)}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Jadval ---------- */

export type Column<T> = { key: string; title: string; flex?: number; width?: number; render: (row: T) => ReactNode; align?: 'left' | 'right' };

export function Table<T>({ rows, columns, onRow, empty = "Ma'lumot yo'q", rowKey, pageSize = 40, selected }: {
  rows: T[]; columns: Column<T>[]; onRow?: (row: T) => void; empty?: string; rowKey: (row: T) => string; pageSize?: number; selected?: string | null;
}) {
  const { colors: c } = useStore();
  const { mid } = useLayout();
  const [limit, setLimit] = useState(pageSize);
  if (!rows.length) return <Text style={[styles.small, { color: c.faint, padding: 16 }]}>{empty}</Text>;
  const shown = rows.slice(0, limit);
  return (
    <View>
      {mid ? (
        <View style={[styles.tHead, { borderBottomColor: c.line }]}>
          {columns.map(col => <Text key={col.key} style={[styles.th, { color: c.muted, flex: col.width ? undefined : col.flex ?? 1, width: col.width, textAlign: col.align ?? 'left' }]} numberOfLines={1}>{col.title}</Text>)}
        </View>
      ) : null}
      {shown.map(r => {
        const k = rowKey(r);
        return (
          <Pressable key={k} onPress={onRow ? () => onRow(r) : undefined} disabled={!onRow} accessibilityRole={onRow ? 'button' : undefined}
            style={({ hovered }: { hovered?: boolean }) => [mid ? styles.tr : styles.trCard, { borderBottomColor: c.line, backgroundColor: k === selected ? c.brandSoft : hovered && onRow ? c.surface2 : 'transparent' }]}>
            {columns.map(col => (
              <View key={col.key} style={mid ? { flex: col.width ? undefined : col.flex ?? 1, width: col.width, minWidth: 0, alignItems: col.align === 'right' ? 'flex-end' : 'flex-start', justifyContent: 'center' } : styles.cardCell}>
                {!mid ? <Text style={[styles.cardLabel, { color: c.faint }]}>{col.title}</Text> : null}
                {col.render(r)}
              </View>
            ))}
          </Pressable>
        );
      })}
      {rows.length > limit ? (
        <Pressable onPress={() => setLimit(l => l + pageSize)} style={styles.more} accessibilityRole="button">
          <Text style={[styles.link, { color: c.accent }]}>Yana {Math.min(pageSize, rows.length - limit)} ta ko&apos;rsatish ({rows.length - limit} ta qoldi)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Cell({ text, sub, strong, mono }: { text: string; sub?: string; strong?: boolean; mono?: boolean }) {
  const { colors: c } = useStore();
  return (
    <View style={{ gap: 1, flexShrink: 1, maxWidth: '100%' }}>
      <Text style={[strong ? styles.cellStrong : styles.cell, { color: c.text }, mono && { fontVariant: ['tabular-nums'] }]} numberOfLines={1}>{text}</Text>
      {sub ? <Text style={[styles.cellSub, { color: c.faint }]} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

export function Empty({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surface2 }]}><Ionicons name={icon} size={26} color={c.muted} /></View>
      <Text style={[styles.panelTitle, { color: c.text, textAlign: 'center' }]}>{title}</Text>
      {sub ? <Text style={[styles.small, { color: c.muted, textAlign: 'center' }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 22, paddingBottom: 48, gap: 16, width: '100%', maxWidth: 1480, alignSelf: 'center' },
  pageHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 2 },
  pageTitle: { fontFamily: F.heavy, fontSize: 26, letterSpacing: -0.8 },
  pageSub: { fontFamily: F.medium, fontSize: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  panel: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 14, minWidth: 0 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelTitle: { fontFamily: F.display, fontSize: 16.5, letterSpacing: -0.3 },
  panelSub: { fontFamily: F.medium, fontSize: 12.5, marginTop: 1 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, paddingHorizontal: 14, borderRadius: 12 },
  btnSmall: { height: 34, paddingHorizontal: 11, borderRadius: 10 },
  btnText: { fontFamily: F.bold, fontSize: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, maxWidth: '100%' },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: F.bold, fontSize: 12, flexShrink: 1 },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  segItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 9 },
  segText: { fontFamily: F.bold, fontSize: 13 },
  segCount: { fontFamily: F.heavy, fontSize: 12 },
  tile: { flexGrow: 1, flexBasis: 150, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8, minWidth: 0 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { fontFamily: F.semi, fontSize: 12.5 },
  tileValue: { fontFamily: F.heavy, fontSize: 26, letterSpacing: -0.8 },
  tileSub: { fontFamily: F.semi, fontSize: 12 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 30 },
  small: { fontFamily: F.semi, fontSize: 12.5 },
  link: { fontFamily: F.bold, fontSize: 13 },
  segBar: { flexDirection: 'row', height: 28, gap: 2 },
  segPart: { borderRadius: 4, justifyContent: 'center', paddingHorizontal: 6, minWidth: 2 },
  segLabel: { fontFamily: F.heavy, fontSize: 11.5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  chartTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  cols: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, flexDirection: 'row', alignItems: 'flex-end' },
  colSlot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  col: { width: '56%', maxWidth: 18, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  avgTick: { position: 'absolute', width: '78%', maxWidth: 24, height: 2, borderRadius: 1 },
  nowDot: { position: 'absolute', bottom: -9, width: 5, height: 5, borderRadius: 3 },
  xAxis: { flexDirection: 'row', marginTop: 8 },
  xTick: { flex: 1, textAlign: 'center' },
  axis: { fontFamily: F.semi, fontSize: 10.5, fontVariant: ['tabular-nums'] },
  tip: { position: 'absolute', top: 0, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 10, gap: 4, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.14)' },
  tipTitle: { fontFamily: F.semi, fontSize: 11.5 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tipValue: { fontFamily: F.heavy, fontSize: 14 },
  tRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6 },
  th: { flex: 1, fontFamily: F.bold, fontSize: 12 },
  td: { flex: 1, fontFamily: F.semi, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  insight: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 4, padding: 14, gap: 12 },
  insIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  insTitle: { fontFamily: F.bold, fontSize: 14.5, lineHeight: 20 },
  insText: { fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
  insLevel: { fontFamily: F.semi, fontSize: 11.5 },
  insMetric: { fontFamily: F.heavy, fontSize: 20, letterSpacing: -0.5 },
  insActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tHead: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  tr: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  trCard: { padding: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  cardCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardLabel: { fontFamily: F.semi, fontSize: 12 },
  cell: { fontFamily: F.semi, fontSize: 13.5 },
  cellStrong: { fontFamily: F.bold, fontSize: 14 },
  cellSub: { fontFamily: F.medium, fontSize: 12 },
  more: { padding: 14, alignItems: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 16 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
