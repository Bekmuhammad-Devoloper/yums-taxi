// Admin panel qobig'i: chap menyu (kompyuterda), yuqori panel, telefonda ochiladigan menyu, kirish oynasi
// va tezkor qidiruv / buyruqlar oynasi (Ctrl+K).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { LOGO_EMBLEM } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { PLACES } from '@/lib/data';
import { fmtDay, fmtTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import type { AdminCmd } from '@/site/lib/admin-types';

import { useLayout } from '../kit';
import { ORDER_STATUS, dateHM } from './ui';

type NavItem = { to: string; icon: keyof typeof Ionicons.glyphMap; label: string; badge?: number; tone?: 'warn' | 'info' };

function useNav(): NavItem[] {
  const { state, derived } = useAdmin();
  const searching = Object.values(state.orders).filter(o => o.status === 'searching').length;
  const newLeads = state.leads.filter(l => l.status === 'new').length;
  return [
    { to: '/admin', icon: 'grid', label: 'Boshqaruv' },
    { to: '/admin/orders', icon: 'receipt', label: 'Buyurtmalar', badge: searching, tone: 'warn' },
    { to: '/admin/drivers', icon: 'people', label: 'Haydovchilar' },
    { to: '/admin/documents', icon: 'document-text', label: 'Hujjatlar', badge: derived?.pendingDocs, tone: 'warn' },
    { to: '/admin/pricing', icon: 'pricetags', label: 'Narx va hududlar' },
    { to: '/admin/leads', icon: 'person-add', label: 'Arizalar', badge: newLeads, tone: 'info' },
    { to: '/admin/content', icon: 'create', label: 'Sayt matni' },
    { to: '/admin/log', icon: 'list', label: 'Jurnal' },
  ];
}

const isActive = (path: string, to: string) => (to === '/admin' ? path === '/admin' || path === '/admin/' : path.startsWith(to));

export function Shell({ children }: { children: ReactNode }) {
  const { colors: c } = useStore();
  const { wide, xl } = useLayout();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  // Ctrl+K (yoki «/») — tezkor qidiruv
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea/i.test((e.target as HTMLElement)?.tagName ?? '');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
      else if (e.key === '/' && !typing) { e.preventDefault(); setPalette(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
      {wide ? <Sidebar compact={!xl} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Topbar onMenu={() => setDrawer(true)} onSearch={() => setPalette(true)} />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
      {!wide ? (
        <Modal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}>
          <Pressable style={[styles.drawerBg, { backgroundColor: c.overlay }]} onPress={() => setDrawer(false)}>
            <Pressable style={[styles.drawer, { backgroundColor: c.surface }]} onPress={() => {}}>
              <Sidebar onNavigate={() => setDrawer(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
      <CommandPalette visible={palette} onClose={() => setPalette(false)} />
    </View>
  );
}

function Sidebar({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { colors: c, dark, setTheme } = useStore();
  const { mode, conn, logout } = useAdmin();
  const nav = useNav();
  const path = usePathname();
  const go = (to: string) => { onNavigate?.(); router.push(to as never); };
  return (
    <View style={[styles.side, { backgroundColor: c.surface, borderRightColor: c.line, width: compact ? 76 : 248 }]}>
      <View style={[styles.brand, compact && { justifyContent: 'center' }]}>
        <Image source={LOGO_EMBLEM} style={{ width: 34, height: 34, borderRadius: 17 }} />
        {!compact ? <Text style={[styles.brandText, { color: c.text }]}>YUMS <Text style={{ color: '#E0A800' }}>Admin</Text></Text> : null}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2, paddingVertical: 6 }}>
        {nav.map(n => {
          const on = isActive(path, n.to);
          return (
            <Pressable key={n.to} onPress={() => go(n.to)} accessibilityRole="link" accessibilityLabel={n.label} accessibilityState={{ selected: on }}
              style={({ hovered }: { hovered?: boolean }) => [styles.navItem, compact && { justifyContent: 'center', paddingHorizontal: 0 }, { backgroundColor: on ? c.brandSoft : hovered ? c.surface2 : 'transparent' }]}>
              <Ionicons name={on ? n.icon : (`${n.icon}-outline` as keyof typeof Ionicons.glyphMap)} size={20} color={on ? c.brandDeep : c.muted} />
              {!compact ? <Text style={[styles.navText, { color: on ? c.text : c.muted }]} numberOfLines={1}>{n.label}</Text> : null}
              {n.badge ? (
                <View style={[styles.badge, compact && styles.badgeDot, { backgroundColor: n.tone === 'info' ? '#2a78d6' : '#d03b3b' }]}>
                  <Text style={styles.badgeText}>{n.badge > 99 ? '99+' : n.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[styles.sideFoot, { borderTopColor: c.line }]}>
        <View style={[styles.mode, compact && { justifyContent: 'center' }]} accessibilityLabel={mode === 'live' ? `Jonli rejim: ${conn === 'online' ? 'ulangan' : 'ulanmoqda'}` : 'Demo rejim'}>
          <View style={[styles.modeDot, { backgroundColor: mode === 'demo' ? '#fab219' : conn === 'online' ? '#0ca30c' : '#d03b3b' }]} />
          {!compact ? <Text style={[styles.modeText, { color: c.muted }]}>{mode === 'demo' ? 'Demo rejim · simulyatsiya' : conn === 'online' ? 'Jonli · server ulangan' : 'Server bilan aloqa yo\'q…'}</Text> : null}
        </View>
        <FootBtn compact={compact} icon={dark ? 'sunny-outline' : 'moon-outline'} label={dark ? "Yorug' mavzu" : "Qorong'i mavzu"} onPress={() => setTheme(dark ? 'light' : 'dark')} />
        <FootBtn compact={compact} icon="globe-outline" label="Saytni ochish" onPress={() => { onNavigate?.(); router.push('/' as never); }} />
        <FootBtn compact={compact} icon="log-out-outline" label="Chiqish" onPress={logout} />
      </View>
    </View>
  );
}

function FootBtn({ icon, label, onPress, compact }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; compact?: boolean }) {
  const { colors: c } = useStore();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ hovered }: { hovered?: boolean }) => [styles.navItem, { height: 38 }, compact && { justifyContent: 'center', paddingHorizontal: 0 }, hovered && { backgroundColor: c.surface2 }]}>
      <Ionicons name={icon} size={18} color={c.muted} />
      {!compact ? <Text style={[styles.navText, { color: c.muted, fontSize: 13.5 }]}>{label}</Text> : null}
    </Pressable>
  );
}

function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { colors: c } = useStore();
  const { wide, mid } = useLayout();
  const { derived } = useAdmin();
  const urgent = derived?.insights.filter(i => i.level === 'critical' || i.level === 'warn').length ?? 0;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(iv); }, []);
  return (
    <View style={[styles.top, { backgroundColor: c.surface, borderBottomColor: c.line }]}>
      {!wide ? (
        <Pressable onPress={onMenu} style={[styles.iconBtn, { backgroundColor: c.surface2 }]} accessibilityLabel="Menyu"><Ionicons name="menu" size={20} color={c.text} /></Pressable>
      ) : null}
      <Pressable onPress={onSearch} style={({ hovered }: { hovered?: boolean }) => [styles.search, { backgroundColor: c.surface2, borderColor: hovered ? c.faint : 'transparent' }]} accessibilityRole="search" accessibilityLabel="Qidirish yoki buyruq (Ctrl+K)">
        <Ionicons name="search" size={17} color={c.faint} />
        <Text style={[styles.searchText, { color: c.faint }]} numberOfLines={1}>{mid ? 'Haydovchi, raqam, buyurtma yoki buyruq: «Chorsu ×1.5»' : 'Qidirish…'}</Text>
        {mid ? <View style={[styles.kbd, { borderColor: c.line }]}><Text style={[styles.kbdText, { color: c.muted }]}>Ctrl K</Text></View> : null}
      </Pressable>
      <View style={{ flex: 1 }} />
      {mid ? <Text style={[styles.clock, { color: c.muted }]}>{fmtDay(now)} · {fmtTime(now)}</Text> : null}
      <Pressable onPress={() => router.push('/admin' as never)} style={[styles.iconBtn, { backgroundColor: c.surface2 }]} accessibilityLabel={`Tavsiyalar: ${urgent} ta muhim`}>
        <Ionicons name="sparkles" size={18} color={c.text} />
        {urgent ? <View style={[styles.bellBadge, { borderColor: c.surface }]}><Text style={styles.badgeText}>{urgent}</Text></View> : null}
      </Pressable>
    </View>
  );
}

/* ---------- Tezkor qidiruv va buyruqlar ---------- */

type Result = { id: string; group: string; icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; run: () => void };

/** hozirdan `min` daqiqa keyingi vaqt (hudud muddati) */
const untilIn = (min: number) => new Date(Date.now() + min * 60000).toISOString();
const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘]/g, '').replace(/\s+/g, ' ').trim();
const compact = (s: string) => s.toLowerCase().replace(/[^0-9a-zа-я]/g, '');

function findPlace(q: string) {
  const n = norm(q);
  return PLACES.find(p => norm(p.title).startsWith(n) || norm(p.title).includes(n) || (p.id ?? '').startsWith(n.replace(/\s/g, '')));
}

function CommandPalette({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const { state } = useAdmin();
  const runCmds = useRun();
  const nav = useNav();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const close = () => { setQ(''); setIdx(0); onClose(); };
  const go = (to: string) => () => { close(); router.push(to as never); };
  /** buyruq bajarilish paytida tuziladi (muddat — hozirgi vaqtdan) */
  const exec = (title: string, msg: string, make: () => AdminCmd, done: string) => () => {
    confirm(title, msg, async () => { setBusy(true); await runCmds(make(), done); setBusy(false); close(); }, 'Bajarish');
  };

  const results = useMemo<Result[]>(() => {
    const out: Result[] = [];
    const query = q.trim();
    const n = norm(query);
    // buyruqlar: «Chorsu ×1.5», «surge 1.4 vokzal», «xabar matn»
    const m1 = query.match(/^(.+?)\s*[×xх*]\s*([\d.,]+)$/i) ?? query.match(/^(?:surge|koef\w*)\s+([\d.,]+)\s+(.+)$/i);
    if (m1) {
      const [placeQ, numQ] = /^\d/.test(m1[1]) ? [m1[2], m1[1]] : [m1[1], m1[2]];
      const surge = Number(numQ.replace(',', '.'));
      const p = findPlace(placeQ.replace(/^(surge|koef\w*)\s+/i, ''));
      if (p && surge >= 1.1 && surge <= 3) {
        const title = `«${p.title}» hududiga ×${surge.toFixed(1)} (30 daqiqa)`;
        out.push({ id: 'cmd:zone', group: 'Buyruq', icon: 'flame', title, sub: 'Radius 1,5 km · narx va haydovchilar xaritasi darhol yangilanadi', run: exec('Narx koeffitsienti', `${title} yoqilsinmi?`, () => ({ cmd: 'zone', zone: { label: p.title, center: { latitude: p.latitude, longitude: p.longitude }, radiusKm: 1.5, surge, until: untilIn(30) } }), 'Hudud yoqildi') });
      }
    }
    const m2 = query.match(/^(?:xabar|elon|e'lon|e’lon)\s+(.{3,})$/i);
    if (m2) {
      out.push({ id: 'cmd:notice', group: 'Buyruq', icon: 'megaphone', title: `Liniyadagi haydovchilarga xabar: «${m2[1]}»`, sub: 'Haydovchi ilovasida bosh ekranda ko\'rinadi', run: exec('Xabar yuborish', `«${m2[1]}» liniyadagi haydovchilarga yuborilsinmi?`, () => ({ cmd: 'notice', target: 'online', title: 'YUMS operatori', text: m2[1] }), 'Xabar yuborildi') });
    }
    // sahifalar
    for (const it of nav) if (!n || norm(it.label).includes(n)) out.push({ id: `page:${it.to}`, group: 'Sahifalar', icon: it.icon, title: it.label, run: go(it.to) });
    if (!n) {
      out.push({ id: 'quick:wait', group: 'Tezkor', icon: 'hourglass', title: 'Haydovchi kutayotgan buyurtmalar', run: go('/admin/orders?status=searching') });
      out.push({ id: 'quick:zone', group: 'Tezkor', icon: 'flame', title: 'Yuqori talab hududini yoqish', sub: 'Masalan, yozing: «Chorsu ×1.5»', run: go('/admin/pricing') });
      return out;
    }
    const cq = compact(query);
    // haydovchilar: ism, davlat raqami, telefon
    const drivers = Object.values(state.drivers).filter(d => norm(d.name).includes(n) || (cq.length >= 3 && (compact(d.plate ?? '').includes(cq) || compact(d.phone ?? '').includes(cq)))).slice(0, 6);
    for (const d of drivers) out.push({ id: `drv:${d.id}`, group: 'Haydovchilar', icon: 'person', title: d.name, sub: [d.plate, d.car, d.blocked ? 'bloklangan' : state.live[d.id] ? 'liniyada' : 'oflayn'].filter(Boolean).join(' · '), run: go(`/admin/drivers/${d.id}`) });
    // buyurtmalar: manzil, yo'lovchi, raqam
    const orders = Object.values(state.orders).filter(o => o.id.toLowerCase().startsWith(n) || norm(o.pickup.title).includes(n) || norm(o.destination.title).includes(n) || norm(o.passenger.name).includes(n) || (cq.length >= 4 && compact(o.passenger.phone ?? '').includes(cq)))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6);
    for (const o of orders) out.push({ id: `ord:${o.id}`, group: 'Buyurtmalar', icon: 'receipt', title: `${o.pickup.title} → ${o.destination.title}`, sub: `${dateHM(o.createdAt)} · ${ORDER_STATUS[o.status].label} · ${o.passenger.name}`, run: go(`/admin/orders?id=${o.id}`) });
    // arizalar
    for (const l of state.leads.filter(x => norm(x.name).includes(n) || (cq.length >= 4 && compact(x.phone).includes(cq))).slice(0, 4)) {
      out.push({ id: `lead:${l.id}`, group: 'Arizalar', icon: 'person-add', title: l.name, sub: [l.phone, l.car].filter(Boolean).join(' · '), run: go(`/admin/leads?id=${l.id}`) });
    }
    return out;
  }, [q, state.drivers, state.orders, state.leads, state.live, nav]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = Math.min(idx, Math.max(0, results.length - 1));
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={[styles.palBg, { backgroundColor: c.overlay, paddingTop: wide ? 90 : 16 }]} onPress={close}>
        <Pressable style={[styles.pal, { backgroundColor: c.surface, borderColor: c.line }]} onPress={() => {}}>
          <View style={[styles.palInput, { borderBottomColor: c.line }]}>
            {busy ? <ActivityIndicator size="small" color={c.muted} /> : <Ionicons name="search" size={19} color={c.faint} />}
            <TextInput value={q} onChangeText={v => { setQ(v); setIdx(0); }} autoFocus placeholder="Qidirish yoki buyruq: «Chorsu ×1.5», «xabar …»" placeholderTextColor={c.faint}
              style={[styles.palText, { color: c.text }]} accessibilityLabel="Tezkor qidiruv"
              onKeyPress={e => {
                const k = e.nativeEvent.key;
                if (k === 'ArrowDown') { e.preventDefault?.(); setIdx(i => Math.min(results.length - 1, i + 1)); }
                else if (k === 'ArrowUp') { e.preventDefault?.(); setIdx(i => Math.max(0, i - 1)); }
                else if (k === 'Escape') close();
              }}
              onSubmitEditing={() => results[sel]?.run()} />
            <Pressable onPress={close} accessibilityLabel="Yopish"><Text style={[styles.kbdText, { color: c.faint }]}>Esc</Text></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {results.length ? results.map((r, i) => (
              <View key={r.id}>
                {r.group !== results[i - 1]?.group ? <Text style={[styles.palGroup, { color: c.faint }]}>{r.group}</Text> : null}
                <Pressable onPress={r.run} onHoverIn={() => setIdx(i)} accessibilityRole="button" accessibilityLabel={r.title}
                  style={[styles.palRow, { backgroundColor: i === sel ? c.surface2 : 'transparent' }]}>
                  <View style={[styles.palIcon, { backgroundColor: r.group === 'Buyruq' ? c.brandSoft : c.surface2 }]}><Ionicons name={r.icon} size={16} color={r.group === 'Buyruq' ? c.brandDeep : c.muted} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.palTitle, { color: c.text }]} numberOfLines={1}>{r.title}</Text>
                    {r.sub ? <Text style={[styles.palSub, { color: c.muted }]} numberOfLines={1}>{r.sub}</Text> : null}
                  </View>
                  {i === sel ? <Ionicons name="return-down-back" size={15} color={c.faint} /> : null}
                </Pressable>
              </View>
            )) : <Text style={[styles.palSub, { color: c.muted, padding: 18 }]}>Hech narsa topilmadi. Buyruq misollari: «Chorsu ×1.5», «surge 1.4 vokzal», «xabar Kechqurun talab yuqori».</Text>}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- Kirish ---------- */

export function Login() {
  const { colors: c } = useStore();
  const { mode, login } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (mode === 'live' && !password) { setError('Parolni kiriting'); return; }
    setBusy(true); setError('');
    const e = await login(password);
    setBusy(false);
    if (e) setError(e);
  };
  return (
    <View style={[styles.loginBg, { backgroundColor: c.bg }]}>
      <View style={[styles.loginCard, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Image source={LOGO_EMBLEM} style={{ width: 56, height: 56, borderRadius: 28, alignSelf: 'center' }} />
        <View style={{ gap: 4, alignItems: 'center' }}>
          <Text style={[styles.loginTitle, { color: c.text }]}>YUMS <Text style={{ color: '#E0A800' }}>Admin</Text></Text>
          <Text style={[styles.palSub, { color: c.muted, textAlign: 'center' }]}>Taksi xizmatini boshqarish paneli</Text>
        </View>
        {mode === 'live' ? (
          <View style={{ gap: 6 }}>
            <Text style={[styles.palSub, { color: c.muted }]}>Parol</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry autoFocus onSubmitEditing={submit} placeholder="Server konsolida ko'rsatilgan parol" placeholderTextColor={c.faint}
              style={[styles.loginInput, { backgroundColor: c.surface2, color: c.text, borderColor: error ? c.danger : 'transparent' }]} accessibilityLabel="Parol" />
          </View>
        ) : (
          <View style={[styles.demoNote, { backgroundColor: c.brandSoft }]}>
            <Ionicons name="flask" size={18} color={c.brandDeep} />
            <Text style={[styles.palSub, { color: c.text, flex: 1, lineHeight: 19 }]}>Demo rejim: server ulanmagan, panel brauzer ichidagi jonli simulyatsiya bilan ishlaydi. Narx va sayt matnidagi o&apos;zgarishlar shu brauzerdagi saytda ko&apos;rinadi.</Text>
          </View>
        )}
        {error ? <Text style={[styles.palSub, { color: c.danger }]}>{error}</Text> : null}
        <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.loginBtn, { opacity: pressed ? 0.9 : 1 }]} accessibilityRole="button" accessibilityLabel={mode === 'live' ? 'Kirish' : 'Demo rejimda kirish'}>
          {busy ? <ActivityIndicator color="#0E1525" /> : <Ionicons name="log-in" size={19} color="#0E1525" />}
          <Text style={styles.loginBtnText}>{mode === 'live' ? 'Kirish' : 'Demo rejimda kirish'}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/' as never)} style={{ alignSelf: 'center' }} accessibilityRole="link"><Text style={[styles.palSub, { color: c.accent }]}>← Saytga qaytish</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  side: { borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, height: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingBottom: 14 },
  brandText: { fontFamily: F.brand, fontSize: 16 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, paddingHorizontal: 12, borderRadius: 12 },
  navText: { fontFamily: F.bold, fontSize: 14.5, flex: 1 },
  badge: { minWidth: 22, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 4, right: 8, minWidth: 18, height: 16 },
  badgeText: { fontFamily: F.heavy, fontSize: 11, color: '#fff' },
  sideFoot: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 2 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  modeDot: { width: 8, height: 8, borderRadius: 4 },
  modeText: { fontFamily: F.semi, fontSize: 12.5, flex: 1 },
  top: { height: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, borderRadius: 12, paddingHorizontal: 12, minWidth: 0, flexShrink: 1, width: 520, maxWidth: '62%', borderWidth: 1 },
  searchText: { fontFamily: F.semi, fontSize: 13.5, flex: 1 },
  kbd: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  kbdText: { fontFamily: F.bold, fontSize: 11 },
  clock: { fontFamily: F.semi, fontSize: 13, fontVariant: ['tabular-nums'] },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#d03b3b', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  drawerBg: { flex: 1 },
  drawer: { width: 270, height: '100%' },
  palBg: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  pal: { width: '100%', maxWidth: 640, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' },
  palInput: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  palText: { flex: 1, fontFamily: F.semi, fontSize: 16, height: 54 },
  palGroup: { fontFamily: F.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  palRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 9, marginHorizontal: 6, borderRadius: 12 },
  palIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  palTitle: { fontFamily: F.bold, fontSize: 14 },
  palSub: { fontFamily: F.medium, fontSize: 12.5 },
  loginBg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  loginCard: { width: '100%', maxWidth: 400, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 26, gap: 18 },
  loginTitle: { fontFamily: F.brand, fontSize: 22 },
  loginInput: { height: 50, borderRadius: 14, paddingHorizontal: 14, fontFamily: F.semi, fontSize: 15.5, borderWidth: 1.5 },
  demoNote: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, alignItems: 'flex-start' },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 16, backgroundColor: '#FFC800' },
  loginBtnText: { fontFamily: F.heavy, fontSize: 16, color: '#0E1525' },
});
