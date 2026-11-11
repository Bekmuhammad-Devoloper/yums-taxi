import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo, PickerSheet, SelectField } from '@/components/platform-ui';
import { OtpStep } from '@/components/otp-step';
import { openTelegram, SmsButton, TelegramButton } from '@/components/telegram-otp';
import { toast } from '@/components/toast';
import { Avatar, BrandLogo, BrandMark, DEFAULT_AVATAR, Button, Field, Flag, IconTile, Row, Txt } from '@/components/ui';
import { type OtpContact, requestOtp, saveProfile, type SecondStep, verifyOtp, verifySecondFactor } from '@/lib/account-api';
import { ApiError, errorText } from '@/lib/api';
import { som } from '@/lib/geo';
import { COUNTRIES } from '@/lib/platform-data';
import { countryOf } from '@/lib/platform';
import { checkPinfl, checkStir, companyMatches, directorMatches, lookupCompany, type LookupResult } from '@/lib/registry';
import { haptic, useStore, type AccountKind, type User } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, tx, flipRTL } from '@/lib/i18n';

const GLOW = require('@/assets/images/glow.png');
// Kod uzunligi serverdan (`otpLength`); sozlamalar hali kelmagan bo'lsa — 5
const DEFAULT_CODE_LEN = 5;
const MAX_ATTEMPTS = 5;

const PILLS: { icon: 'rocket-outline' | 'trending-up-outline' | 'car-sport-outline'; label: string }[] = [
  { icon: 'rocket-outline', label: tx('Loyihalar') },
  { icon: 'trending-up-outline', label: tx('Investorlar') },
  { icon: 'car-sport-outline', label: tx('Taksi') },
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


type Step = 'accounts' | 'contact' | 'code' | 'profile';

/**
 * Kirish — Yandex Go uslubida yagona oqim:
 * raqam (yoki email) → SMS kod → hisob bo'lsa darhol ichkariga, yangi bo'lsa «Keling, tanishamiz».
 * Qurilmada avval kirilgan hisoblar «Hisobni tanlang» ro'yxatida chiqadi.
 */
export default function Login() {
  const { colors: c, signIn, savedAccounts, forgetAccount, settings } = useStore();
  const bonus = settings?.signupBonus ?? 0;
  const CODE_LEN = settings?.otpLength ?? DEFAULT_CODE_LEN;
  const insets = useSafeAreaInsets();
  // Hammasi bitta ekranga sig'adi; past ekranlarda logotip kichrayadi
  const { height } = useWindowDimensions();
  const short = height < 860;
  // Kirish ekranida bo'sh joy tepadagi rasmga beriladi: logotip ekran balandligiga qarab kattalashadi
  const logoW = height >= 900 ? 188 : height >= 790 ? 168 : height >= 710 ? 140 : 96;
  const roomy = height >= 780;
  // Aylantirish faqat joy yetmaganda (klaviatura ochilganda yoki uzun profil formasida)
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [step, setStep] = useState<Step>(() => (savedAccounts.length ? 'accounts' : 'contact'));
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [cc, setCc] = useState(CODES[0]);
  const [digits, setDigits] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const contactRef = useRef<OtpContact>({ phone: '' });
  const newUserRef = useRef<User | null>(null);
  // Ikki bosqichli himoya: birinchi kod to'g'ri, ikkinchisi boshqa manzilga yuborildi
  const [second, setSecond] = useState<SecondStep | null>(null);
  const [codeError, setCodeError] = useState<'wrong' | 'locked' | null>(null);
  const [kind, setKind] = useState<AccountKind>('person');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('UZ');
  const [pinfl, setPinfl] = useState('');
  const [stir, setStir] = useState('');
  const [lookup, setLookup] = useState<{ state: 'idle' | 'loading' } | { state: 'done'; result: LookupResult }>({ state: 'idle' });
  const lookupReq = useRef(0);
  const [timer, setTimer] = useState(0);
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [picker, setPicker] = useState<'cc' | 'country' | null>(null);
  const codeRef = useRef<ComponentRef<typeof TextInput>>(null);
  // Kod bosqichi: xatolar soni (silkinish), taymer davomiyligi, to'g'ri kod (yashil)
  const [rejections, setRejections] = useState(0);
  const [resendSec, setResendSec] = useState(59);
  const [success, setSuccess] = useState(false);
  // Kod qayerga ketdi: SMS yoki Telegram. Raqam botga ulanmagan bo'lsa — bot havolasi
  const telegramOn = !!settings?.telegramLogin;
  const [via, setVia] = useState<'SMS' | 'TELEGRAM'>('SMS');
  const [tgLink, setTgLink] = useState<string | null>(null);
  const [sending, setSending] = useState<'SMS' | 'TELEGRAM' | null>(null);

  // Telegram'dan qaytganda kod kataklari darhol tayyor
  useEffect(() => {
    if (step !== 'code') return;
    const sub = AppState.addEventListener('change', s => { if (s === 'active') setTimeout(() => codeRef.current?.focus(), 250); });
    return () => sub.remove();
  }, [step]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const phoneOk = digits.length >= Math.min(cc.len, 9) && digits.length <= cc.len;
  const emailOk = /^\S+@\S+\.\S{2,}$/.test(email.trim());
  const contactOk = method === 'phone' ? phoneOk : emailOk;
  const target = method === 'phone' ? `${cc.code} ${formatPhone(digits, cc.code)}` : email.trim();
  const typedContact = (): OtpContact => (method === 'phone' ? { phone: target.replace(/\s/g, '') } : { email: target });

  const sendCode = async (contact: OtpContact = typedContact(), channel: 'SMS' | 'TELEGRAM' = 'SMS') => {
    const telegram = channel === 'TELEGRAM' && 'phone' in contact;
    contactRef.current = contact;
    setSecond(null);
    setBusy(true);
    setSending(telegram ? 'TELEGRAM' : 'SMS');
    try {
      const sent = await requestOtp(contact, telegram ? 'TELEGRAM' : undefined);
      setVia(sent.channel === 'TELEGRAM' ? 'TELEGRAM' : 'SMS');
      setTgLink(sent.telegramLink ?? null);
      setCode(''); setAttemptsLeft(MAX_ATTEMPTS); setCodeError(null); setSuccess(false);
      setTimer(sent.resendInSec); setResendSec(sent.resendInSec);
      setStep('code');
      // Raqam botga ulanmagan: telefonda Telegram darhol ochiladi (brauzerda — tugma orqali)
      if (sent.telegramLink && Platform.OS !== 'web') openTelegram(sent.telegramLink);
      else setTimeout(() => codeRef.current?.focus(), 300);
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
      setSending(null);
    }
  };

  const chooseAccount = (a: User) => {
    haptic.tap();
    const parsed = a.phone ? parsePhone(a.phone) : null;
    // Telegram yoqilgan bo'lsa raqam to'ldiriladi va kod qayerga kelishini o'zi tanlaydi
    if (parsed && telegramOn) { setMethod('phone'); setCc(parsed.cc); setDigits(parsed.digits); setStep('contact'); return; }
    if (parsed) { setMethod('phone'); setCc(parsed.cc); setDigits(parsed.digits); sendCode({ phone: a.phone }); return; }
    if (a.email) { setMethod('email'); setEmail(a.email); sendCode({ email: a.email }); }
  };

  const onCode = (v: string) => {
    if (codeError === 'locked' || busy) return;
    const d = v.replace(/\D/g, '').slice(0, CODE_LEN);
    setCode(d);
    if (codeError) setCodeError(null);
    if (d.length === CODE_LEN) checkCode(d);
  };

  // To'g'ri kod: kataklar bir lahza yashil bo'ladi, keyin keyingi qadam
  const accepted = async () => {
    haptic.success();
    setSuccess(true);
    await new Promise(r => setTimeout(r, 420));
  };

  // Kod to'g'ri: hisob bo'lsa — darhol ichkariga, yangi hisob bo'lsa — avval profil
  const checkCode = async (d: string) => {
    setBusy(true);
    try {
      if (second) {
        const user = await verifySecondFactor(second.challengeId, d);
        await accepted();
        signIn(user);
        toast(tr('Xush kelibsiz, {name}!', { name: user.name.split(' ')[0] }), 'hand-right');
        router.replace('/');
        return;
      }
      const result = await verifyOtp(contactRef.current, d);
      if ('second' in result) {
        haptic.success();
        setSecond(result.second);
        setCode(''); setAttemptsLeft(MAX_ATTEMPTS); setCodeError(null);
        setTimer(result.second.resendInSec); setResendSec(result.second.resendInSec);
        setTimeout(() => codeRef.current?.focus(), 300);
        return;
      }
      const { user, isNewUser } = result;
      await accepted();
      if (isNewUser) { newUserRef.current = user; setStep('profile'); return; }
      signIn(user);
      toast(tr('Xush kelibsiz, {name}!', { name: user.name.split(' ')[0] }), 'hand-right');
      router.replace('/');
    } catch (error) {
      codeRejected(error);
    } finally {
      setBusy(false);
    }
  };

  const codeRejected = (error: unknown) => {
    haptic.error();
    setRejections(n => n + 1);
    setTimeout(() => setCode(''), 500);
    if (!(error instanceof ApiError) || error.status === 0) { toast(errorText(error), 'alert-circle'); return; }
    const left = error.code === 'OTP_INVALID' ? Number(error.details?.attemptsLeft ?? 0) : 0;
    setAttemptsLeft(left);
    setCodeError(left > 0 ? 'wrong' : 'locked');
  };

  // STIR va mas'ul shaxs JShShIRi faqat O'zbekistondagi kompaniyadan so'raladi (reyestr bilan solishtiriladi).
  // Jismoniy shaxs ro'yxatdan o'tishda JShShIR kiritmaydi.
  const local = country === 'UZ';
  const needPinfl = local && kind === 'company';
  const pin = checkPinfl(pinfl);
  const pinOk = !needPinfl || !pin.error;
  const stirErr = stir.length === 9 ? checkStir(stir) : null;
  const rec = lookup.state === 'done' && lookup.result.ok ? lookup.result.record : null;
  const active = !!rec && rec.status === 'active';
  const nameOk = !!rec && companyMatches(company, rec);
  const dirOk = !!rec && directorMatches(name, rec);
  const companyOk = kind === 'person' || (local ? active && nameOk && dirOk : company.trim().length > 1);
  const profileOk = name.trim().length > 1 && pinOk && companyOk;

  const onStir = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 9);
    setStir(d);
    const req = ++lookupReq.current;
    if (d.length < 9 || checkStir(d)) { setLookup({ state: 'idle' }); return; }
    setLookup({ state: 'loading' });
    lookupCompany(d).then(result => { if (req === lookupReq.current) setLookup({ state: 'done', result }); });
  };

  const finish = async () => {
    setBusy(true);
    try {
      const user = await saveProfile({
        fullName: name.trim(), kind, company: kind === 'company' ? company.trim() : undefined, country,
        pinfl: needPinfl ? pinfl : undefined, stir: kind === 'company' && local ? stir : undefined,
      });
      signIn(user);
      router.replace('/');
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    if (step === 'contact') setStep('accounts');
    else setStep('contact');
  };
  const canBack = step === 'code' || step === 'profile' || (step === 'contact' && savedAccounts.length > 0);
  const big = step === 'accounts' || step === 'contact';
  const k = countryOf(country);
  // Telegram ↔ SMS almashish (ikkinchi bosqich har doim o'z kanalida)
  const canSwitch = telegramOn && !second && method === 'phone';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        scrollEnabled={contentH > viewH + 1}
        onLayout={e => setViewH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentH(h)}>
        <LinearGradient colors={['#000000', '#0B0904', '#16120A']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[big ? styles.hero : styles.heroCompact, big && styles.heroFill, big && short && { paddingBottom: 42 }, { paddingTop: insets.top + 12 }]}>
          <Image source={GLOW} pointerEvents="none" style={[styles.glow, { top: insets.top - (big ? 70 : 250) }]} contentFit="contain" />
          {canBack && (
            <Pressable onPress={back} style={[styles.back, { top: insets.top + 12 }]} hitSlop={10} accessibilityLabel={tr('Orqaga')}>
              <Ionicons name="chevron-back" size={21} color="#fff" style={flipRTL()} />
            </Pressable>
          )}
          {big ? (
            <>
              <BrandLogo width={logoW} style={{ alignSelf: 'center', marginTop: roomy ? 12 : 4 }} />
              <Text style={[styles.tagTitle, short && { marginTop: 10 }]}>{tr('Xalqaro raqamli loyihalar platformasi')}</Text>
              {roomy && <Text style={styles.tagSub}>{tr('Loyihalar, hamkorlar va investorlar — bir joyda')}</Text>}
              <View style={[styles.pills, short && { marginTop: 14 }]}>
                {PILLS.map(x => (
                  <View key={x.label} style={styles.pill}>
                    <Ionicons name={x.icon} size={14} color="#F5C542" />
                    <Text style={styles.pillText}>{tr(x.label)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.compactBrand}>
              <BrandMark size={30} style={{ borderRadius: 15 }} />
              <Text style={styles.compactName}>YUMS</Text>
            </View>
          )}
        </LinearGradient>

        <View style={[styles.card, big && styles.cardFit, short && { padding: 22, gap: 14 }, { backgroundColor: c.surface, paddingBottom: insets.bottom + (short ? 18 : 24) }]}>
          {/* ---------- Hisobni tanlash ---------- */}
          {step === 'accounts' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">{tr('Hisobni tanlang')}</Txt>
                <Txt muted>{tr('Shu qurilmada avval kirgan hisoblaringiz')}</Txt>
              </View>
              <View style={[styles.accList, { borderColor: c.line }]}>
                {savedAccounts.map((a, i) => {
                  const title = a.kind === 'company' && a.company ? a.company : a.name;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => chooseAccount(a)}
                      style={({ pressed }) => [styles.accRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
                      {a.avatar ? <Avatar name={a.name} size={44} uri={a.avatar} /> : a.kind === 'company' && a.company ? <Logo name={a.company} color={c.ok} size={44} /> : <Avatar name={a.name} size={44} fallback={DEFAULT_AVATAR} />}
                      <View style={{ flex: 1 }}>
                        <Txt v="h3" numberOfLines={1}>{title}</Txt>
                        <Txt v="small" muted numberOfLines={1}>{a.phone ? maskPhone(a.phone) : maskEmail(a.email ?? '')}</Txt>
                      </View>
                      <Pressable
                        onPress={() => { haptic.tap(); if (a.id) forgetAccount(a.id); if (savedAccounts.length === 1) setStep('contact'); }}
                        hitSlop={10}
                        style={[styles.forget, { backgroundColor: c.surface2 }]}
                        accessibilityLabel={tr("{title} — ro'yxatdan olib tashlash", { title })}>
                        <Ionicons name="close" size={15} color={c.muted} />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
              <Button title={tr('Boshqa hisob bilan kirish')} kind="ghost" icon="person-add-outline" onPress={() => { setDigits(''); setEmail(''); setStep('contact'); }} />
            </>
          )}

          {/* ---------- Telefon yoki email ---------- */}
          {step === 'contact' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">{method === 'phone' ? tr('Telefon raqamingiz') : tr('Email manzilingiz')}</Txt>
                <Txt muted>{method === 'email' ? tr("Kirish yoki ro'yxatdan o'tish uchun emailga kod yuboramiz") : telegramOn ? tr("Kirish yoki ro'yxatdan o'tish uchun kodni Telegram yoki SMS orqali yuboramiz") : tr("Kirish yoki ro'yxatdan o'tish uchun SMS orqali kod yuboramiz")}</Txt>
              </View>
              {method === 'phone' ? (
                <View style={[styles.phone, { backgroundColor: phoneFocus ? c.surface : c.surface2, borderColor: phoneFocus ? c.brand : c.line }]}>
                  <Pressable onPress={() => setPicker('cc')} style={styles.cc} hitSlop={6} accessibilityLabel={tr('Mamlakat kodi')}>
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
                    <Pressable onPress={() => setDigits('')} hitSlop={10} accessibilityLabel={tr('Tozalash')}>
                      <Ionicons name="close-circle" size={20} color={c.faint} />
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Field
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={() => contactOk && sendCode()}
                  placeholder={tr('name@company.com')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  inputStyle={{ fontSize: 18, minHeight: 58 }}
                />
              )}
              {method === 'phone' && telegramOn ? (
                <View style={{ gap: 10 }}>
                  <TelegramButton title={tr('Telegram orqali')} disabled={!contactOk || busy} loading={sending === 'TELEGRAM'} onPress={() => sendCode(typedContact(), 'TELEGRAM')} />
                  <SmsButton title={tr('SMS orqali')} disabled={!contactOk || busy} loading={sending === 'SMS'} onPress={() => sendCode(typedContact(), 'SMS')} />
                </View>
              ) : (
                <Button title={tr('Davom etish')} disabled={!contactOk} loading={busy} onPress={() => sendCode()} />
              )}

              <View style={styles.or}>
                <View style={[styles.orLine, { backgroundColor: c.line }]} />
                <Txt v="tiny" faint>{tr('yoki')}</Txt>
                <View style={[styles.orLine, { backgroundColor: c.line }]} />
              </View>
              <Pressable
                onPress={() => { haptic.tap(); setMethod(method === 'phone' ? 'email' : 'phone'); }}
                style={({ pressed }) => [styles.alt, { borderColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
                <Ionicons name={method === 'phone' ? 'mail-outline' : 'call-outline'} size={18} color={c.text} />
                <Txt style={{ fontFamily: F.semi }}>{method === 'phone' ? tr('Email orqali kirish') : tr('Telefon orqali kirish')}</Txt>
              </Pressable>

              <Txt v="tiny" faint style={styles.legal}>
                {method === 'phone' && telegramOn ? tr('Davom etib, siz') : tr('«Davom etish»ni bosib, siz')}{' '}
                <Txt v="tiny" color={c.accent} onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}>{tr('Foydalanish shartlari')}</Txt>{' '}{tr('va')}{' '}
                <Txt v="tiny" color={c.accent} onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}>{tr('Maxfiylik siyosati')}</Txt>{tr('ga rozilik bildirasiz')}
              </Txt>

            </>
          )}

          {/* ---------- Kod ---------- */}
          {step === 'code' && (
            <OtpStep
              channel={second ? 'SECOND' : via === 'TELEGRAM' ? 'TELEGRAM' : method === 'email' ? 'EMAIL' : 'SMS'}
              destination={second ? second.destination : target}
              onEdit={() => setStep('contact')}
              codeLen={CODE_LEN}
              code={code}
              onCode={onCode}
              inputRef={codeRef}
              error={codeError}
              attemptsLeft={attemptsLeft}
              rejections={rejections}
              busy={busy}
              success={success}
              timer={timer}
              resendSec={resendSec}
              onResend={() => sendCode(contactRef.current, via)}
              switchTo={canSwitch ? { channel: via === 'TELEGRAM' ? 'SMS' : 'TELEGRAM', onPress: () => sendCode(contactRef.current, via === 'TELEGRAM' ? 'SMS' : 'TELEGRAM') } : null}
              tgLink={tgLink}
              supportPhone={settings?.supportPhone}
            />
          )}

          {/* ---------- Yangi foydalanuvchi ---------- */}
          {step === 'profile' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">{tr('Keling, tanishamiz')}</Txt>
                <Txt muted>{method === 'phone' ? tr("Bu raqam bilan hali hisob yo'q. Profilingizni to'ldiring — bir daqiqa vaqt oladi") : tr("Bu email bilan hali hisob yo'q. Profilingizni to'ldiring — bir daqiqa vaqt oladi")}</Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([['person', tx('Jismoniy shaxs'), 'person-outline', tx('Tadbirkor, mutaxassis, investor')], ['company', tx('Kompaniya'), 'business-outline', tx('MChJ, AJ, xorijiy kompaniya')]] as const).map(([id, l, i, d]) => {
                  const on = kind === id;
                  return (
                    <Pressable key={id} onPress={() => { haptic.tap(); setKind(id); }} style={[styles.kind, { backgroundColor: on ? c.brandSoft : c.surface2, borderColor: on ? c.brand : 'transparent' }]}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Ionicons name={i} size={22} color={c.text} />
                        <View style={[styles.radio, { borderColor: on ? c.brand : c.faint, backgroundColor: on ? c.brand : 'transparent' }]}>
                          {on && <Ionicons name="checkmark" size={12} color={c.brandText} />}
                        </View>
                      </Row>
                      <Txt v="h3">{tr(l)}</Txt>
                      <Txt v="tiny" faint>{tr(d)}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              <SelectField label={tr('Mamlakat')} value={k.name} left={<Flag code={k.code} size={22} />} placeholder={tr('Mamlakat')} onPress={() => setPicker('country')} />

              {kind === 'company' && local && (
                <>
                  <Field
                    label={tr('Kompaniya STIRi')}
                    value={stir}
                    onChangeText={onStir}
                    placeholder={tr('9 xonali raqam')}
                    keyboardType="number-pad"
                    maxLength={9}
                    error={stirErr ?? undefined}
                    hint={tr('Davlat reyestridan avtomatik tekshiriladi')}
                  />
                  {lookup.state === 'loading' && (
                    <Row gap={10} style={[styles.reg, { backgroundColor: c.surface2 }]}>
                      <ActivityIndicator color={c.muted} />
                      <Txt v="small" muted>{tr('Reyestrdan tekshirilmoqda…')}</Txt>
                    </Row>
                  )}
                  {lookup.state === 'done' && (lookup.result.ok ? (
                    <View style={[styles.reg, { backgroundColor: active ? c.okSoft : c.dangerSoft }]}>
                      <Row gap={8}>
                        <Ionicons name={active ? 'checkmark-circle' : 'close-circle'} size={18} color={active ? c.ok : c.danger} />
                        <Txt v="small" color={active ? c.ok : c.danger} style={{ fontFamily: F.bold }}>
                          {active ? tr('Reyestrda topildi') : tr('Kompaniya faoliyati tugatilgan')}
                        </Txt>
                      </Row>
                      <Txt v="h3">{lookup.result.record.name}</Txt>
                      <Txt v="small" muted>{tr('Rahbar: {director}', { director: lookup.result.record.director })}</Txt>
                    </View>
                  ) : (
                    <Row gap={8} style={[styles.reg, { backgroundColor: c.dangerSoft }]}>
                      <Ionicons name={lookup.result.reason === 'network' ? 'cloud-offline-outline' : 'search-outline'} size={18} color={c.danger} />
                      <Txt v="small" color={c.danger} style={{ flex: 1, fontFamily: F.semi }}>
                        {lookup.result.reason === 'network' ? tr("Reyestr bilan bog'lanib bo'lmadi — keyinroq urinib ko'ring") : tr('Bu STIR reyestrda topilmadi')}
                      </Txt>
                      {lookup.result.reason === 'network' && (
                        <Pressable onPress={() => onStir(stir)} hitSlop={8}><Txt v="small" color={c.accent} style={{ fontFamily: F.bold }}>{tr('Qayta')}</Txt></Pressable>
                      )}
                    </Row>
                  ))}
                </>
              )}

              {kind === 'company' && (
                <View style={{ gap: 6 }}>
                  <Field label={tr('Kompaniya nomi')} value={company} onChangeText={setCompany} placeholder={tr('Masalan: «Agro Invest» MChJ')} />
                  {rec && company.trim().length > 1 && (
                    <Match ok={nameOk} yes={tr('Reyestrdagi nom bilan mos')} no={tr('Reyestrda: {name}', { name: rec.name })} />
                  )}
                </View>
              )}
              <View style={{ gap: 6 }}>
                <Field
                  label={kind === 'company' ? tr("Mas'ul shaxs (rahbar) F.I.Sh.") : tr('Ism familiya')}
                  value={name}
                  onChangeText={setName}
                  placeholder={tr('Masalan: Karimov Aziz')}
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                />
                {kind === 'company' && rec && name.trim().split(/\s+/).length >= 2 && (
                  <Match ok={dirOk} yes={tr('Kompaniya rahbari bilan mos')} no={tr("Mas'ul shaxs reyestrdagi rahbar bilan mos kelmadi")} />
                )}
              </View>
              {needPinfl && (
                <Field
                  label={tr("Mas'ul shaxsning JShShIRi")}
                  value={pinfl}
                  onChangeText={v => setPinfl(v.replace(/\D/g, '').slice(0, 14))}
                  placeholder={tr('14 xonali shaxsiy raqam')}
                  keyboardType="number-pad"
                  maxLength={14}
                  error={pinfl.length === 14 ? pin.error ?? undefined : undefined}
                  hint={pinfl.length === 14 && !pin.error && pin.birth ? tr("Tug'ilgan sana: {date}", { date: `${String(pin.birth.getDate()).padStart(2, '0')}.${String(pin.birth.getMonth() + 1).padStart(2, '0')}.${pin.birth.getFullYear()}` }) : tr('Pasport yoki ID kartadagi 14 xonali raqam')}
                />
              )}
              {!local && kind === 'company' && (
                <Row gap={8} style={[styles.reg, { backgroundColor: c.surface2 }]}>
                  <Ionicons name="document-text-outline" size={18} color={c.muted} />
                  <Txt v="small" muted style={{ flex: 1 }}>{tr("Xorijiy kompaniyalar ro'yxatdan o'tgach hujjatlar orqali tasdiqlanadi (Kabinet → Profilni tasdiqlash)")}</Txt>
                </Row>
              )}
              <View style={[styles.bonus, { backgroundColor: c.brandSoft }]}>
                <IconTile name="gift-outline" color={c.brandDeep} size={44} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">{tr("Xush kelibsiz sovg'asi")}</Txt>
                  <Txt v="small" muted>{bonus > 0 ? tr('Birinchi loyiha joylashtirish bepul + YUMS Taxi balansiga {sum}', { sum: som(bonus) }) : tr('Birinchi loyiha joylashtirish bepul')}</Txt>
                </View>
              </View>
              <Button title={tr('Hisob yaratish')} icon="arrow-forward" disabled={!profileOk} loading={busy} onPress={finish} />
            </>
          )}
        </View>
      </ScrollView>

      <PickerSheet visible={picker === 'cc'} onClose={() => setPicker(null)} title={tr('Mamlakat kodi')} selected={[cc.code]}
        onChange={ids => { const n = CODES.find(x => x.code === ids[0]); if (n) { setCc(n); setCountry(n.country); setDigits(d => d.slice(0, n.len)); } }}
        options={CODES.map(x => ({ id: x.code, label: `${countryOf(x.country).name} (${x.code})`, flag: x.country }))} />
      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title={tr('Mamlakat')} selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, flag: x.code, sub: x.region }))} />
    </KeyboardAvoidingView>
  );
}

/** Reyestr bilan moslik belgisi */
function Match({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  const { colors: c } = useStore();
  return (
    <Row gap={6} style={{ paddingHorizontal: 2 }}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={15} color={ok ? c.ok : c.danger} />
      <Txt v="tiny" color={ok ? c.ok : c.danger} style={{ flex: 1 }}>{ok ? yes : no}</Txt>
    </Row>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 52, overflow: 'hidden' },
  // kirish ekranida rasm qolgan joyni egallaydi, kartochka esa o'z mazmunicha
  heroFill: { flexGrow: 1, justifyContent: 'center' },
  cardFit: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  glow: { position: 'absolute', alignSelf: 'center', width: 420, height: 420 },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  tagTitle: { fontSize: 17, fontFamily: F.semi, color: '#fff', textAlign: 'center', letterSpacing: -0.3, marginTop: 14 },
  tagSub: { fontSize: 13.5, fontFamily: F.medium, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 4 },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  pillText: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, fontFamily: F.semi },
  heroCompact: { paddingHorizontal: 24, paddingBottom: 40, overflow: 'hidden' },
  compactBrand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42 },
  compactName: { color: '#fff', fontFamily: F.brand, fontSize: 16, letterSpacing: 1.5 },
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
  kind: { flex: 1, padding: 14, borderRadius: 18, borderWidth: 1.5, gap: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  reg: { padding: 12, borderRadius: 14, gap: 4 },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
});
