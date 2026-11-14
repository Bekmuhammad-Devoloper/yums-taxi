// Ekran chizishda kutilmagan xato: ilova yopilib qolmaydi — xato matni va «Qayta urinish» tugmasi ko'rsatiladi.
// Ataylab hech qanday umumiy holatga (store, tema, tarjima) bog'lanmagan — xato aynan o'shalarda bo'lishi mumkin.
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { describeError } from '@/lib/crash-guard';

export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  // xato ilova ochilayotganda bo'lsa, logotip ekrani xato ustida qolib ketmasin
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Ilovada xatolik</Text>
      <Text style={styles.sub}>Bu ekranning rasmini (skrinshot) dasturchiga yuboring va «Qayta urinish» ni bosing.</Text>
      <ScrollView style={styles.box} contentContainerStyle={{ padding: 14 }}>
        <Text style={styles.code} selectable>{describeError(error)}</Text>
      </ScrollView>
      <Pressable onPress={() => { retry().catch(() => {}); }} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        <Text style={styles.btnText}>Qayta urinish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0F', paddingHorizontal: 20, paddingTop: 72, paddingBottom: 36, gap: 14 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20 },
  box: { flex: 1, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  code: { color: '#FFD84D', fontSize: 12, lineHeight: 17, fontFamily: 'monospace' },
  btn: { height: 52, borderRadius: 16, backgroundColor: '#FFD84D', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#111111', fontSize: 16, fontWeight: '800' },
});
