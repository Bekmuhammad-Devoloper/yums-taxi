import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Divider, Row, Screen, SearchBar, Txt } from '@/components/ui';
import { useDriver } from '@/driver/lib/driver-store';
import { faqGroups, SUPPORT_PHONE, callNumber, openTelegram } from '@/driver/lib/support';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, trPlace, route, flipRTL } from '@/lib/i18n';

const go = (path: string) => router.push(path as never);

export default function Support() {
  const { colors: c } = useStore();
  const d = useDriver();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const query = q.trim().toLowerCase();
  const groups = faqGroups().map(g => ({ ...g, items: g.items.filter(f => !query || (f.q + ' ' + f.a).toLowerCase().includes(query)) })).filter(g => g.items.length);

  return (
    <Screen title={tr('Yordam markazi')} subtitle={tr("24/7 · o'rtacha javob 2 daqiqa")}>
      <View style={[styles.hero, { backgroundColor: '#0F1E3D' }]}>
        <Row>
          <View style={styles.heroIcon}><Ionicons name="headset" size={26} color="#FFC800" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{tr('Qanday yordam bera olamiz?')}</Text>
            <Txt v="small" color="rgba(255,255,255,0.7)">{tr('Haydovchilar uchun alohida yordam xizmati')}</Txt>
          </View>
        </Row>
        <Row gap={8} style={{ marginTop: 14 }}>
          <Action icon="chatbubbles" label={tr('Chat')} onPress={() => go('/support-chat')} primary />
          <Action icon="call" label={tr("Qo'ng'iroq")} onPress={() => callNumber(SUPPORT_PHONE)} />
          <Action icon="paper-plane" label="Telegram" onPress={openTelegram} />
        </Row>
      </View>

      {d.trip && (
        <Pressable onPress={() => go('/support-chat')} accessibilityLabel={tr("Joriy buyurtma bo'yicha yozish")}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.icon, { backgroundColor: c.brandSoft }]}><Ionicons name="car" size={20} color={c.brandDeep} /></View>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{tr("Joriy buyurtma bo'yicha")}</Txt>
              <Txt v="small" muted numberOfLines={1}>{route(trPlace(d.trip.order.pickup.title), trPlace(d.trip.order.destination.title))}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.faint} style={flipRTL()} />
          </Card>
        </Pressable>
      )}

      <SearchBar value={q} onChangeText={setQ} placeholder={tr('Savolingizni yozing')} />

      {groups.map(g => (
        <Card key={g.title} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
          <Row gap={8} style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
            <Ionicons name={g.icon} size={16} color={c.muted} />
            <Txt v="tiny" muted style={styles.caps}>{g.title}</Txt>
          </Row>
          {g.items.map((f, i) => {
            const on = open === f.q || !!query;
            return (
              <View key={f.q}>
                {i > 0 && <Divider style={{ marginHorizontal: 12 }} />}
                <Pressable onPress={() => setOpen(open === f.q ? null : f.q)} style={styles.q} accessibilityLabel={f.q}>
                  <Txt v="h3" style={{ flex: 1 }}>{f.q}</Txt>
                  <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={18} color={c.faint} />
                </Pressable>
                {on ? <Txt v="small" muted style={styles.a}>{f.a}</Txt> : null}
              </View>
            );
          })}
        </Card>
      ))}
      {!groups.length && (
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Txt v="h3">{tr('Javob topilmadi')}</Txt>
          <Txt v="small" muted style={{ textAlign: 'center' }}>{tr('Savolingizni chatda yozing — operator javob beradi')}</Txt>
          <Pressable onPress={() => go('/support-chat')} style={[styles.pill, { backgroundColor: c.brand }]}><Txt v="small" color={c.brandText} style={{ fontFamily: F.heavy }}>{tr('Chatga yozish')}</Txt></Pressable>
        </Card>
      )}

      <Pressable onPress={() => callNumber('112')} accessibilityLabel={tr('Favqulodda yordam 112')} style={[styles.sos, { backgroundColor: c.dangerSoft }]}>
        <Ionicons name="warning" size={22} color={c.danger} />
        <View style={{ flex: 1 }}>
          <Txt v="h3" color={c.danger}>{tr('Favqulodda yordam · 112')}</Txt>
          <Txt v="small" color={c.danger}>{tr("Avariya, xavfli vaziyat yoki sog'liq bilan bog'liq holatda")}</Txt>
        </View>
      </Pressable>
    </Screen>
  );
}

function Action({ icon, label, onPress, primary }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={({ pressed }) => [styles.action, { backgroundColor: primary ? '#FFC800' : 'rgba(255,255,255,0.1)', opacity: pressed ? 0.8 : 1 }]}>
      <Ionicons name={icon} size={18} color={primary ? '#0E1525' : '#fff'} />
      <Text style={[styles.actionText, { color: primary ? '#0E1525' : '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 18 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,200,0,0.14)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: F.heavy, fontSize: 18, color: '#fff' },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 14 },
  actionText: { fontFamily: F.heavy, fontSize: 13.5 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  caps: { fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  q: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12 },
  a: { paddingHorizontal: 12, paddingBottom: 12, lineHeight: 20 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  sos: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
});
