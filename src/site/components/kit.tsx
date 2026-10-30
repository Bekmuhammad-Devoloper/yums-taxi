// Sayt va admin panel uchun umumiy bloklar: kenglikka moslashish, konteyner, tanlash oynasi, havolalar.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { FlatList, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { tr } from '@/lib/i18n';
import { useColors } from '@/lib/store';
import { F } from '@/lib/theme';

/** Ekran kengligi bo'yicha joylashuv: telefon / planshet / kompyuter */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, wide: width >= 900, mid: width >= 640, xl: width >= 1200 };
}

export function Container({ children, style, max = 1180 }: { children: ReactNode; style?: StyleProp<ViewStyle>; max?: number }) {
  const { mid } = useLayout();
  return <View style={[{ width: '100%', maxWidth: max, alignSelf: 'center', paddingHorizontal: mid ? 28 : 16 }, style]}>{children}</View>;
}

/** Tashqi havola (vebda yangi oynada) */
export function openUrl(url: string) {
  if (Platform.OS === 'web' && /^https?:/.test(url)) globalThis.open?.(url, '_blank', 'noopener,noreferrer');
  else Linking.openURL(url).catch(() => {});
}

export type PickItem = { id: string; title: string; sub?: string; group?: string };

/** Ro'yxatdan tanlash oynasi (qidiruv bilan): kompyuterda markazda, telefonda pastdan */
export function PickerModal({ visible, title, items, value, onPick, onClose, searchPlaceholder = tr('Qidirish') }: {
  visible: boolean; title: string; items: PickItem[]; value?: string; onPick: (id: string) => void; onClose: () => void; searchPlaceholder?: string;
}) {
  const c = useColors();
  const { wide } = useLayout();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = items.filter(i => !query || (i.title + ' ' + (i.sub ?? '') + ' ' + (i.group ?? '')).toLowerCase().includes(query));
  const close = () => { setQ(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay, justifyContent: wide ? 'center' : 'flex-end' }]} onPress={close}>
        <Pressable style={[styles.panel, { backgroundColor: c.surface, borderColor: c.line }, wide ? styles.panelWide : styles.panelPhone]} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: c.text }]}>{title}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityLabel={tr('Yopish')}><Ionicons name="close" size={22} color={c.muted} /></Pressable>
          </View>
          <View style={[styles.search, { backgroundColor: c.surface2 }]}>
            <Ionicons name="search" size={17} color={c.faint} />
            <TextInput value={q} onChangeText={setQ} placeholder={searchPlaceholder} placeholderTextColor={c.faint} style={[styles.input, { color: c.text }]} autoFocus={Platform.OS === 'web'} />
          </View>
          <FlatList
            data={list}
            keyExtractor={i => i.id}
            style={{ maxHeight: wide ? 420 : 380 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const showGroup = item.group && item.group !== list[index - 1]?.group;
              const on = item.id === value;
              return (
                <View>
                  {showGroup ? <Text style={[styles.group, { color: c.faint }]}>{item.group}</Text> : null}
                  <Pressable onPress={() => { onPick(item.id); close(); }} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.row, { backgroundColor: on ? c.brandSoft : pressed || hovered ? c.surface2 : 'transparent' }]} accessibilityLabel={item.title}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{item.title}</Text>
                      {item.sub ? <Text style={[styles.rowSub, { color: c.muted }]} numberOfLines={1}>{item.sub}</Text> : null}
                    </View>
                    {on ? <Ionicons name="checkmark" size={18} color={c.brandDeep} /> : null}
                  </Pressable>
                </View>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', padding: 16 },
  panel: { width: '100%', borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  panelWide: { maxWidth: 460, borderRadius: 22 },
  panelPhone: { borderRadius: 24, maxWidth: 560 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: F.display, fontSize: 18 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, fontFamily: F.medium, fontSize: 15, height: 44 },
  group: { fontFamily: F.bold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12 },
  rowTitle: { fontFamily: F.semi, fontSize: 15 },
  rowSub: { fontFamily: F.medium, fontSize: 12.5, marginTop: 1 },
});
