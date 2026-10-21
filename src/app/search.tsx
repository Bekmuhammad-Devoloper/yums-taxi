import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/toast';
import { Divider, IconButton, ListItem, SectionTitle, Txt, type IconName } from '@/components/ui';
import { PLACES, type Place } from '@/lib/data';
import { distanceKm } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

type Mode = 'to' | 'from' | 'home' | 'work';
const TITLES: Record<Mode, string> = { to: 'Qayerga?', from: 'Qayerdan?', home: 'Uy manzili', work: 'Ish manzili' };

export default function Search() {
  const { mode: m } = useLocalSearchParams<{ mode?: Mode }>();
  const mode: Mode = m && m in TITLES ? m : 'to';
  const { colors: c, order, saved, recent, setDestination, setPickup, savePlace, pushRecent } = useStore();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = order.pickup ?? PLACES[7];
    const list = t ? PLACES.filter(p => (p.title + ' ' + (p.subtitle ?? '')).toLowerCase().includes(t)) : PLACES;
    return [...list].sort((a, b) => distanceKm(base, a) - distanceKm(base, b));
  }, [q, order.pickup]);

  const choose = (p: Place) => {
    if (mode === 'to') { setDestination(p); pushRecent(p); }
    else if (mode === 'from') setPickup(p);
    else { savePlace(mode, p); toast(`${mode === 'home' ? 'Uy' : 'Ish'} manzili saqlandi`, 'bookmark'); }
    router.back();
  };

  const top: { icon: IconName; title: string; sub?: string; onPress: () => void }[] = [];
  if (mode === 'from' || mode === 'to') {
    if (mode === 'from') top.push({ icon: 'map-outline', title: 'Xaritada tanlash', sub: 'Pinni surib aniq joyni belgilang', onPress: () => router.back() });
    if (saved.home) top.push({ icon: 'home', title: 'Uy', sub: saved.home.title, onPress: () => choose(saved.home!) });
    if (saved.work) top.push({ icon: 'briefcase', title: 'Ish', sub: saved.work.title, onPress: () => choose(saved.work!) });
  }
  const showRecent = !q && (mode === 'to' || mode === 'from') && recent.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.head}>
        <IconButton name="close" size={42} onPress={() => router.back()} />
        <Txt v="h2" style={{ flex: 1 }}>{TITLES[mode]}</Txt>
      </View>
      <View style={[styles.box, { backgroundColor: c.surface }]}>
        {mode === 'to' && (
          <>
            <Pressable style={styles.field} onPress={() => router.replace('/search?mode=from')}>
              <View style={[styles.dot, { backgroundColor: '#0F1E3D' }]} />
              <Txt numberOfLines={1} muted style={{ flex: 1 }}>{order.pickup?.title ?? 'Joriy joylashuv'}</Txt>
            </Pressable>
            <Divider style={{ marginLeft: 40 }} />
          </>
        )}
        <View style={styles.field}>
          <View style={[styles.dot, mode === 'from' ? { backgroundColor: '#0F1E3D' } : { backgroundColor: '#FFC800', borderRadius: 3 }]} />
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            placeholder="Manzil yoki joy nomi"
            placeholderTextColor={c.faint}
            style={[styles.input, { color: c.text }]}
            returnKeyType="search"
          />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={20} color={c.faint} /></Pressable> : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={p => p.id ?? p.title}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View>
            {!q && top.map(t => <ListItem key={t.title} icon={t.icon} title={t.title} sub={t.sub} onPress={t.onPress} iconBg={c.brandSoft} />)}
            {showRecent && (
              <>
                <SectionTitle>So'nggi manzillar</SectionTitle>
                {recent.map(p => <ListItem key={'r' + p.title} icon="time-outline" title={p.title} sub={p.subtitle} onPress={() => choose(p)} />)}
              </>
            )}
            <SectionTitle>{q ? 'Natijalar' : 'Mashhur joylar'}</SectionTitle>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 32, gap: 6 }}>
            <Ionicons name="search-outline" size={36} color={c.faint} />
            <Txt v="h3">Hech narsa topilmadi</Txt>
            <Txt v="small" muted style={{ textAlign: 'center' }}>Boshqacha yozib ko'ring yoki xaritada tanlang</Txt>
          </View>
        }
        renderItem={({ item }) => (
          <ListItem
            icon="location-outline"
            title={item.title}
            sub={item.subtitle}
            onPress={() => choose(item)}
            right={order.pickup ? <Txt v="tiny" faint>{distanceKm(order.pickup, item).toFixed(1)} km</Txt> : undefined}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  box: { marginHorizontal: 16, borderRadius: 20, paddingHorizontal: 14, marginBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 54 },
  dot: { width: 12, height: 12, borderRadius: 6, marginLeft: 4 },
  input: { flex: 1, minWidth: 0, fontSize: 17, fontFamily: F.semi, height: 54 },
});
