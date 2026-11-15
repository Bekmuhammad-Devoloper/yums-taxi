// Kirish kodini Telegram orqali olish: «Telegram orqali» tugmasi va raqam botga hali ulanmagan
// bo'lsa — qisqa yo'riqnoma bilan «Telegram'ni ochish». Ikkala ilovaning kirish ekranida bir xil.
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/lib/i18n';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import { Txt } from './ui';

/** Telegram'ning o'z rangi — tugma darhol tanilsin */
export const TELEGRAM_BLUE = '#2AABEE';
export const TELEGRAM_SOFT = 'rgba(42,171,238,0.14)';
/** SMS — telefonlardagi xabarlar ilovasining yashili */
const SMS_GRADIENT = ['#5EE07C', '#26B04A'] as const;

export type CodeChannel = 'TELEGRAM' | 'SMS' | 'EMAIL' | 'SECOND';

/**
 * Kod kanalining belgisi. Telegram — asl Telegram logotipi (doira ichida samolyot), SMS — xabar
 * pufakchasi, email — qulfli xat, ikkinchi bosqich — qalqon.
 */
export function ChannelIcon({ channel, size = 22, color }: { channel: CodeChannel; size?: number; color: string }) {
  if (channel === 'TELEGRAM') return <FontAwesome name="telegram" size={size} color={color} />;
  if (channel === 'SMS') return <Ionicons name="chatbubble-ellipses" size={size} color={color} />;
  if (channel === 'EMAIL') return <MaterialCommunityIcons name="email-lock" size={size} color={color} />;
  return <MaterialCommunityIcons name="shield-check" size={size} color={color} />;
}

/** Bot havolasini ochadi: telefonda Telegram ilovasi, kompyuterda brauzer */
export function openTelegram(link: string): void {
  Linking.openURL(link).catch(() => {});
}

export function TelegramButton({ title, onPress, loading, disabled }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const { colors: c } = useStore();
  const off = disabled && !loading;
  return (
    <Pressable
      onPress={() => { haptic.tap(); onPress(); }}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, { backgroundColor: off ? c.surface3 : TELEGRAM_BLUE, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {loading ? <ActivityIndicator color="#fff" /> : (
        <>
          <ChannelIcon channel="TELEGRAM" size={25} color={off ? c.faint : '#fff'} />
          <Text style={[styles.btnText, { color: off ? c.faint : '#fff' }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** SMS nishoni: yashil gradientli yumaloq kvadrat, ichida oq xabar pufakchasi (o'chiq bo'lsa — kulrang) */
export function SmsBadge({ size = 30, off }: { size?: number; off?: boolean }) {
  const { colors: c } = useStore();
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.3) };
  const icon = <Ionicons name="chatbubble-ellipses" size={Math.round(size * 0.58)} color={off ? c.faint : '#fff'} />;
  if (off) return <View style={[styles.badge, box, { backgroundColor: c.surface3 }]}>{icon}</View>;
  return (
    <LinearGradient colors={SMS_GRADIENT} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.badge, box, styles.badgeGlow]}>
      {icon}
    </LinearGradient>
  );
}

/** Telegram nishoni: Telegram'ning ko'k doirasi ichida oq samolyot (asl logotip ko'rinishi) */
export function TelegramBadge({ size = 30 }: { size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: TELEGRAM_BLUE }, styles.tgGlow]}>
      <FontAwesome5 name="telegram-plane" brand size={Math.round(size * 0.5)} color="#fff" style={{ marginLeft: -Math.round(size * 0.06) }} />
    </View>
  );
}

/** «SMS orqali»: Telegram tugmasining ostida — xabarlar ilovasi uslubidagi yashil nishon bilan */
export function SmsButton({ title, onPress, loading, disabled }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const { colors: c } = useStore();
  const off = disabled && !loading;
  return (
    <Pressable
      onPress={() => { haptic.tap(); onPress(); }}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, { backgroundColor: pressed ? c.surface3 : c.surface2, borderWidth: 1, borderColor: c.line, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {loading ? <ActivityIndicator color={c.text} /> : (
        <>
          <SmsBadge off={off} />
          <Text style={[styles.btnText, { color: off ? c.faint : c.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Raqam botga hali ulanmagan: uch qadam va «Telegram'ni ochish» */
export function TelegramSteps({ link, compact }: { link: string; compact?: boolean }) {
  const { colors: c } = useStore();
  // Ixcham ko'rinishda birinchi qadam tugmaning o'zi
  const all = [
    tr("«Telegram'ni ochish» ni bosing"),
    tr('Botda «Start» ni bosing'),
    tr('«📱 Raqamni yuborish» ni bosing — kod shu zahoti keladi'),
  ];
  const steps = compact ? all.slice(1) : all;
  return (
    <View style={[styles.card, { backgroundColor: c.surface2 }]}>
      {steps.map((s, i) => (
        <View key={s} style={styles.step}>
          <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
          <Txt v="small" style={{ flex: 1, lineHeight: 19 }}>{s}</Txt>
        </View>
      ))}
      <TelegramButton title={tr("Telegram'ni ochish")} onPress={() => openTelegram(link)} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 56, borderRadius: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { fontSize: 16.5, fontFamily: F.bold, letterSpacing: -0.15 },
  badge: { alignItems: 'center', justifyContent: 'center' },
  tgGlow: { shadowColor: TELEGRAM_BLUE, shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  badgeGlow: { shadowColor: '#26B04A', shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  card: { borderRadius: 18, padding: 14, gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: TELEGRAM_SOFT },
  numText: { color: TELEGRAM_BLUE, fontSize: 12.5, fontFamily: F.heavy },
});
