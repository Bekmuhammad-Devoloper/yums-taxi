import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { BrandLogo, Button, Field, Flag, IconTile, Segmented, Txt } from '@/components/ui';
import { COUNTRIES, SECTIONS } from '@/lib/platform-data';
import { countryOf, usePlatform } from '@/lib/platform';
import { haptic, useStore, type AccountKind } from '@/lib/store';
import { F } from '@/lib/theme';

const CODES = [
  { code: '+998', flag: '🇺🇿', country: 'UZ', len: 9 },
  { code: '+7', flag: '🇰🇿', country: 'KZ', len: 10 },
  { code: '+90', flag: '🇹🇷', country: 'TR', len: 10 },
  { code: '+971', flag: '🇦🇪', country: 'AE', len: 9 },
  { code: '+49', flag: '🇩🇪', country: 'DE', len: 11 },
  { code: '+44', flag: '🇬🇧', country: 'GB', len: 10 },
  { code: '+1', flag: '🇺🇸', country: 'US', len: 10 },
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
    toast('Demo: istalgan 4 ta raqamni kiriting', method === 'phone' ? 'chatbox-ellipses' : 'mail');
    setTimeout(() => codeRef.current?.focus(), 300);
  };

  const onCode = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    setCode(d);
    if (d.length === 4) { haptic.success(); setTimeout(() => setStep('profile'), 250); }
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
          <View pointerEvents="none" style={[styles.glow, { top: insets.top + 10 }]} />
          {step !== 'contact' && (
            <Pressable onPress={back} style={[styles.back, { top: insets.top + 12 }]} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
          )}
          <BrandLogo width={step === 'contact' ? 170 : 130} style={{ alignSelf: 'center', marginTop: 8, marginBottom: 14 }} />
          <Text style={styles.tagline}>Xalqaro raqamli loyihalar platformasi{'\n'}Loyihalar, hamkorlar va investorlar — bir joyda</Text>
          <View style={styles.sections}>
            {SECTIONS.map(s => <IconTile key={s.id} name={s.icon} color="#F5C542" size={34} glass />)}
            <IconTile name="car-sport-outline" color="#F5C542" size={34} glass />
          </View>
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
                    <Flag code={cc.country} emoji={cc.flag} />
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
              <Pressable onPress={() => setAgree(!agree)} style={styles.agree}>
                <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={22} color={agree ? c.brandDeep : c.faint} />
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
              <Txt v="h1">Kodni kiriting</Txt>
              <Txt muted>{target} {method === 'phone' ? 'raqamiga' : 'manziliga'} yuborildi</Txt>
              <Pressable onPress={() => codeRef.current?.focus()} style={styles.otpRow}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={[styles.otp, { backgroundColor: c.surface2, borderColor: code.length === i ? c.brand : c.line }]}>
                    <Text style={[styles.otpText, { color: c.text }]}>{code[i] ?? ''}</Text>
                  </View>
                ))}
              </Pressable>
              <TextInput ref={codeRef} value={code} onChangeText={onCode} keyboardType="number-pad" maxLength={4} style={styles.hidden} autoFocus />
              <Pressable disabled={timer > 0} onPress={sendCode}>
                <Txt v="small" muted={timer > 0} color={timer > 0 ? undefined : c.accent} style={{ textAlign: 'center', fontFamily: F.bold }}>
                  {timer > 0 ? `Kodni qayta yuborish: 0:${String(timer).padStart(2, '0')}` : 'Kodni qayta yuborish'}
                </Txt>
              </Pressable>
              <Txt v="tiny" faint style={{ textAlign: 'center' }}>Xavfsizlik: kodni hech kimga aytmang — YUMS xodimlari uni hech qachon so'ramaydi</Txt>
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
              <SelectField label="Mamlakat" value={k.name} left={<Flag code={k.code} emoji={k.flag} size={22} />} placeholder="Mamlakat" onPress={() => setPicker('country')} />
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
        options={CODES.map(x => ({ id: x.code, label: `${countryOf(x.country).name} (${x.code})`, emoji: x.flag }))} />
      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title="Mamlakat" selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, emoji: x.flag, sub: x.region }))} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 52, overflow: 'hidden' },
  glow: { position: 'absolute', alignSelf: 'center', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,200,0,0.07)' },
  back: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  tagline: { fontSize: 14.5, fontFamily: F.medium, color: 'rgba(255,255,255,0.68)', lineHeight: 21, textAlign: 'center', letterSpacing: 0.2 },
  sections: { flexDirection: 'row', gap: 6, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  card: { flex: 1, marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, gap: 14 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 60, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 14 },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefix: { fontSize: 19, fontFamily: F.heavy },
  phoneInput: { flex: 1, minWidth: 0, fontSize: 20, fontFamily: F.bold, letterSpacing: 0.5, height: '100%' },
  agree: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  otpRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginVertical: 10 },
  otp: { width: 62, height: 70, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  otpText: { fontSize: 26, fontFamily: F.display },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  kind: { flex: 1, padding: 14, borderRadius: 18, borderWidth: 2, gap: 4 },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
});
