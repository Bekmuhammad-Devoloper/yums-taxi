import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/toast';
import { Button, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';

const formatPhone = (d: string) => {
  const p = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return p.join(' ');
};

export default function Login() {
  const { colors: c, login } = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'phone' | 'code' | 'name'>('phone');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(true);
  const [timer, setTimer] = useState(0);
  const codeRef = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const sendCode = () => {
    setStep('code'); setCode(''); setTimer(59);
    toast('Demo: istalgan 4 ta raqamni kiriting', 'chatbox-ellipses');
    setTimeout(() => codeRef.current?.focus(), 300);
  };

  const onCode = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    setCode(d);
    if (d.length === 4) setTimeout(() => setStep('name'), 250);
  };

  const finish = () => {
    login({ name: name.trim(), phone: '+998 ' + formatPhone(digits) });
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={['#FFD84D', '#FFC800', '#F5A800']} style={[styles.hero, { paddingTop: insets.top + 24 }]}>
          {step !== 'phone' && (
            <Pressable onPress={() => setStep(step === 'name' ? 'code' : 'phone')} style={styles.back} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color="#0E1525" />
            </Pressable>
          )}
          <View style={styles.logo}><Text style={styles.logoY}>Y</Text></View>
          <Text style={styles.title}>YUMS Taxi</Text>
          <Text style={styles.tagline}>Tez. Arzon. Xavfsiz.{'\n'}Shahar bo'ylab bir bosishda.</Text>
          <Text style={styles.cars}>🚕  🚗  🚘</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: c.surface, paddingBottom: insets.bottom + 24 }]}>
          {step === 'phone' && (
            <>
              <Txt v="h1">Telefon raqamingiz</Txt>
              <Txt muted>Tasdiqlash kodi SMS orqali yuboriladi</Txt>
              <View style={[styles.phone, { backgroundColor: c.surface2, borderColor: digits.length === 9 ? c.brand : c.line }]}>
                <Text style={{ fontSize: 20 }}>🇺🇿</Text>
                <Text style={[styles.prefix, { color: c.text }]}>+998</Text>
                <TextInput
                  value={formatPhone(digits)}
                  onChangeText={v => setDigits(v.replace(/\D/g, '').slice(0, 9))}
                  keyboardType="phone-pad"
                  placeholder="90 123 45 67"
                  placeholderTextColor={c.faint}
                  autoFocus
                  style={[styles.phoneInput, { color: c.text }]}
                />
              </View>
              <Pressable onPress={() => setAgree(!agree)} style={styles.agree}>
                <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={22} color={agree ? '#E0A800' : c.faint} />
                <Txt v="small" muted style={{ flex: 1 }}>Foydalanish shartlari va maxfiylik siyosatiga roziman</Txt>
              </Pressable>
              <Button title="Kod olish" disabled={digits.length !== 9 || !agree} onPress={sendCode} />
            </>
          )}

          {step === 'code' && (
            <>
              <Txt v="h1">SMS kodni kiriting</Txt>
              <Txt muted>+998 {formatPhone(digits)} raqamiga yuborildi</Txt>
              <Pressable onPress={() => codeRef.current?.focus()} style={styles.otpRow}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={[styles.otp, { backgroundColor: c.surface2, borderColor: code.length === i ? c.brand : c.line }]}>
                    <Text style={[styles.otpText, { color: c.text }]}>{code[i] ?? ''}</Text>
                  </View>
                ))}
              </Pressable>
              <TextInput ref={codeRef} value={code} onChangeText={onCode} keyboardType="number-pad" maxLength={4} style={styles.hidden} autoFocus />
              <Pressable disabled={timer > 0} onPress={sendCode}>
                <Txt v="small" muted={timer > 0} color={timer > 0 ? undefined : c.accent} style={{ textAlign: 'center', fontWeight: '700' }}>
                  {timer > 0 ? `Kodni qayta yuborish: 0:${String(timer).padStart(2, '0')}` : 'Kodni qayta yuborish'}
                </Txt>
              </Pressable>
            </>
          )}

          {step === 'name' && (
            <>
              <Txt v="h1">Ismingiz nima?</Txt>
              <Txt muted>Haydovchi sizni shu ism bilan ko'radi</Txt>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Masalan: Aziz"
                placeholderTextColor={c.faint}
                autoFocus
                autoCapitalize="words"
                style={[styles.nameInput, { backgroundColor: c.surface2, color: c.text, borderColor: name.trim().length > 1 ? c.brand : c.line }]}
              />
              <View style={[styles.bonus, { backgroundColor: c.brandSoft }]}>
                <Text style={{ fontSize: 26 }}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Txt v="h3">25 000 so'm sovg'a</Txt>
                  <Txt v="small" muted>Balansingizga birinchi safar uchun. YANGI30 promokodi bilan yana -30%</Txt>
                </View>
              </View>
              <Button title="Boshlash" icon="arrow-forward" disabled={name.trim().length < 2} onPress={finish} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 56 },
  back: { position: 'absolute', left: 16, top: 56, width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  logo: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#0E1525', alignItems: 'center', justifyContent: 'center', marginTop: 36 },
  logoY: { color: '#FFC800', fontSize: 34, fontWeight: '900' },
  title: { fontSize: 38, fontWeight: '900', color: '#0E1525', marginTop: 18, letterSpacing: -1 },
  tagline: { fontSize: 17, fontWeight: '600', color: '#0E1525', opacity: 0.75, marginTop: 6, lineHeight: 24 },
  cars: { fontSize: 34, marginTop: 18 },
  card: { flex: 1, marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, gap: 14 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 62, borderRadius: 18, borderWidth: 2, paddingHorizontal: 16, marginTop: 6 },
  prefix: { fontSize: 20, fontWeight: '800' },
  phoneInput: { flex: 1, fontSize: 20, fontWeight: '700', letterSpacing: 0.5, height: '100%' },
  agree: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  otpRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginVertical: 10 },
  otp: { width: 62, height: 70, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  otpText: { fontSize: 30, fontWeight: '800' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  nameInput: { height: 60, borderRadius: 18, borderWidth: 2, paddingHorizontal: 18, fontSize: 19, fontWeight: '700', marginTop: 6 },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
});
