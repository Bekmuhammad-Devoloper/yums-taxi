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
            <View style={{ flex: 1 }} />
            {on ? <Ionicons name="checkmark-circle" size={22} color={c.brandDeep} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Sozlamalar uchun bitta qator: joriy til (bayroq va nomi) + strelka.
 * Bosilganda pastdan tillar ro'yxati ochiladi, tanlansa oyna yopilib til almashadi.
 */
export function LangRow({ label }: { label?: string }) {
  const { colors: c, lang } = useStore();
  const [open, setOpen] = useState(false);
  const cur = LANGS.find(l => l.id === lang) ?? LANGS[0];
  return (
    <>
      <Pressable onPress={() => { haptic.tap(); setOpen(true); }} accessibilityRole="button" accessibilityLabel={`${tr('Ilova tili')}: ${cur.label}`}
        style={({ pressed }) => [styles.langRow, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
        <View style={[styles.flagRound, styles.flagRoundBig, { borderColor: c.line }]}>
          <Flag code={cur.country} size={45} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {label ? <Text style={[styles.rowLabel, { color: c.muted }]} numberOfLines={1}>{label}</Text> : null}
          <Text style={[styles.label, { color: c.text }]} numberOfLines={1}>{cur.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.faint} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={tr('Ilova tili')}>
        <LangList onPicked={() => setOpen(false)} />
      </Sheet>
    </>
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
        style={({ pressed }) => [styles.btn, {
          backgroundColor: light ? 'rgba(255,255,255,0.14)' : c.surface2,
          borderColor: light ? 'rgba(255,255,255,0.18)' : c.line,
          opacity: pressed ? 0.8 : 1,
        }]}>
        {/* dumaloq bayroq: to'rtburchak bayroq doira ichida markazdan kesiladi */}
        <View style={[styles.flagRound, { borderColor: light ? 'rgba(255,255,255,0.35)' : c.line }]}>
          <Flag code={cur.country} size={33} />
        </View>
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
  label: { fontFamily: F.bold, fontSize: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, paddingStart: 6, paddingEnd: 11, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  flagRound: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  flagRoundBig: { width: 34, height: 34, borderRadius: 17 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16 },
  rowLabel: { fontFamily: F.semi, fontSize: 12.5, marginBottom: 1 },
  btnText: { fontFamily: F.heavy, fontSize: 13.5, letterSpacing: 0.5 },
});
