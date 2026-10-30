// Ilova tilini tanlash: ro'yxat (sozlamalar) va kichik tugma (kirish, ro'yxatdan o'tish — pastdan oyna ochadi).
// Til almashganda ekranlar yangi tilda qayta chiziladi; arab tiliga o'tilganda telefonda ilova qayta yuklanadi (o'ngdan chapga).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Flag, Sheet } from '@/components/ui';
import { LANGS, tr } from '@/lib/i18n';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

export function LangList({ onPicked }: { onPicked?: () => void }) {
  const { colors: c, lang, setLang } = useStore();
  return (
    <View style={{ gap: 2 }}>
      {LANGS.map(l => {
        const on = lang === l.id;
        return (
          <Pressable key={l.id} onPress={() => { haptic.tap(); onPicked?.(); if (!on) setLang(l.id); }}
            accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={l.label}
            style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
            <Flag code={l.country} size={28} />
            <Text style={[styles.label, { color: c.text }]}>{l.label}</Text>
            {on ? <Ionicons name="checkmark-circle" size={22} color={c.brandDeep} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Joriy til (bayroq va qisqa nom); bosilganda tillar ro'yxati ochiladi */
export function LangButton({ light }: { light?: boolean }) {
  const { colors: c, lang } = useStore();
  const [open, setOpen] = useState(false);
  const cur = LANGS.find(l => l.id === lang) ?? LANGS[0];
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={tr('Ilova tili')}
        style={({ pressed }) => [styles.btn, { backgroundColor: light ? 'rgba(255,255,255,0.14)' : c.surface2, opacity: pressed ? 0.8 : 1 }]}>
        <Flag code={cur.country} size={18} />
        <Text style={[styles.btnText, { color: light ? '#fff' : c.text }]}>{cur.id.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={14} color={light ? 'rgba(255,255,255,0.7)' : c.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={tr('Ilova tili')}>
        <LangList onPicked={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
  label: { flex: 1, fontFamily: F.bold, fontSize: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 10, borderRadius: 12 },
  btnText: { fontFamily: F.heavy, fontSize: 12.5, letterSpacing: 0.4 },
});
