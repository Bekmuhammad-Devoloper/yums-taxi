import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { IMAGE_SPECS, pickImage } from '@/lib/media';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import { toast } from './toast';
import { Row, Txt } from './ui';

/** Muqova (16:9), banner (2:1) yoki mahsulot (4:3) rasmi yuklash maydoni — oldindan ko'rish bilan */
export function ImageSlot({ kind, value, onChange, label }: { kind: 'cover' | 'banner' | 'product'; value?: string; onChange: (uri: string | undefined) => void; label: string }) {
  const { colors: c } = useStore();
  const [busy, setBusy] = useState(false);
  const spec = IMAGE_SPECS[kind];

  const pick = async () => {
    haptic.tap();
    setBusy(true);
    const r = await pickImage(kind);
    setBusy(false);
    if (r.ok) onChange(r.uri);
    else if (r.reason === 'error') toast("Rasmni yuklab bo'lmadi, boshqasini tanlang", 'alert-circle');
  };

  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{label}</Txt>
        <Txt v="tiny" faint>{spec.label}</Txt>
      </Row>
      {value ? (
        <View style={[styles.frame, { aspectRatio: spec.aspect[0] / spec.aspect[1], backgroundColor: c.surface2 }]}>
          <Image source={{ uri: value }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={label} />
          <Row gap={8} style={styles.actions}>
            <Pressable onPress={pick} style={styles.action} accessibilityLabel="Rasmni almashtirish">
              <Ionicons name="swap-horizontal" size={15} color="#fff" />
              <Txt v="tiny" color="#fff">Almashtirish</Txt>
            </Pressable>
            <Pressable onPress={() => { haptic.tap(); onChange(undefined); }} style={styles.action} accessibilityLabel="Rasmni o'chirish">
              <Ionicons name="trash-outline" size={15} color="#fff" />
            </Pressable>
          </Row>
          {busy && <View style={[StyleSheet.absoluteFill, styles.busy]}><ActivityIndicator color="#fff" /></View>}
        </View>
      ) : (
        <Pressable
          onPress={pick}
          style={({ pressed }) => [styles.frame, styles.empty, { aspectRatio: spec.aspect[0] / spec.aspect[1], borderColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
          {busy ? <ActivityIndicator color={c.muted} /> : (
            <>
              <View style={[styles.emptyIco, { backgroundColor: c.surface2 }]}>
                <Ionicons name="image-outline" size={24} color={c.muted} />
              </View>
              <Txt v="small" style={{ fontFamily: F.bold }}>Rasm yuklash</Txt>
              <Txt v="tiny" faint>JPG yoki PNG · tavsiya: {spec.label}</Txt>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyIco: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actions: { position: 'absolute', right: 10, bottom: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)' },
  busy: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
