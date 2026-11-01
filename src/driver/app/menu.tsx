import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Divider, ListItem, PersonAvatar, Row, Screen, Txt } from '@/components/ui';
import { CARD_ART, CardBg, useCardInk } from '@/driver/components/card-bg';
import { DOC_KINDS } from '@/driver/lib/docs';
import { useDriver } from '@/driver/lib/driver-store';
import { callNumber } from '@/driver/lib/support';
import { activityColor } from '@/driver/lib/theme';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, flipRTL } from '@/lib/i18n';

const go = (path: string) => router.push(path as never);

/** Menyu uchun 3D ikonkalar */
const ART = {
  earnings: require('@/assets/menu/earnings.webp'),
  quality: require('@/assets/menu/quality.webp'),
  car: require('@/assets/menu/car.webp'),
  documents: require('@/assets/menu/documents.webp'),
  settings: require('@/assets/menu/settings.webp'),
  support: require('@/assets/menu/support.webp'),
  safety: require('@/assets/menu/safety.webp'),
};

export default function Menu() {
  const { colors: c } = useStore();
  const d = useDriver();
  const ink = useCardInk();
  const p = d.profile;
  if (!p) return null;

  return (
    <Screen title={tr('Menyu')}>
      <Pressable onPress={() => go('/profile')} style={[styles.head, { borderColor: c.line }]}>
        <CardBg art={CARD_ART.profile} />
        <PersonAvatar driver name={p.name} photo={p.photo} gender={p.gender} size={60} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h2" color={ink.text} numberOfLines={1}>{p.name}</Txt>
          <Txt v="small" color={ink.sub} numberOfLines={1}>{p.color ? `${p.car} · ${tr(p.color)}` : p.car}</Txt>
          <View style={[styles.plate, { borderColor: ink.text, backgroundColor: ink.plateBg }]}><Text style={[styles.plateText, { color: ink.text }]}>{p.plate}</Text></View>
        </View>
        <View style={[styles.headGo, { backgroundColor: ink.glass }]}><Ionicons name="chevron-forward" size={16} color={ink.text} style={flipRTL()} /></View>
      </Pressable>

      <Row gap={10}>
        <Pressable onPress={() => go('/quality')} style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.statValue, { color: activityColor(d.activity) }]}>{d.activity}</Text>
          <Txt v="tiny" muted>{tr('Faollik')}</Txt>
        </Pressable>
        <Pressable onPress={() => go('/quality')} style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.statValue, { color: c.text }]}>★ {d.rating.toFixed(2)}</Text>
          <Txt v="tiny" muted>{tr('Reyting')}</Txt>
        </Pressable>
        <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[styles.statValue, { color: c.text }]}>{p.trips}</Text>
          <Txt v="tiny" muted>{tr('Safarlar')}</Txt>
        </View>
      </Row>

      <Pressable onPress={() => go('/earnings')} style={[styles.balance, { borderColor: c.line }]}>
        <CardBg art={CARD_ART.balance} />
        <View style={{ flex: 1 }}>
          <Txt v="small" color={ink.sub}>{tr('Balans')}</Txt>
          <Text style={[styles.balanceValue, { color: ink.text }]}>{som(d.balance)}</Text>
          <Txt v="tiny" color={ink.faint}>{tr('Bugun: {sum} · {count} ta safar', { sum: som(d.today.sum), count: d.today.count })}</Txt>
        </View>
        <View style={[styles.withdraw, { backgroundColor: ink.btn, boxShadow: ink.btnShadow }]}><Txt v="small" color={ink.btnText} style={{ fontFamily: F.heavy }}>{tr('Pul yechish')}</Txt></View>
      </Pressable>

      <Card style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
        <ListItem icon="stats-chart" art={ART.earnings} title={tr('Daromad')} sub={tr('Kun, hafta, oy · safarlar tarixi')} onPress={() => go('/earnings')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="pulse" art={ART.quality} title={tr('Faollik va reyting')} sub={tr('Qoidalar, baholar, sifat')} onPress={() => go('/quality')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="car-sport" art={ART.car} title={tr('Avtomobil va tariflar')} sub={tr('{car} · {length} ta faol tarif', { car: p.car, length: d.activeTariffs.length })} onPress={() => go('/profile')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="document-text" art={ART.documents} title={tr('Hujjatlar')} sub={tr('{length} / {length2} tasdiqlangan · guvohnoma, tex. pasport', { length: DOC_KINDS.filter(k => d.docs[k].status === 'approved').length, length2: DOC_KINDS.length })} onPress={() => go('/documents')} />
      </Card>

      <Card style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
        <ListItem icon="settings" art={ART.settings} title={tr('Sozlamalar')} sub={tr('Navigator, mavzu, demo rejim')} onPress={() => go('/settings')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="headset" art={ART.support} title={tr('Yordam markazi')} sub={tr('24/7 · chat, savol-javoblar')} onPress={() => go('/support')} />
        <Divider style={{ marginLeft: 62 }} />
        <ListItem icon="shield-checkmark" art={ART.safety} title={tr('Xavfsizlik')} sub={tr('Favqulodda vaziyat · 112')} onPress={() => callNumber('112')} />
      </Card>

      <Txt v="tiny" faint style={{ textAlign: 'center' }}>{tr('YUMS Driver 1.0 · {v2}', { v2: d.live ? tr('YUMS bilan jonli ulangan') : tr('demo rejim') })}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  headGo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  plate: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 6, marginTop: 4 },
  plateText: { fontFamily: F.heavy, fontSize: 12.5, letterSpacing: 1.2 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  statValue: { fontFamily: F.heavy, fontSize: 20, letterSpacing: -0.5 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 22, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  balanceValue: { fontFamily: F.heavy, fontSize: 28, letterSpacing: -0.8, marginVertical: 2 },
  withdraw: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
});
