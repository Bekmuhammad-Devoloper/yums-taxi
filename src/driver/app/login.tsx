// YUMS Driver — kirish. Yo'lovchi ilovasidagi kirish bilan bir xil ko'rinish (qora qahramon blok,
// oltin nur, pastdagi kartochka, katakli SMS kod), faqat haydovchi uchun: raqam +998, ro'yxatdan
// o'tish keyingi ekranda (avtomobil va hujjatlar).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/toast';
import { BrandLogo, BrandMark, Button, Flag, Row, Txt } from '@/components/ui';
import { useDriver } from '@/driver/lib/driver-store';
import { requestOtp, verifyOtp, verifySecondFactor, type SecondStep } from '@/lib/account-api';
import { ApiError, errorText } from '@/lib/api';
import { flipRTL, LTR_STYLE, ltrProps, tr, tx } from '@/lib/i18n';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const GLOW = require('@/assets/images/glow.png');
// Server `otpLength` va urinishlar soni bilan bir xil
const CODE_LEN = 4;
const MAX_ATTEMPTS = 5;
const PHONE_LEN = 9;

const PILLS: { icon: 'time-outline' | 'navigate-outline' | 'headset-outline'; label: string }[] = [
  { icon: 'time-outline', label: tx('Erkin grafik') },
  { icon: 'navigate-outline', label: tx('Navigator') },
  { icon: 'headset-outline', label: tx('24/7 yordam') },
];

const formatPhone = (d: string) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');

type Step = 'phone' | 'code';

export default function Login() {
  const { colors: c, signIn } = useStore();
  const { loadAccount } = useDriver();
  const insets = useSafeAreaInsets();
  // Hammasi bitta ekranga sig'adi; past ekranlarda logotip kichrayadi
  const { height } = useWindowDimensions();
  const short = height < 720;
  // Aylantirish faqat joy yetmaganda (masalan, telefonda klaviatura ochilganda)
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [step, setStep] = useState<Step>('phone');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [second, setSecond] = useState<SecondStep | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [codeError, setCodeError] = useState<'wrong' | 'locked' | null>(null);
  const [timer, setTimer] = useState(0);
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [codeFocus, setCodeFocus] = useState(false);
  const codeRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [blink] = useState(() => new Animated.Value(1));
  const [shake] = useState(() => new Animated.Value(0));

  // Faol katakdagi kursor miltillashi
  useEffect(() => {
    if (step !== 'code') return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(blink, { toValue: 0, duration: 450, delay: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(blink, { toValue: 1, duration: 450, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    a.start();
    return () => a.stop();
  }, [step, blink]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const phoneOk = digits.length === PHONE_LEN;
  const phone = `+998${digits}`;
  const shown = `+998 ${formatPhone(digits)}`;

  const sendCode = async () => {
    if (!phoneOk || busy) return;
    setSecond(null);
    setBusy(true);
    try {
      const { resendInSec } = await requestOtp({ phone });
      setCode(''); setAttemptsLeft(MAX_ATTEMPTS); setCodeError(null); setTimer(resendInSec);
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const doShake = () => Animated.sequence(
    [10, -10, 7, -7, 3, 0].map(v => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: Platform.OS !== 'web' })),
  ).start();

  const codeRejected = (error: unknown) => {
    haptic.error();
    doShake();
    setTimeout(() => setCode(''), 500);
    if (!(error instanceof ApiError) || error.status === 0) { toast(errorText(error), 'alert-circle'); return; }
    if (error.code !== 'OTP_INVALID' && error.code !== 'OTP_EXPIRED' && error.code !== 'OTP_LOCKED') { toast(errorText(error), 'alert-circle'); return; }
    const left = error.code === 'OTP_INVALID' ? Number(error.details?.attemptsLeft ?? 0) : 0;
    setAttemptsLeft(left);
    setCodeError(left > 0 ? 'wrong' : 'locked');
  };

  const checkCode = async (d: string) => {
    setBusy(true);
    try {
      const result = second
        ? { user: await verifySecondFactor(second.challengeId, d) }
        : await verifyOtp({ phone }, d);
      if ('second' in result) {
        // ikki bosqichli himoya: ikkinchi kod boshqa manzilga yuborildi
        haptic.success();
        setSecond(result.second);
        setCode(''); setAttemptsLeft(MAX_ATTEMPTS); setCodeError(null); setTimer(result.second.resendInSec);
        setTimeout(() => codeRef.current?.focus(), 300);
        return;
      }
      haptic.success();
      // Hisob avval yuklanadi: haydovchi bo'lsa ro'yxatdan o'tish sahifasi ko'rinmaydi
      await loadAccount();
      signIn(result.user);
    } catch (error) {
      codeRejected(error);
    } finally {
      setBusy(false);
    }
  };

  const onCode = (v: string) => {
    if (codeError === 'locked' || busy) return;
    const d = v.replace(/\D/g, '').slice(0, CODE_LEN);
    setCode(d);
    if (codeError) setCodeError(null);
    if (d.length === CODE_LEN) checkCode(d).catch(() => {});
  };

  const locked = codeError === 'locked';
  const big = step === 'phone';

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
        <LinearGradient colors={['#000000', '#0B0904', '#16120A']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[big ? styles.hero : styles.heroCompact, { paddingTop: insets.top + 12 }]}>
          <Image source={GLOW} pointerEvents="none" style={[styles.glow, { top: insets.top - (big ? 70 : 250) }]} contentFit="contain" />
          {step === 'code' && (
            <Pressable onPress={() => setStep('phone')} style={[styles.back, { top: insets.top + 12 }]} hitSlop={10} accessibilityLabel={tr('Orqaga')}>
              <Ionicons name="chevron-back" size={21} color="#fff" style={flipRTL()} />
            </Pressable>
          )}
          {big ? (
            <>
              <BrandLogo width={short ? 92 : 118} style={{ alignSelf: 'center', marginTop: short ? 0 : 6 }} />
              <View style={styles.driverTag}><Ionicons name="car-sport" size={13} color="#0E1525" /><Text style={styles.driverTagText}>DRIVER</Text></View>
              <Text style={styles.tagTitle}>{tr('Haydovchilar uchun YUMS')}</Text>
              {!short && <Text style={styles.tagSub}>{tr("Buyurtmalar YUMS ilovasidagi yo'lovchilardan to'g'ridan-to'g'ri keladi")}</Text>}
              <View style={styles.pills}>
                {PILLS.map(x => (
                  <View key={x.label} style={styles.pill}>
                    <Ionicons name={x.icon} size={13} color="#F5C542" />
                    <Text style={styles.pillText} numberOfLines={1}>{tr(x.label)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.compactBrand}>
              <BrandMark size={30} style={{ borderRadius: 15 }} />
              <Text style={styles.compactName}>YUMS DRIVER</Text>
            </View>
          )}
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: c.surface, paddingBottom: insets.bottom + 24 }]}>
          {/* ---------- Telefon raqami ---------- */}
          {step === 'phone' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">{tr('Telefon raqamingiz')}</Txt>
                <Txt muted>{tr("Kirish yoki ro'yxatdan o'tish uchun SMS orqali kod yuboramiz")}</Txt>
              </View>
              <View style={[styles.phone, { backgroundColor: phoneFocus ? c.surface : c.surface2, borderColor: phoneFocus ? c.brand : c.line }]}>
                <View style={styles.cc}>
                  <Flag code="UZ" size={26} />
                  <Text style={[styles.prefix, { color: c.text }]}>+998</Text>
                </View>
                <TextInput
                  value={formatPhone(digits)}
                  onChangeText={v => setDigits(v.replace(/\D/g, '').replace(/^998(?=\d{9})/, '').slice(0, PHONE_LEN))}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  onFocus={() => setPhoneFocus(true)}
                  onBlur={() => setPhoneFocus(false)}
                  onSubmitEditing={() => { sendCode().catch(() => {}); }}
                  placeholder="90 123 45 67"
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
              <Button title={tr('Davom etish')} disabled={!phoneOk} loading={busy} onPress={() => { sendCode().catch(() => {}); }} />
              <View style={[styles.note, { backgroundColor: c.surface2 }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={c.muted} />
                <Txt v="small" muted style={{ flex: 1, lineHeight: 18 }}>
                  {tr("Yangi haydovchi? Keyingi qadamda avtomobil va hujjatlarni qo'shasiz.")}
                </Txt>
              </View>
              <Txt v="tiny" faint style={[styles.legal, { marginTop: 'auto' }]}>{tr('Davom etib, foydalanish shartlariga rozilik bildirasiz')}</Txt>
            </>
          )}

          {/* ---------- SMS kod ---------- */}
          {step === 'code' && (
            <>
              <View style={styles.codeHead}>
                <View style={[styles.codeIcon, { backgroundColor: c.brandSoft }]}>
                  <Ionicons name={second ? 'shield-checkmark-outline' : 'chatbubble-ellipses-outline'} size={28} color={c.brandDeep} />
                </View>
                <Txt v="h1" style={{ textAlign: 'center' }}>{second ? tr('Ikkinchi kodni kiriting') : tr('SMS kodni kiriting')}</Txt>
                <Txt muted style={{ textAlign: 'center' }}>{second ? tr('Ikki bosqichli himoya yoqilgan: kod boshqa manzilingizga yuborildi') : tr('{CODE_LEN} xonali kod yuborildi', { CODE_LEN })}</Txt>
                <Txt v="h3" style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}>{second ? second.destination : shown}</Txt>
                <Pressable onPress={() => setStep('phone')} hitSlop={8}>
                  <Txt v="small" color={c.accent} style={{ fontFamily: F.semi }}>{tr("Raqamni o'zgartirish")}</Txt>
                </Pressable>
              </View>

              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <Pressable onPress={() => codeRef.current?.focus()} style={[styles.otpRow, LTR_STYLE]} {...ltrProps} accessibilityLabel={tr('Tasdiqlash kodi')}>
                  {Array.from({ length: CODE_LEN }, (_, i) => {
                    const filled = i < code.length;
                    const active = !locked && codeFocus && i === Math.min(code.length, CODE_LEN - 1) && !(filled && code.length === CODE_LEN);
                    return (
                      <View key={i} style={[styles.otp, {
                        backgroundColor: active ? c.surface : c.surface2,
                        borderColor: codeError ? c.danger : active ? c.brand : filled ? c.surface3 : 'transparent',
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

              <View style={styles.status}>
                {codeError ? (
                  <Row gap={6} style={{ justifyContent: 'center' }}>
                    <Ionicons name="alert-circle" size={16} color={c.danger} />
                    <Txt v="small" color={c.danger} style={{ fontFamily: F.semi }}>
                      {locked ? tr('Urinishlar tugadi — yangi kod oling') : tr("Kod noto'g'ri. Yana {MAX_ATTEMPTS} ta urinish qoldi", { MAX_ATTEMPTS: attemptsLeft })}
                    </Txt>
                  </Row>
                ) : null}
                {busy ? (
                  <Txt v="small" muted style={{ textAlign: 'center' }}>{tr('Tekshirilmoqda…')}</Txt>
                ) : timer > 0 ? (
                  <Txt v="small" muted style={{ textAlign: 'center' }}>
                    {tr('Yangi kodni {time} dan keyin olish mumkin', { time: `0:${String(timer).padStart(2, '0')}` })}
                  </Txt>
                ) : (
                  <Pressable onPress={() => { sendCode().catch(() => {}); }} hitSlop={8} style={styles.resendBtn}>
                    <Ionicons name="refresh" size={16} color={c.accent} />
                    <Txt v="small" color={c.accent} style={{ fontFamily: F.bold }}>{tr('Kodni qayta yuborish')}</Txt>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 44, overflow: 'hidden' },
  heroCompact: { paddingHorizontal: 24, paddingBottom: 40, overflow: 'hidden' },
  glow: { position: 'absolute', alignSelf: 'center', width: 420, height: 420 },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  driverTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginTop: 8, paddingHorizontal: 12, height: 24, borderRadius: 12, backgroundColor: '#FFC800' },
  driverTagText: { color: '#0E1525', fontSize: 11.5, fontFamily: F.heavy, letterSpacing: 2 },
  tagTitle: { fontSize: 17, fontFamily: F.semi, color: '#fff', textAlign: 'center', letterSpacing: -0.3, marginTop: 10 },
  tagSub: { fontSize: 13.5, fontFamily: F.medium, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 4, lineHeight: 19 },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 8, borderRadius: 15, flexShrink: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  pillText: { color: 'rgba(255,255,255,0.88)', fontSize: 11.5, fontFamily: F.semi, flexShrink: 1 },
  compactBrand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42 },
  compactName: { color: '#fff', fontFamily: F.brand, fontSize: 16, letterSpacing: 1.5 },
  card: { flex: 1, marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, gap: 14 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 60, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 14 },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefix: { fontSize: 19, fontFamily: F.heavy },
  phoneInput: { flex: 1, minWidth: 0, fontSize: 20, fontFamily: F.bold, letterSpacing: 0.5, height: '100%' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  legal: { textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  codeHead: { alignItems: 'center', gap: 6, paddingTop: 4 },
  codeIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  // kod raqamlari har doim chapdan o'ngga (arab tilida ham)
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  otp: { flex: 1, maxWidth: 64, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  caret: { width: 2, height: 26, borderRadius: 1 },
  otpDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.5 },
  otpText: { fontSize: 26, fontFamily: F.display },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  status: { alignItems: 'center', gap: 8, minHeight: 24 },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
