import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { BrandLogo, Button, Field, Flag, IconTile, Row, Segmented, Txt } from '@/components/ui';
import { COUNTRIES } from '@/lib/platform-data';
import { countryOf, usePlatform } from '@/lib/platform';
import { haptic, useStore, type AccountKind } from '@/lib/store';
import { F } from '@/lib/theme';

const GLOW = require('@/assets/images/glow.png');
const CODE_LEN = 5;

const PILLS: { icon: 'rocket-outline' | 'trending-up-outline' | 'car-sport-outline'; label: string }[] = [
  { icon: 'rocket-outline', label: 'Loyihalar' },
  { icon: 'trending-up-outline', label: 'Investorlar' },
  { icon: 'car-sport-outline', label: 'Taksi' },
];

const CODES = [
  { code: '+998', country: 'UZ', len: 9 },
  { code: '+7', country: 'KZ', len: 10 },
  { code: '+90', country: 'TR', len: 10 },
  { code: '+971', country: 'AE', len: 9 },
  { code: '+49', country: 'DE', len: 11 },
  { code: '+44', country: 'GB', len: 10 },
  { code: '+1', country: 'US', len: 10 },
];

const formatPhone = (d: string, cc: string) => {
  const parts = cc === '+998' ? [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)] : [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8)];
  return parts.filter(Boolean).join(' ');
};

export default function Login() {
  const { colors: c, login } = useStore();
  const { logEvent } = usePlatform();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'contact' | 'code' | 'profile'>('contact');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [cc, setCc] = useState(CODES[0]);
  const [digits, setDigits] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<AccountKind>('person');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('UZ');
  const [agree, setAgree] = useState(false);
  const [timer, setTimer] = useState(0);
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [picker, setPicker] = useState<'cc' | 'country' | null>(null);
  const codeRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [codeFocus, setCodeFocus] = useState(false);
  const [blink] = useState(() => new Animated.Value(1));

  // Faol katakdagi kursor miltillashi
  useEffect(() => {
    if (step !== 'code') return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(blink, { toValue: 0, duration: 450, delay: 250, useNativeDriver: true }),
      Animated.timing(blink, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [step, blink]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const phoneOk = digits.length >= Math.min(cc.len, 9) && digits.length <= cc.len;
  const emailOk = /^\S+@\S+\.\S{2,}$/.test(email.trim());
  const contactOk = (method === 'phone' ? phoneOk : emailOk) && agree;
  const target = method === 'phone' ? `${cc.code} ${formatPhone(digits, cc.code)}` : email.trim();

  const sendCode = () => {
    setStep('code'); setCode(''); setTimer(59);
    toast(`Demo: istalgan ${CODE_LEN} ta raqamni kiriting`, method === 'phone' ? 'chatbox-ellipses' : 'mail');
    setTimeout(() => codeRef.current?.focus(), 300);
  };

  const onCode = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, CODE_LEN);
    setCode(d);
    if (d.length === CODE_LEN) { haptic.success(); setTimeout(() => setStep('profile'), 300); }
  };

  const profileOk = name.trim().length > 1 && (kind === 'person' || company.trim().length > 1);
  const finish = () => {
    login({
      name: name.trim(), kind, company: kind === 'company' ? company.trim() : undefined, country,
      phone: method === 'phone' ? target : '', email: method === 'email' ? target : undefined,
    });
    logEvent(`Ro'yxatdan o'tish / kirish (${method === 'phone' ? 'SMS kod' : 'email kod'})`);
    router.replace('/');
  };

  const back = () => setStep(step === 'profile' ? 'code' : 'contact');
  const k = countryOf(country);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={['#000000', '#0B0904', '#16120A']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Image source={GLOW} pointerEvents="none" style={[styles.glow, { top: insets.top - (step === 'contact' ? 70 : 100) }]} contentFit="contain" />
          {step !== 'contact' && (
            <Pressable onPress={back} style={[styles.back, { top: insets.top + 12 }]} hitSlop={10}>
              <Ionicons name="chevron-back" size={21} color="#fff" />
            </Pressable>
          )}
          <BrandLogo width={step === 'contact' ? 168 : 120} style={{ alignSelf: 'center', marginTop: step === 'contact' ? 20 : 8 }} />
          <Text style={styles.tagTitle}>Xalqaro raqamli loyihalar platformasi</Text>
          <Text style={styles.tagSub}>Loyihalar, hamkorlar va investorlar — bir joyda</Text>
          {step === 'contact' && (
            <View style={styles.pills}>
              {PILLS.map(x => (
                <View key={x.label} style={styles.pill}>
                  <Ionicons name={x.icon} size={14} color="#F5C542" />
                  <Text style={styles.pillText}>{x.label}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: c.surface, paddingBottom: insets.bottom + 24 }]}>
          {step === 'contact' && (
            <>
              <Txt v="h1">Kirish yoki ro'yxatdan o'tish</Txt>
              <Txt muted>Tasdiqlash kodi {method === 'phone' ? 'SMS' : 'email'} orqali yuboriladi</Txt>
              <Segmented value={method} onChange={m => { setMethod(m); }} items={[{ id: 'phone', label: 'Telefon' }, { id: 'email', label: 'Email' }]} />
              {method === 'phone' ? (
                <View style={[styles.phone, { backgroundColor: phoneFocus ? c.surface : c.surface2, borderColor: phoneFocus || phoneOk ? c.brand : c.line }]}>
                  <Pressable onPress={() => setPicker('cc')} style={styles.cc} hitSlop={6}>
                    <Flag code={cc.country} size={26} />
                    <Text style={[styles.prefix, { color: c.text }]}>{cc.code}</Text>
                    <Ionicons name="chevron-down" size={14} color={c.faint} />
                  </Pressable>
                  <TextInput
                    value={formatPhone(digits, cc.code)}
                    onChangeText={v => setDigits(v.replace(/\D/g, '').slice(0, cc.len))}
                    keyboardType="phone-pad"
                    onFocus={() => setPhoneFocus(true)}
                    onBlur={() => setPhoneFocus(false)}
                    placeholder={cc.code === '+998' ? '90 123 45 67' : '123 456 78 90'}
                    placeholderTextColor={c.faint}
                    autoFocus
                    style={[styles.phoneInput, { color: c.text }]}
                  />
                </View>
              ) : (
                <Field value={email} onChangeText={setEmail} placeholder="name@company.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoFocus inputStyle={{ fontSize: 18, minHeight: 58 }} />
              )}
              <Pressable onPress={() => { haptic.tap(); setAgree(!agree); }} style={styles.agree} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
                <View style={[styles.check, agree ? { backgroundColor: c.brand, borderColor: c.brand } : { borderColor: c.faint }]}>
                  {agree && <Ionicons name="checkmark" size={15} color={c.brandText} />}
                </View>
                <Txt v="small" muted style={{ flex: 1, lineHeight: 19 }}>
                  <Txt v="small" color={c.accent} onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}>Foydalanish shartlari</Txt>,{' '}
                  <Txt v="small" color={c.accent} onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}>maxfiylik siyosati</Txt> va{' '}
                  <Txt v="small" color={c.accent} onPress={() => router.push({ pathname: '/legal', params: { doc: 'cookies' } })}>cookie</Txt> qoidalariga roziman
                </Txt>
              </Pressable>
              <Button title="Kod olish" disabled={!contactOk} onPress={sendCode} />
            </>
          )}

          {step === 'code' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">Kodni kiriting</Txt>
                <Txt muted>{CODE_LEN} xonali kod {method === 'phone' ? 'SMS orqali' : 'emailga'} yuborildi</Txt>
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  <Txt style={{ fontFamily: F.bold }}>{target}</Txt>
                  <Pressable onPress={() => setStep('contact')} hitSlop={8} style={[styles.change, { backgroundColor: c.surface2 }]}>
                    <Ionicons name="create-outline" size={13} color={c.text} />
                    <Txt v="tiny">O'zgartirish</Txt>
                  </Pressable>
                </Row>
              </View>

              <Pressable onPress={() => codeRef.current?.focus()} style={styles.otpRow} accessibilityLabel="Tasdiqlash kodi">
                {Array.from({ length: CODE_LEN }, (_, i) => {
                  const filled = i < code.length;
                  const active = codeFocus && i === Math.min(code.length, CODE_LEN - 1) && !(filled && code.length === CODE_LEN);
                  return (
                    <View key={i} style={[styles.otp, {
                      backgroundColor: active ? c.surface : c.surface2,
                      borderColor: active ? c.brand : filled ? c.surface3 : c.line,
                    }]}>
                      {filled
                        ? <Text style={[styles.otpText, { color: c.text }]}>{code[i]}</Text>
                        : active
                          ? <Animated.View style={[styles.caret, { backgroundColor: c.brand, opacity: blink }]} />
                          : <View style={[styles.otpDot, { backgroundColor: c.faint }]} />}
                    </View>
                  );
                })}
              </Pressable>
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={onCode}
                onFocus={() => setCodeFocus(true)}
                onBlur={() => setCodeFocus(false)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={CODE_LEN}
                style={styles.hidden}
                autoFocus
              />

              <View style={styles.resend}>
                {timer > 0 ? (
                  <>
                    <Ionicons name="time-outline" size={16} color={c.muted} />
                    <Txt v="small" muted>Kodni qayta yuborish</Txt>
                    <Txt v="small" style={{ fontFamily: F.bold, fontVariant: ['tabular-nums'] }}>0:{String(timer).padStart(2, '0')}</Txt>
                  </>
                ) : (
                  <Pressable onPress={sendCode} hitSlop={8} style={styles.resendBtn}>
                    <Ionicons name="refresh" size={16} color={c.accent} />
                    <Txt v="small" color={c.accent} style={{ fontFamily: F.bold }}>Kodni qayta yuborish</Txt>
                  </Pressable>
                )}
              </View>

              <Button title="Tasdiqlash" disabled={code.length < CODE_LEN} onPress={() => setStep('profile')} />

              <View style={[styles.secure, { backgroundColor: c.surface2, borderColor: c.line }]}>
                <IconTile name="shield-checkmark-outline" color={c.ok} size={38} />
                <Txt v="small" muted style={{ flex: 1 }}>Kodni hech kimga aytmang. YUMS xodimlari uni hech qachon so'ramaydi.</Txt>
              </View>
            </>
          )}

          {step === 'profile' && (
            <>
              <Txt v="h1">Profilingiz</Txt>
              <Txt muted>Kim sifatida qatnashasiz? Keyinroq o'zgartirish mumkin</Txt>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([['person', 'Jismoniy shaxs', 'person', "Tadbirkor, mutaxassis, investor"], ['company', 'Kompaniya', 'business', 'MChJ, AJ, xorijiy kompaniya']] as const).map(([id, l, i, d]) => {
                  const on = kind === id;
                  return (
                    <Pressable key={id} onPress={() => { haptic.tap(); setKind(id); }} style={[styles.kind, { backgroundColor: on ? c.brandSoft : c.surface2, borderColor: on ? c.brand : 'transparent' }]}>
                      <Ionicons name={i} size={24} color={c.text} />
                      <Txt v="h3">{l}</Txt>
                      <Txt v="tiny" faint>{d}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              {kind === 'company' && <Field label="Kompaniya nomi" value={company} onChangeText={setCompany} placeholder="Masalan: Silk Road Logistics" />}
              <Field label={kind === 'company' ? "Mas'ul shaxs" : 'Ismingiz'} value={name} onChangeText={setName} placeholder="Masalan: Aziz Karimov" autoCapitalize="words" />
              <SelectField label="Mamlakat" value={k.name} left={<Flag code={k.code} size={22} />} placeholder="Mamlakat" onPress={() => setPicker('country')} />
              <View style={[styles.bonus, { backgroundColor: c.brandSoft }]}>
                <IconTile name="gift-outline" color={c.brandDeep} size={44} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">Xush kelibsiz sovg'asi</Txt>
                  <Txt v="small" muted>Birinchi loyiha joylashtirish bepul + YUMS Taxi balansiga 25 000 so'm</Txt>
                </View>
              </View>
              <Button title="Boshlash" icon="arrow-forward" disabled={!profileOk} onPress={finish} />
            </>
          )}
        </View>
      </ScrollView>

      <PickerSheet visible={picker === 'cc'} onClose={() => setPicker(null)} title="Mamlakat kodi" selected={[cc.code]}
        onChange={ids => { const n = CODES.find(x => x.code === ids[0]); if (n) { setCc(n); setCountry(n.country); setDigits(d => d.slice(0, n.len)); } }}
        options={CODES.map(x => ({ id: x.code, label: `${countryOf(x.country).name} (${x.code})`, flag: x.country }))} />
      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title="Mamlakat" selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, flag: x.code, sub: x.region }))} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 52, overflow: 'hidden' },
  glow: { position: 'absolute', alignSelf: 'center', width: 420, height: 420 },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  tagTitle: { fontSize: 17, fontFamily: F.semi, color: '#fff', textAlign: 'center', letterSpacing: -0.3, marginTop: 14 },
  tagSub: { fontSize: 13.5, fontFamily: F.medium, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 4 },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  pillText: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, fontFamily: F.semi },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  card: { flex: 1, marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, gap: 14 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 60, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 14 },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefix: { fontSize: 19, fontFamily: F.heavy },
  phoneInput: { flex: 1, minWidth: 0, fontSize: 20, fontFamily: F.bold, letterSpacing: 0.5, height: '100%' },
  agree: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 },
  otp: { flex: 1, maxWidth: 64, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  caret: { width: 2, height: 26, borderRadius: 1 },
  otpDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.5 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 24 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  otpText: { fontSize: 26, fontFamily: F.display },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  kind: { flex: 1, padding: 14, borderRadius: 18, borderWidth: 2, gap: 4 },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
});
