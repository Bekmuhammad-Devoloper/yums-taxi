import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo, PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Avatar, BrandLogo, Button, Field, Flag, IconTile, Row, Txt } from '@/components/ui';
import { COUNTRIES } from '@/lib/platform-data';
import { countryOf, usePlatform } from '@/lib/platform';
import { haptic, useStore, type AccountKind, type User } from '@/lib/store';
import { F } from '@/lib/theme';

const GLOW = require('@/assets/images/glow.png');
const CODE_LEN = 5;
const MAX_ATTEMPTS = 3;
const DEMO_PHONE = '900000000';

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

/** «+998 93 111 22 33» → mamlakat kodi va qolgan raqamlar */
const parsePhone = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  const cc = [...CODES].sort((a, b) => b.code.length - a.code.length).find(x => d.startsWith(x.code.slice(1)));
  return cc ? { cc, digits: d.slice(cc.code.length - 1) } : null;
};

/** Hisob tanlash ro'yxatida kontaktni qisman yashirish: +998 93 ••• •• 33, na•••@mail.uz */
const maskPhone = (p: string) => {
  const parts = p.split(' ');
  return parts.map((x, i) => (i <= 1 || i === parts.length - 1 ? x : '•'.repeat(x.length))).join(' ');
};
const maskEmail = (e: string) => {
  const [n, d] = e.split('@');
  return `${n.slice(0, 2)}${'•'.repeat(Math.max(1, n.length - 2))}@${d ?? ''}`;
};

/** Demo SMS kodi (haqiqiy tizimda server yuboradi) */
const newCode = () => String(Math.floor(10 ** (CODE_LEN - 1) + Math.random() * 9 * 10 ** (CODE_LEN - 1)));

type Step = 'accounts' | 'contact' | 'code' | 'profile';

/**
 * Kirish — Yandex Go uslubida yagona oqim:
 * raqam (yoki email) → SMS kod → hisob bo'lsa darhol ichkariga, yangi bo'lsa «Keling, tanishamiz».
 * Qurilmada avval kirilgan hisoblar «Hisobni tanlang» ro'yxatida chiqadi.
 */
export default function Login() {
  const { colors: c, login, signIn, findAccount, savedAccounts, forgetAccount } = useStore();
  const { logEvent } = usePlatform();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(() => (savedAccounts.length ? 'accounts' : 'contact'));
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [cc, setCc] = useState(CODES[0]);
  const [digits, setDigits] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [codeError, setCodeError] = useState<'wrong' | 'locked' | null>(null);
  const [kind, setKind] = useState<AccountKind>('person');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('UZ');
  const [timer, setTimer] = useState(0);
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [picker, setPicker] = useState<'cc' | 'country' | null>(null);
  const codeRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [codeFocus, setCodeFocus] = useState(false);
  const [blink] = useState(() => new Animated.Value(1));
  const [shake] = useState(() => new Animated.Value(0));

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
  const contactOk = method === 'phone' ? phoneOk : emailOk;
  const target = method === 'phone' ? `${cc.code} ${formatPhone(digits, cc.code)}` : email.trim();
  const account = findAccount(method === 'phone' ? { phone: target } : { email: target });

  // Demo rejim: haqiqiy SMS o'rniga kod ekranda va bildirishnomada ko'rsatiladi
  const sendCode = (m: 'phone' | 'email' = method) => {
    const next = newCode();
    setSent(next); setCode(''); setAttempts(0); setCodeError(null); setTimer(59);
    setStep('code');
    toast(`${m === 'phone' ? 'SMS' : 'Email'} · YUMS: tasdiqlash kodi ${next}`, m === 'phone' ? 'chatbox-ellipses' : 'mail');
    setTimeout(() => codeRef.current?.focus(), 300);
  };

  const chooseAccount = (a: User) => {
    haptic.tap();
    const parsed = a.phone ? parsePhone(a.phone) : null;
    if (parsed) { setMethod('phone'); setCc(parsed.cc); setDigits(parsed.digits); sendCode('phone'); return; }
    if (a.email) { setMethod('email'); setEmail(a.email); sendCode('email'); }
  };

  const demoLogin = () => { haptic.tap(); setMethod('phone'); setCc(CODES[0]); setDigits(DEMO_PHONE); sendCode('phone'); };

  const doShake = () => Animated.sequence(
    [10, -10, 7, -7, 3, 0].map(v => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true })),
  ).start();

  const onCode = (v: string) => {
    if (codeError === 'locked') return;
    const d = v.replace(/\D/g, '').slice(0, CODE_LEN);
    setCode(d);
    if (codeError) setCodeError(null);
    if (d.length < CODE_LEN) return;
    if (d === sent) { haptic.success(); setTimeout(verified, 250); return; }
    const n = attempts + 1;
    setAttempts(n);
    setCodeError(n >= MAX_ATTEMPTS ? 'locked' : 'wrong');
    haptic.error();
    doShake();
    setTimeout(() => setCode(''), 500);
  };

  // Kod to'g'ri: hisob bo'lsa — darhol ichkariga, bo'lmasa — yangi hisob uchun profil
  const verified = () => {
    if (!account) { setStep('profile'); return; }
    signIn(account);
    logEvent(`Tizimga kirish (${method === 'phone' ? 'SMS kod' : 'email kod'})`);
    toast(`Xush kelibsiz, ${account.name.split(' ')[0]}!`, 'hand-right');
    router.replace('/');
  };

  const profileOk = name.trim().length > 1 && (kind === 'person' || company.trim().length > 1);
  const finish = () => {
    login({
      name: name.trim(), kind, company: kind === 'company' ? company.trim() : undefined, country,
      phone: method === 'phone' ? target : '', email: method === 'email' ? target : undefined,
    });
    logEvent(`Ro'yxatdan o'tish (${method === 'phone' ? 'SMS kod' : 'email kod'})`);
    router.replace('/');
  };

  const back = () => {
    if (step === 'contact') setStep('accounts');
    else setStep('contact');
  };
  const canBack = step === 'code' || step === 'profile' || (step === 'contact' && savedAccounts.length > 0);
  const big = step === 'accounts' || step === 'contact';
  const k = countryOf(country);
  const locked = codeError === 'locked';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={['#000000', '#0B0904', '#16120A']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Image source={GLOW} pointerEvents="none" style={[styles.glow, { top: insets.top - (big ? 70 : 110) }]} contentFit="contain" />
          {canBack && (
            <Pressable onPress={back} style={[styles.back, { top: insets.top + 12 }]} hitSlop={10} accessibilityLabel="Orqaga">
              <Ionicons name="chevron-back" size={21} color="#fff" />
            </Pressable>
          )}
          <BrandLogo width={big ? 168 : 112} style={{ alignSelf: 'center', marginTop: big ? 20 : 6 }} />
          <Text style={styles.tagTitle}>Xalqaro raqamli loyihalar platformasi</Text>
          {big && <Text style={styles.tagSub}>Loyihalar, hamkorlar va investorlar — bir joyda</Text>}
          {big && (
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
          {/* ---------- Hisobni tanlash ---------- */}
          {step === 'accounts' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">Hisobni tanlang</Txt>
                <Txt muted>Shu qurilmada avval kirgan hisoblaringiz</Txt>
              </View>
              <View style={[styles.accList, { borderColor: c.line }]}>
                {savedAccounts.map((a, i) => {
                  const title = a.kind === 'company' && a.company ? a.company : a.name;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => chooseAccount(a)}
                      style={({ pressed }) => [styles.accRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
                      {a.kind === 'company' && a.company ? <Logo name={a.company} color={c.ok} size={44} /> : <Avatar name={a.name} size={44} />}
                      <View style={{ flex: 1 }}>
                        <Txt v="h3" numberOfLines={1}>{title}</Txt>
                        <Txt v="small" muted numberOfLines={1}>{a.phone ? maskPhone(a.phone) : maskEmail(a.email ?? '')}</Txt>
                      </View>
                      <Pressable
                        onPress={() => { haptic.tap(); if (a.id) forgetAccount(a.id); if (savedAccounts.length === 1) setStep('contact'); }}
                        hitSlop={10}
                        style={[styles.forget, { backgroundColor: c.surface2 }]}
                        accessibilityLabel={`${title} — ro'yxatdan olib tashlash`}>
                        <Ionicons name="close" size={15} color={c.muted} />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
              <Button title="Boshqa hisob bilan kirish" kind="ghost" icon="person-add-outline" onPress={() => { setDigits(''); setEmail(''); setStep('contact'); }} />
            </>
          )}

          {/* ---------- Telefon yoki email ---------- */}
          {step === 'contact' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">{method === 'phone' ? 'Telefon raqamingiz' : 'Email manzilingiz'}</Txt>
                <Txt muted>Kirish yoki ro'yxatdan o'tish uchun {method === 'phone' ? 'SMS orqali' : 'emailga'} kod yuboramiz</Txt>
              </View>
              {method === 'phone' ? (
                <View style={[styles.phone, { backgroundColor: phoneFocus ? c.surface : c.surface2, borderColor: phoneFocus ? c.brand : c.line }]}>
                  <Pressable onPress={() => setPicker('cc')} style={styles.cc} hitSlop={6} accessibilityLabel="Mamlakat kodi">
                    <Flag code={cc.country} size={26} />
                    <Text style={[styles.prefix, { color: c.text }]}>{cc.code}</Text>
                    <Ionicons name="chevron-down" size={14} color={c.faint} />
                  </Pressable>
                  <TextInput
                    value={formatPhone(digits, cc.code)}
                    onChangeText={v => setDigits(v.replace(/\D/g, '').slice(0, cc.len))}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    onFocus={() => setPhoneFocus(true)}
                    onBlur={() => setPhoneFocus(false)}
                    onSubmitEditing={() => contactOk && sendCode()}
                    placeholder={cc.code === '+998' ? '90 123 45 67' : '123 456 78 90'}
                    placeholderTextColor={c.faint}
                    autoFocus
                    style={[styles.phoneInput, { color: c.text }]}
                  />
                  {digits ? (
                    <Pressable onPress={() => setDigits('')} hitSlop={10} accessibilityLabel="Tozalash">
                      <Ionicons name="close-circle" size={20} color={c.faint} />
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Field
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={() => contactOk && sendCode()}
                  placeholder="name@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  inputStyle={{ fontSize: 18, minHeight: 58 }}
                />
              )}
              <Button title="Davom etish" disabled={!contactOk} onPress={() => sendCode()} />

              <View style={styles.or}>
                <View style={[styles.orLine, { backgroundColor: c.line }]} />
                <Txt v="tiny" faint>yoki</Txt>
                <View style={[styles.orLine, { backgroundColor: c.line }]} />
              </View>
              <Pressable
                onPress={() => { haptic.tap(); setMethod(method === 'phone' ? 'email' : 'phone'); }}
                style={({ pressed }) => [styles.alt, { borderColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
                <Ionicons name={method === 'phone' ? 'mail-outline' : 'call-outline'} size={18} color={c.text} />
                <Txt style={{ fontFamily: F.semi }}>{method === 'phone' ? 'Email orqali kirish' : 'Telefon orqali kirish'}</Txt>
              </Pressable>

              <Txt v="tiny" faint style={styles.legal}>
                «Davom etish»ni bosib, siz{' '}
                <Txt v="tiny" color={c.accent} onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}>Foydalanish shartlari</Txt> va{' '}
                <Txt v="tiny" color={c.accent} onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}>Maxfiylik siyosati</Txt>ga rozilik bildirasiz
              </Txt>

              <Pressable onPress={demoLogin} hitSlop={6} style={styles.demo}>
                <Ionicons name="flask-outline" size={15} color={c.faint} />
                <Txt v="small" faint>Demo hisob bilan kirish</Txt>
              </Pressable>
            </>
          )}

          {/* ---------- SMS kod ---------- */}
          {step === 'code' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">{method === 'phone' ? 'SMS kodni kiriting' : 'Emaildagi kodni kiriting'}</Txt>
                <Txt muted>{CODE_LEN} xonali kodni yubordik:</Txt>
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  <Txt style={{ fontFamily: F.bold }}>{target}</Txt>
                  <Pressable onPress={() => setStep('contact')} hitSlop={8} style={[styles.change, { backgroundColor: c.surface2 }]}>
                    <Ionicons name="create-outline" size={13} color={c.text} />
                    <Txt v="tiny">O'zgartirish</Txt>
                  </Pressable>
                </Row>
              </View>

              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <Pressable onPress={() => codeRef.current?.focus()} style={styles.otpRow} accessibilityLabel="Tasdiqlash kodi">
                  {Array.from({ length: CODE_LEN }, (_, i) => {
                    const filled = i < code.length;
                    const active = !locked && codeFocus && i === Math.min(code.length, CODE_LEN - 1) && !(filled && code.length === CODE_LEN);
                    return (
                      <View key={i} style={[styles.otp, {
                        backgroundColor: active ? c.surface : c.surface2,
                        borderColor: codeError ? c.danger : active ? c.brand : filled ? c.surface3 : c.line,
                        opacity: locked ? 0.5 : 1,
                      }]}>
                        {filled
                          ? <Text style={[styles.otpText, { color: codeError ? c.danger : c.text }]}>{code[i]}</Text>
                          : active
                            ? <Animated.View style={[styles.caret, { backgroundColor: c.brand, opacity: blink }]} />
                            : <View style={[styles.otpDot, { backgroundColor: c.faint }]} />}
                      </View>
                    );
                  })}
                </Pressable>
              </Animated.View>
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={onCode}
                onFocus={() => setCodeFocus(true)}
                onBlur={() => setCodeFocus(false)}
                editable={!locked}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={CODE_LEN}
                style={styles.hidden}
                autoFocus
              />

              {codeError ? (
                <Row gap={6} style={{ justifyContent: 'center' }}>
                  <Ionicons name="alert-circle" size={16} color={c.danger} />
                  <Txt v="small" color={c.danger} style={{ fontFamily: F.semi }}>
                    {locked ? "Urinishlar tugadi — yangi kod oling" : `Kod noto'g'ri. Yana ${MAX_ATTEMPTS - attempts} ta urinish qoldi`}
                  </Txt>
                </Row>
              ) : null}

              <View style={styles.resend}>
                {timer > 0 ? (
                  <>
                    <Ionicons name="time-outline" size={16} color={c.muted} />
                    <Txt v="small" muted>Yangi kodni olish mumkin:</Txt>
                    <Txt v="small" style={{ fontFamily: F.bold, fontVariant: ['tabular-nums'] }}>0:{String(timer).padStart(2, '0')}</Txt>
                  </>
                ) : (
                  <Pressable onPress={() => sendCode()} hitSlop={8} style={styles.resendBtn}>
                    <Ionicons name="refresh" size={16} color={c.accent} />
                    <Txt v="small" color={c.accent} style={{ fontFamily: F.bold }}>Kodni qayta yuborish</Txt>
                  </Pressable>
                )}
              </View>

              <View style={[styles.demoSms, { borderColor: c.line }]}>
                <IconTile name="chatbox-ellipses-outline" color={c.accent} size={36} />
                <View style={{ flex: 1 }}>
                  <Txt v="tiny" faint numberOfLines={1}>Demo rejim · {method === 'phone' ? 'SMS' : 'email'} kodi</Txt>
                  <Txt v="h3" style={{ letterSpacing: 2, fontVariant: ['tabular-nums'] }} testID="demo-code">{sent}</Txt>
                </View>
                {!locked && (
                  <Pressable onPress={() => onCode(sent)} hitSlop={8} style={[styles.paste, { backgroundColor: c.surface2 }]}>
                    <Txt v="small" style={{ fontFamily: F.bold }}>Qo'yish</Txt>
                  </Pressable>
                )}
              </View>

              <Row gap={8} style={{ justifyContent: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={15} color={c.ok} />
                <Txt v="tiny" faint>Kodni hech kimga aytmang — YUMS xodimlari uni so'ramaydi</Txt>
              </Row>
            </>
          )}

          {/* ---------- Yangi foydalanuvchi ---------- */}
          {step === 'profile' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">Keling, tanishamiz</Txt>
                <Txt muted>Bu {method === 'phone' ? 'raqam' : 'email'} bilan hali hisob yo'q. Profilingizni to'ldiring — bir daqiqa vaqt oladi</Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([['person', 'Jismoniy shaxs', 'person-outline', 'Tadbirkor, mutaxassis, investor'], ['company', 'Kompaniya', 'business-outline', 'MChJ, AJ, xorijiy kompaniya']] as const).map(([id, l, i, d]) => {
                  const on = kind === id;
                  return (
                    <Pressable key={id} onPress={() => { haptic.tap(); setKind(id); }} style={[styles.kind, { backgroundColor: on ? c.brandSoft : c.surface2, borderColor: on ? c.brand : 'transparent' }]}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Ionicons name={i} size={22} color={c.text} />
                        <View style={[styles.radio, { borderColor: on ? c.brand : c.faint, backgroundColor: on ? c.brand : 'transparent' }]}>
                          {on && <Ionicons name="checkmark" size={12} color={c.brandText} />}
                        </View>
                      </Row>
                      <Txt v="h3">{l}</Txt>
                      <Txt v="tiny" faint>{d}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              {kind === 'company' && <Field label="Kompaniya nomi" value={company} onChangeText={setCompany} placeholder="Masalan: Silk Road Logistics" />}
              <Field label={kind === 'company' ? "Mas'ul shaxs" : 'Ismingiz'} value={name} onChangeText={setName} placeholder="Masalan: Aziz Karimov" autoCapitalize="words" textContentType="name" autoComplete="name" />
              <SelectField label="Mamlakat" value={k.name} left={<Flag code={k.code} size={22} />} placeholder="Mamlakat" onPress={() => setPicker('country')} />
              <View style={[styles.bonus, { backgroundColor: c.brandSoft }]}>
                <IconTile name="gift-outline" color={c.brandDeep} size={44} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">Xush kelibsiz sovg'asi</Txt>
                  <Txt v="small" muted>Birinchi loyiha joylashtirish bepul + YUMS Taxi balansiga 25 000 so'm</Txt>
                </View>
              </View>
              <Button title="Hisob yaratish" icon="arrow-forward" disabled={!profileOk} onPress={finish} />
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
  card: { flex: 1, marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, gap: 16 },
  accList: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, overflow: 'hidden' },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  forget: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 60, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 14 },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefix: { fontSize: 19, fontFamily: F.heavy },
  phoneInput: { flex: 1, minWidth: 0, fontSize: 20, fontFamily: F.bold, letterSpacing: 0.5, height: '100%' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  alt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 16, borderWidth: 1 },
  legal: { textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  demo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center' },
  change: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  otp: { flex: 1, maxWidth: 64, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  caret: { width: 2, height: 26, borderRadius: 1 },
  otpDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.5 },
  otpText: { fontSize: 26, fontFamily: F.display },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 24 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoSms: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  paste: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  kind: { flex: 1, padding: 14, borderRadius: 18, borderWidth: 1.5, gap: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
});
