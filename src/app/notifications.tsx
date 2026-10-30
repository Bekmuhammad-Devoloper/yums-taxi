import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Screen, Txt } from '@/components/ui';
import { ago, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { tr } from '@/lib/i18n';

export default function Notifications() {
  const { colors: c } = useStore();
  const p = usePlatform();
  const { markNoticesRead } = p;
  // Ekran yopilganda hammasi o'qilgan deb belgilanadi — ochilganda yangilari ajralib turadi
  useEffect(() => () => markNoticesRead(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen title={tr('Bildirishnomalar')}>
      {p.notices.length === 0 && <EmptyState icon="notifications-off-outline" title={tr("Bildirishnomalar yo'q")} />}
      {p.notices.map(n => (
        <Pressable
          key={n.id}
          disabled={!n.href}
          onPress={() => { haptic.tap(); if (n.href) router.push(n.href as Href); }}
          style={({ pressed }) => [styles.row, { backgroundColor: n.read ? c.surface : c.brandSoft, opacity: pressed ? 0.85 : 1 }]}>
          <View style={[styles.ico, { backgroundColor: n.read ? c.surface2 : c.surface }]}><Ionicons name={n.icon} size={20} color={c.text} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h3" numberOfLines={1}>{n.title}</Txt>
            <Txt v="small" muted numberOfLines={2}>{n.text}</Txt>
            <Txt v="tiny" faint>{ago(n.at)}</Txt>
          </View>
          {!n.read && <View style={[styles.dot, { backgroundColor: c.danger }]} />}
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
  ico: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
