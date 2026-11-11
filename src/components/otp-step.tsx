// Kod kiritish bosqichi — yo'lovchi va haydovchi kirishida bir xil. Kanal rangidagi «nafas oluvchi»
// ikonka, raqam chipi, jonli kataklar (navbat bilan chiqadi, raqam sakrab tushadi, xato — silkinadi,
// to'g'ri — yashil), progress chiziqli taymer va pastda «Kod kelmadimi?» yordam kartasi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ComponentRef, type RefObject } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { LTR_STYLE, ltrProps, tr } from '@/lib/i18n';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import { ChannelIcon, SmsBadge, TELEGRAM_BLUE, TELEGRAM_SOFT, TelegramBadge, TelegramSteps, type CodeChannel } from './telegram-otp';
import { Row, Txt } from './ui';

export type OtpChannelView = 'SMS' | 'TELEGRAM' | 'EMAIL' | 'SECOND';

const ND = Platform.OS !== 'web';

export interface OtpStepProps {
  channel: OtpChannelView;
  /** Kod ketgan manzil: +998 90 123 45 67, na•••@mail.uz */
  destination: string;
  onEdit?: () => void;
  codeLen: number;
  code: string;
  onCode: (value: string) => void;
  inputRef: RefObject<ComponentRef<typeof TextInput> | null>;
  error: 'wrong' | 'locked' | null;
  attemptsLeft: number;
  /** Har xato kodda oshadi — kataklar silkinadi */
  rejections: number;
  busy: boolean;
  /** Kod qabul qilindi — kataklar yashil */
  success?: boolean;
  timer: number;
  /** Taymerning to'liq davomiyligi (progress uchun) */
  resendSec: number;
  onResend: () => void;
  /** Boshqa kanal (Telegram ↔ SMS) */
  switchTo?: { channel: 'SMS' | 'TELEGRAM'; onPress: () => void } | null;
  tgLink?: string | null;
  supportPhone?: string;
}

export function OtpStep({ inputRef, ...p }: OtpStepProps) {
  const { colors: c } = useStore();
  const [focus, setFocus] = useState(false);
  const [blink] = useState(() => new Animated.Value(1));
  const [shake] = useState(() => new Animated.Value(0));
  const locked = p.error === 'locked';
  // Telegram yo'riqnomasi chiqqanda yoki past ekranda — ixcham, aylanmasdan sig'adi
  const { height } = useWindowDimensions();
  const withSteps = p.channel === 'TELEGRAM' && !!p.tgLink;
  const compact = withSteps || height < 740;

  const look = {
    SMS: { tint: c.brandDeep, soft: c.brandSoft, title: tr('SMS kodni kiriting') },
    EMAIL: { tint: c.brandDeep, soft: c.brandSoft, title: tr('Emaildagi kodni kiriting') },
    TELEGRAM: { tint: TELEGRAM_BLUE, soft: TELEGRAM_SOFT, title: p.tgLink ? tr("Kodni Telegram'dan oling") : tr("Telegram'dagi kodni kiriting") },
    SECOND: { tint: c.ok, soft: c.okSoft, title: tr('Ikkinchi kodni kiriting') },
  }[p.channel];
  const subtitle =
    p.channel === 'SECOND' ? tr('Ikki bosqichli himoya yoqilgan: kod boshqa manzilingizga yuborildi')
      : p.channel === 'TELEGRAM' ? (p.tgLink ? tr('Raqamingiz botga hali ulanmagan — bir marta ulang, kod darhol keladi') : tr("{CODE_LEN} xonali kod Telegram'ga yuborildi", { CODE_LEN: p.codeLen }))
        : tr('{CODE_LEN} xonali kod yuborildi', { CODE_LEN: p.codeLen });

  // Faol katakdagi kursor miltillashi
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(blink, { toValue: 0, duration: 450, delay: 250, useNativeDriver: ND }),
      Animated.timing(blink, { toValue: 1, duration: 450, useNativeDriver: ND }),
    ]));
    a.start();
    return () => a.stop();
  }, [blink]);

  // Xato kod — silkinish
  useEffect(() => {
    if (!p.rejections) return;
    Animated.sequence([10, -10, 7, -7, 3, 0].map(v => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: ND }))).start();
  }, [p.rejections, shake]);

  return (
    <View style={styles.wrap}>
      <View style={styles.main}>
      <View style={styles.head}>
        <Beacon channel={p.channel} tint={look.tint} soft={look.soft} size={compact ? 62 : 76} />
        <Txt v="h1" style={styles.center}>{look.title}</Txt>
        <Txt muted style={[styles.center, { lineHeight: 20 }]}>{subtitle}</Txt>
        <Pressable
          onPress={p.onEdit ? () => { haptic.tap(); p.onEdit?.(); } : undefined}
          disabled={!p.onEdit}
          accessibilityLabel={tr("Raqamni o'zgartirish")}
          style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? c.surface3 : c.surface2, borderColor: c.line }]}>
          <Ionicons name={p.channel === 'EMAIL' ? 'mail-outline' : 'call-outline'} size={15} color={c.muted} />
          <Text style={[styles.chipText, { color: c.text }]}>{p.destination}</Text>
          {p.onEdit && (
            <View style={[styles.chipEdit, { backgroundColor: c.surface3 }]}>
              <Ionicons name="pencil" size={12} color={c.text} />
            </View>
          )}
        </Pressable>
      </View>

      {withSteps && p.tgLink ? <TelegramSteps link={p.tgLink} compact /> : null}

      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <Pressable onPress={() => inputRef.current?.focus()} style={[styles.cells, LTR_STYLE]} {...ltrProps} accessibilityLabel={tr('Tasdiqlash kodi')}>
          {Array.from({ length: p.codeLen }, (_, i) => (
            <Cell
              key={i}
              index={i}
              digit={p.code[i]}
              active={!locked && !p.success && focus && i === Math.min(p.code.length, p.codeLen - 1) && !(i < p.code.length && p.code.length === p.codeLen)}
              state={p.success ? 'ok' : p.error ? 'bad' : 'idle'}
              dim={locked}
              blink={blink}
            />
          ))}
        </Pressable>
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={p.code}
        onChangeText={p.onCode}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        editable={!locked && !p.success}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={p.codeLen}
        style={styles.hidden}
        autoFocus
      />

      <View style={styles.status}>
        {p.success ? (
          <Row gap={6}>
            <Ionicons name="checkmark-circle" size={17} color={c.ok} />
            <Txt v="small" color={c.ok} style={{ fontFamily: F.bold }}>{tr('Kod tasdiqlandi')}</Txt>
          </Row>
        ) : p.busy ? (
          <Row gap={8}>
            <ActivityIndicator size="small" color={c.muted} />
            <Txt v="small" muted>{tr('Tekshirilmoqda…')}</Txt>
          </Row>
        ) : p.error ? (
          <Row gap={6} style={{ justifyContent: 'center' }}>
            <Ionicons name="alert-circle" size={16} color={c.danger} />
            <Txt v="small" color={c.danger} style={{ fontFamily: F.semi }}>
              {locked ? tr('Urinishlar tugadi — yangi kod oling') : tr("Kod noto'g'ri. Yana {MAX_ATTEMPTS} ta urinish qoldi", { MAX_ATTEMPTS: p.attemptsLeft })}
            </Txt>
          </Row>
        ) : null}
        {!p.success && (p.timer > 0 ? (
          <Countdown timer={p.timer} total={p.resendSec} />
        ) : (
          <Pressable onPress={() => { haptic.tap(); p.onResend(); }} style={({ pressed }) => [styles.pill, { backgroundColor: c.brandSoft, borderColor: c.brand, opacity: pressed ? 0.75 : 1 }]}>
            <Ionicons name="refresh" size={16} color={c.brandDeep} />
            <Txt v="small" color={c.brandDeep} style={{ fontFamily: F.bold }}>{tr('Kodni qayta yuborish')}</Txt>
          </Pressable>
        ))}
      </View>
      </View>

      <HelpCard switchTo={p.switchTo} timer={p.timer} supportPhone={withSteps ? undefined : p.supportPhone} />
      {!withSteps && (
        <Row gap={8} style={{ justifyContent: 'center' }}>
          <Ionicons name="shield-checkmark-outline" size={15} color={c.ok} />
          <Txt v="tiny" faint style={{ flexShrink: 1 }}>{tr("Kodni hech kimga aytmang — YUMS xodimlari uni so'ramaydi")}</Txt>
        </Row>
      )}
    </View>
  );
}

/** Kanal ikonkasi va undan tarqaluvchi ikki halqa */
function Beacon({ channel, tint, soft, size }: { channel: CodeChannel; tint: string; soft: string; size: number }) {
  const [a] = useState(() => new Animated.Value(0));
  const [b] = useState(() => new Animated.Value(0));
  useEffect(() => {
    // Ikkinchi halqa yarim davr kechikib boshlanadi va keyin birinchisi bilan bir maromda yuradi
    const wave = (v: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: ND }),
        ])),
      ]);
    const one = wave(a, 0);
    const two = wave(b, 1200);
    one.start();
    two.start();
    return () => { one.stop(); two.stop(); };
  }, [a, b]);
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.34) };
  const ring = (v: Animated.Value) => ({
    borderColor: tint,
    opacity: v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.45, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) }],
  });
  return (
    <View style={[styles.beacon, { width: size, height: size }]}>
      <Animated.View style={[styles.ring, box, ring(a)]} />
      <Animated.View style={[styles.ring, box, ring(b)]} />
      <View style={[styles.beaconTile, box, { backgroundColor: soft, borderColor: tint }]}>
        <ChannelIcon channel={channel} size={Math.round(size * 0.46)} color={tint} />
      </View>
    </View>
  );
}

/** Bitta katak: navbat bilan paydo bo'ladi, raqam sakrab tushadi */
function Cell({ index, digit, active, state, dim, blink }: { index: number; digit?: string; active: boolean; state: 'idle' | 'bad' | 'ok'; dim: boolean; blink: Animated.Value }) {
  const { colors: c } = useStore();
  const [enter] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 320, delay: 60 * index, easing: Easing.out(Easing.back(1.4)), useNativeDriver: ND }).start();
  }, [enter, index]);
  useEffect(() => {
    if (!digit) return;
    pop.setValue(0.55);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 180, useNativeDriver: ND }).start();
  }, [digit, pop]);

  const filled = !!digit;
  const border = state === 'bad' ? c.danger : state === 'ok' ? c.ok : active ? c.brand : filled ? c.surface3 : 'transparent';
  const bg = state === 'ok' ? c.okSoft : state === 'bad' ? c.dangerSoft : active ? c.surface : c.surface2;
  return (
    <Animated.View
      style={[
        styles.cell,
        { backgroundColor: bg, borderColor: border, opacity: dim ? 0.5 : enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
        active && styles.cellActive,
        active && Platform.OS === 'web' && ({ boxShadow: `0 0 0 4px ${c.brandSoft}` } as object),
      ]}>
      {filled ? (
        <Animated.Text style={[styles.digit, { color: state === 'bad' ? c.danger : state === 'ok' ? c.ok : c.text, transform: [{ scale: pop }] }]}>{digit}</Animated.Text>
      ) : active ? (
        <Animated.View style={[styles.caret, { backgroundColor: c.brand, opacity: blink }]} />
      ) : (
        <View style={[styles.dot, { backgroundColor: c.faint }]} />
      )}
    </Animated.View>
  );
}

/** «Yangi kodni 0:54 dan keyin…» va tugab boruvchi chiziq */
function Countdown({ timer, total }: { timer: number; total: number }) {
  const { colors: c } = useStore();
  const share = Math.max(0, Math.min(1, total > 0 ? timer / total : 0));
  const [fill] = useState(() => new Animated.Value(share));
  // har soniyada keyingi qiymatga silliq siljiydi — fon uzilmasdan qisqaradi
  useEffect(() => {
    const next = Math.max(0, share - 1 / Math.max(1, total));
    Animated.timing(fill, { toValue: next, duration: 1000, easing: Easing.linear, useNativeDriver: false }).start();
  }, [share, total, fill]);
  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[styles.pill, { backgroundColor: c.surface2, borderColor: c.line }]}>
      <Animated.View style={[styles.pillFill, { width, backgroundColor: c.brandSoft }]} />
      <Ionicons name="time-outline" size={15} color={c.brandDeep} />
      <Txt v="small" muted style={{ fontVariant: ['tabular-nums'] }}>
        {tr('{time} dan keyin yangi kod', { time: `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` })}
      </Txt>
    </View>
  );
}

/** +998900152601 → +998 90 015 26 01 (boshqa formatlar o'zgarmaydi) */
const prettyPhone = (p: string): string => {
  const d = p.replace(/[^\d+]/g, '');
  return /^\+998\d{9}$/.test(d) ? `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 9)} ${d.slice(9, 11)} ${d.slice(11)}` : p;
};

/** Pastki karta: boshqa kanal va yordam */
function HelpCard({ switchTo, timer, supportPhone }: { switchTo?: OtpStepProps['switchTo']; timer: number; supportPhone?: string }) {
  const { colors: c } = useStore();
  if (!switchTo && !supportPhone) return null;
  const waiting = timer > 0;
  const toTelegram = switchTo?.channel === 'TELEGRAM';
  return (
    <View style={[styles.help, { backgroundColor: c.surface2, borderColor: c.line }]}>
      <Txt v="tiny" faint style={styles.helpTitle}>{tr('Kod kelmadimi?')}</Txt>
      {switchTo && (
        <Pressable
          onPress={() => { haptic.tap(); switchTo.onPress(); }}
          disabled={waiting}
          style={({ pressed }) => [styles.helpRow, { opacity: waiting ? 0.6 : 1, backgroundColor: pressed ? c.surface3 : 'transparent' }]}>
          {toTelegram ? <TelegramBadge size={38} /> : <SmsBadge size={38} />}
          <View style={{ flex: 1 }}>
            <Txt v="h3" style={{ fontSize: 15 }}>{toTelegram ? tr('Telegram orqali olish') : tr('SMS orqali olish')}</Txt>
            <Txt v="tiny" muted>{toTelegram ? tr('Bepul va bir zumda — kod botga keladi') : tr('Oddiy SMS xabar bilan')}</Txt>
          </View>
          {waiting ? (
            <Txt v="small" faint style={{ fontVariant: ['tabular-nums'] }}>{`${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`}</Txt>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={c.faint} />
          )}
        </Pressable>
      )}
      {switchTo && supportPhone ? <View style={[styles.helpLine, { backgroundColor: c.line }]} /> : null}
      {supportPhone ? (
        <Pressable
          onPress={() => { haptic.tap(); Linking.openURL(`tel:${supportPhone.replace(/[^\d+]/g, '')}`).catch(() => {}); }}
          style={({ pressed }) => [styles.helpRow, { backgroundColor: pressed ? c.surface3 : 'transparent' }]}>
          <View style={[styles.helpIcon, { backgroundColor: c.okSoft }]}>
            <Ionicons name="headset" size={18} color={c.ok} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="h3" style={{ fontSize: 15 }}>{tr('Yordam kerakmi?')}</Txt>
            <Txt v="tiny" muted style={{ fontVariant: ['tabular-nums'] }}>{prettyPhone(supportPhone)}</Txt>
          </View>
          <Ionicons name="call-outline" size={18} color={c.faint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 16 },
  head: { alignItems: 'center', gap: 6, paddingTop: 2 },
  center: { textAlign: 'center' },
  beacon: { alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  ring: { position: 'absolute', borderWidth: 1.5 },
  beaconTile: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingLeft: 14, paddingRight: 8, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, marginTop: 6 },
  chipText: { fontSize: 15, fontFamily: F.bold, fontVariant: ['tabular-nums'], letterSpacing: 0.2 },
  chipEdit: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  // kod raqamlari har doim chapdan o'ngga (arab tilida ham)
  cells: { flexDirection: 'row', gap: 9, justifyContent: 'center' },
  cell: { flex: 1, maxWidth: 60, height: 62, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cellActive: { shadowColor: '#FFC800', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  digit: { fontSize: 27, fontFamily: F.display },
  caret: { width: 2, height: 26, borderRadius: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.5 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  // sarlavha, raqam, kataklar va holat — qolgan joyning o'rtasida
  main: { flexGrow: 1, justifyContent: 'center', gap: 16, paddingBottom: 4 },
  status: { alignItems: 'center', gap: 10, minHeight: 44 },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, paddingHorizontal: 18, borderRadius: 21, borderWidth: 1, overflow: 'hidden' },
  pillFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  help: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  helpTitle: { textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: F.bold, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, marginHorizontal: 4 },
  helpIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  helpLine: { height: StyleSheet.hairlineWidth, marginHorizontal: 18 },
});
