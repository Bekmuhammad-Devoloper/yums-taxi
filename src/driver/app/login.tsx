// YUMS Driver — kirish. Yo'lovchi ilovasidagi kirish bilan bir xil ko'rinish (qora qahramon blok,
// oltin nur, pastdagi kartochka, katakli SMS kod), faqat haydovchi uchun: raqam +998, ro'yxatdan
// o'tish keyingi ekranda (avtomobil va hujjatlar).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OtpStep } from '@/components/otp-step';
import { openTelegram, SmsButton, TelegramButton } from '@/components/telegram-otp';
import { toast } from '@/components/toast';
import { BrandLogo, BrandMark, Button, Flag, Txt } from '@/components/ui';
import { useDriver } from '@/driver/lib/driver-store';
import { requestOtp, verifyOtp, verifySecondFactor, type SecondStep } from '@/lib/account-api';
import { ApiError, errorText } from '@/lib/api';
import { flipRTL, tr, tx } from '@/lib/i18n';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const GLOW = require('@/assets/images/glow.png');
// Kod uzunligi serverdan (`otpLength`); sozlamalar hali kelmagan bo'lsa — 5
const DEFAULT_CODE_LEN = 5;
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
  const { colors: c, signIn, settings } = useStore();
  const CODE_LEN = settings?.otpLength ?? DEFAULT_CODE_LEN;
  const { loadAccount } = useDriver();
  const insets = useSafeAreaInsets();
  // Hammasi bitta ekranga sig'adi; past ekranlarda logotip kichrayadi
  const { height } = useWindowDimensions();
  const short = height < 720;
  // Kirish ekranida bo'sh joy tepadagi rasmga beriladi: logotip ekran balandligiga qarab kattalashadi
  const logoW = height >= 900 ? 168 : height >= 790 ? 148 : height >= 720 ? 124 : 96;
  // Aylantirish faqat joy yetmaganda (masalan, telefonda klaviatura ochilganda)
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);
  // Uzun matnli tillarda sahifa sig'masa, logotip oshgan joy miqdorida kichrayadi (faqat oshib boradi —
  // tebranmaydi; ekran balandligi o'zgarsa qaytadan hisoblanadi; klaviatura ochiq paytda hisoblanmaydi)
  const [fit, setFit] = useState({ height: 0, px: 0 });
  const shrink = fit.height === height ? fit.px : 0;
  const fitContent = (h: number) => {
    setContentH(h);
    if (big && viewH > 0 && viewH >= height * 0.8 && h > viewH + 1) {
      setFit(f => ({ height, px: Math.min(90, (f.height === height ? f.px : 0) + Math.ceil((h - viewH) * 1.4) + 2) }));
    }
  };
  const [step, setStep] = useState<Step>('phone');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [second, setSecond] = useState<SecondStep | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [codeError, setCodeError] = useState<'wrong' | 'locked' | null>(null);
  const [timer, setTimer] = useState(0);
  const [phoneFocus, setPhoneFocus] = useState(false);
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

  const phoneOk = digits.length === PHONE_LEN;
  const phone = `+998${digits}`;
  const shown = `+998 ${formatPhone(digits)}`;

  const sendCode = async (channel: 'SMS' | 'TELEGRAM' = 'SMS') => {
    if (!phoneOk || busy) return;
    const telegram = channel === 'TELEGRAM' && telegramOn;
    setSecond(null);
    setBusy(true);
    setSending(telegram ? 'TELEGRAM' : 'SMS');
    try {
      const sent = await requestOtp({ phone }, telegram ? 'TELEGRAM' : undefined);
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

  const codeRejected = (error: unknown) => {
    haptic.error();
    setRejections(n => n + 1);
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
        setCode(''); setAttemptsLeft(MAX_ATTEMPTS); setCodeError(null);
        setTimer(result.second.resendInSec); setResendSec(result.second.resendInSec);
        setTimeout(() => codeRef.current?.focus(), 300);
        return;
      }
      // To'g'ri kod: kataklar bir lahza yashil, hisob shu orada yuklanadi
      haptic.success();
      setSuccess(true);
      // Hisob avval yuklanadi: haydovchi bo'lsa ro'yxatdan o'tish sahifasi ko'rinmaydi
      await Promise.all([loadAccount(), new Promise(r => setTimeout(r, 420))]);
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
        onContentSizeChange={(_, h) => fitContent(h)}>
        <LinearGradient colors={['#000000', '#0B0904', '#16120A']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[big ? styles.hero : styles.heroCompact, big && styles.heroFill, { paddingTop: insets.top + 12 }]}>
          <Image source={GLOW} pointerEvents="none" style={[styles.glow, { top: insets.top - (big ? 70 : 250) }]} contentFit="contain" />
          {step === 'code' && (
            <Pressable onPress={() => setStep('phone')} style={[styles.back, { top: insets.top + 12 }]} hitSlop={10} accessibilityLabel={tr('Orqaga')}>
              <Ionicons name="chevron-back" size={21} color="#fff" style={flipRTL()} />
            </Pressable>
          )}
          {big ? (
            <>
              <BrandLogo width={Math.max(84, logoW - shrink)} style={{ alignSelf: 'center', marginTop: short ? 0 : 6 }} />
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

        <View style={[styles.card, big && styles.cardFit, { backgroundColor: c.surface, paddingBottom: insets.bottom + 24 }]}>
          {/* ---------- Telefon raqami ---------- */}
          {step === 'phone' && (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="h1">{tr('Telefon raqamingiz')}</Txt>
                <Txt muted style={styles.lead}>{telegramOn ? tr("Kirish yoki ro'yxatdan o'tish uchun kodni Telegram yoki SMS orqali yuboramiz") : tr("Kirish yoki ro'yxatdan o'tish uchun SMS orqali kod yuboramiz")}</Txt>
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
              {telegramOn ? (
                <View style={{ gap: 10 }}>
                  <TelegramButton title={tr('Telegram orqali')} disabled={!phoneOk || busy} loading={sending === 'TELEGRAM'} onPress={() => { sendCode('TELEGRAM').catch(() => {}); }} />
                  <SmsButton title={tr('SMS orqali')} disabled={!phoneOk || busy} loading={sending === 'SMS'} onPress={() => { sendCode('SMS').catch(() => {}); }} />
                </View>
              ) : (
                <Button title={tr('Davom etish')} disabled={!phoneOk} loading={busy} onPress={() => { sendCode().catch(() => {}); }} />
              )}
              <View style={[styles.note, { backgroundColor: c.surface2 }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={c.muted} />
                <Txt v="small" muted style={{ flex: 1, lineHeight: 18 }}>
                  {tr("Yangi haydovchi? Keyingi qadamda avtomobil va hujjatlarni qo'shasiz.")}
                </Txt>
              </View>
              <Txt v="tiny" faint style={styles.legal}>{tr('Davom etib, foydalanish shartlariga rozilik bildirasiz')}</Txt>
            </>
          )}

          {/* ---------- Kod ---------- */}
          {step === 'code' && (
            <OtpStep
              channel={second ? 'SECOND' : via === 'TELEGRAM' ? 'TELEGRAM' : 'SMS'}
              destination={second ? second.destination : shown}
              onEdit={() => setStep('phone')}
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
              onResend={() => { sendCode(via).catch(() => {}); }}
              switchTo={telegramOn && !second ? { channel: via === 'TELEGRAM' ? 'SMS' : 'TELEGRAM', onPress: () => { sendCode(via === 'TELEGRAM' ? 'SMS' : 'TELEGRAM').catch(() => {}); } } : null}
              tgLink={tgLink}
              supportPhone={settings?.supportPhone}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 44, overflow: 'hidden' },
  // kirish ekranida rasm qolgan joyni egallaydi, kartochka esa o'z mazmunicha
  heroFill: { flexGrow: 1, justifyContent: 'center' },
  cardFit: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  heroCompact: { paddingHorizontal: 24, paddingBottom: 40, overflow: 'hidden' },
  glow: { position: 'absolute', alignSelf: 'center', width: 420, height: 420 },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  driverTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginTop: 8, paddingHorizontal: 12, height: 24, borderRadius: 12, backgroundColor: '#FFC800' },
  driverTagText: { color: '#0E1525', fontSize: 11.5, fontFamily: F.heavy, letterSpacing: 2 },
  // shior: sarlavha shrifti, ruscha uzun matn ham ikki tekis qatorga bo'linadi
  tagTitle: { fontSize: 17, lineHeight: 22, fontFamily: F.display, color: '#fff', textAlign: 'center', letterSpacing: -0.3, marginTop: 10, maxWidth: 300, alignSelf: 'center' },
  tagSub: { fontSize: 13, lineHeight: 18, fontFamily: F.medium, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 4 },
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
  legal: { textAlign: 'center', fontSize: 12, lineHeight: 17, fontFamily: F.medium, paddingHorizontal: 8 },
  lead: { fontSize: 14.5, lineHeight: 21 },
});
