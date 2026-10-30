// Narx kalkulyatori: ikki mashhur joy orasidagi marshrut va har bir tarif bo'yicha taxminiy narx.
// Narx admin belgilagan tariflar va olish nuqtasidagi yuqori talab hududi bilan hisoblanadi (ilovadagidek).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { TARIFF_ART } from '@/lib/cars';
import { PLACES, type Tariff } from '@/lib/data';
import { fetchRoute, priceFor, som, type RouteInfo } from '@/lib/geo';
import { zoneSurgeAt, type RemoteConfig } from '@/lib/remote-config';
import { useColors } from '@/lib/store';
import { F } from '@/lib/theme';
import type { Lang } from '@/site/lib/content';
import { T, TARIFF_RU } from '@/site/lib/i18n';

import { PickerModal, useLayout } from '../kit';

export function Estimator({ lang, tariffs, config }: { lang: Lang; tariffs: Tariff[]; config: RemoteConfig | null }) {
  const c = useColors();
  const t = T[lang].estimate;
  const { wide } = useLayout();
  const [from, setFrom] = useState('amirtemur');
  const [to, setTo] = useState('airport');
  const [pick, setPick] = useState<'from' | 'to' | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const a = PLACES.find(p => p.id === from)!, b = PLACES.find(p => p.id === to)!;

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- yangi marshrut hisoblanguncha eskisi ko'rsatilmaydi
    setRoute(null);
    fetchRoute(a, b).then(r => { if (alive) setRoute(r); });
    return () => { alive = false; };
  }, [a, b]);

  const surge = zoneSurgeAt(config?.zones, a);
  const items = PLACES.map(p => ({ id: p.id!, title: p.title, sub: p.subtitle }));

  return (
    <View style={[styles.box, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={[styles.inputs, wide && { flexDirection: 'row' }]}>
        <PlaceButton label={t.from} value={a.title} dot="#0F1E3D" onPress={() => setPick('from')} />
        <Pressable onPress={() => { setFrom(to); setTo(from); }} style={[styles.swap, { backgroundColor: c.surface2, borderColor: c.line }, wide ? { marginHorizontal: -14, zIndex: 2 } : { alignSelf: 'center', marginVertical: -14, zIndex: 2 }]} accessibilityLabel={t.swap}>
          <Ionicons name={wide ? 'swap-horizontal' : 'swap-vertical'} size={18} color={c.text} />
        </Pressable>
        <PlaceButton label={t.to} value={b.title} dot="#FFC800" onPress={() => setPick('to')} />
      </View>

      <View style={styles.meta}>
        {route ? (
          <Text style={[styles.metaText, { color: c.muted }]}>{route.km.toFixed(1)} {t.km} · ~{route.min} {t.min}</Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator size="small" color={c.muted} /><Text style={[styles.metaText, { color: c.muted }]}>{t.loading}</Text></View>
        )}
        {surge > 1 ? (
          <View style={[styles.surge, { backgroundColor: c.dangerSoft }]}><Ionicons name="flame" size={13} color={c.danger} /><Text style={[styles.surgeText, { color: c.danger }]}>×{surge.toFixed(1)} · {t.surge}</Text></View>
        ) : null}
      </View>

      <View style={[styles.grid, { gap: wide ? 12 : 8 }]}>
        {tariffs.map(tf => (
          <View key={tf.id} style={[styles.tile, { backgroundColor: c.surface2, flexBasis: wide ? '18%' : '47%' }]}>
            <Image source={TARIFF_ART[tf.id]} style={styles.car} contentFit="contain" />
            <Text style={[styles.tName, { color: c.text }]}>{lang === 'ru' ? TARIFF_RU[tf.id]?.name ?? tf.name : tf.name}</Text>
            <Text style={[styles.tPrice, { color: c.text }]} accessibilityLabel={`${tf.name} narxi`}>{route ? `≈ ${som(priceFor(tf, route.km, route.min, surge))}` : '…'}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.note, { color: c.faint }]}>{t.note}</Text>

      <PickerModal visible={pick != null} title={pick === 'from' ? t.from : t.to} items={items} value={pick === 'from' ? from : to}
        onPick={id => { if (pick === 'from') { if (id === to) setTo(from); setFrom(id); } else { if (id === from) setFrom(to); setTo(id); } }}
        onClose={() => setPick(null)} searchPlaceholder={t.pick} />
    </View>
  );
}

function PlaceButton({ label, value, dot, onPress }: { label: string; value: string; dot: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.place, { backgroundColor: c.surface2, opacity: pressed ? 0.85 : 1 }]} accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.placeLabel, { color: c.faint }]}>{label}</Text>
        <Text style={[styles.placeValue, { color: c.text }]} numberOfLines={1}>{value}</Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={c.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 14 },
  inputs: { gap: 0, alignItems: 'stretch' },
  place: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, borderColor: '#fff' },
  placeLabel: { fontFamily: F.semi, fontSize: 12 },
  placeValue: { fontFamily: F.bold, fontSize: 16, marginTop: 1 },
  swap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, alignSelf: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, minHeight: 24 },
  metaText: { fontFamily: F.semi, fontSize: 14 },
  surge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  surgeText: { fontFamily: F.bold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { flexGrow: 1, borderRadius: 18, padding: 12, gap: 2 },
  car: { width: '100%', height: 54, marginBottom: 4 },
  tName: { fontFamily: F.semi, fontSize: 13.5 },
  tPrice: { fontFamily: F.heavy, fontSize: 18, letterSpacing: -0.4 },
  note: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 18 },
});
