// Sahifa pastidagi ikki tugma: chapda ikkinchi darajali amal (belgisi rangli doirachada), o'ngda asosiy amal
// (sariq gradient). Yozuv doim bir qatorda — sig'masa shrift biroz kichrayadi, «Hamkorlik so'rovi» ikkiga bo'linmaydi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { alpha, type IconName } from '@/components/ui';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

export type Action = {
  title: string;
  icon: IconName;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Ikkinchi darajali tugma belgisining rangi (standart — binafsha) */
  tint?: string;
};

/** Kenglik yozuv uzunligiga qarab: «Hamkorlik so'rovi» kengroq, «Yozish» ixchamroq — ikkalasi ham to'liq ko'rinadi */
const weight = (title: string) => Math.max(1, Math.min(1.8, title.length / 11));

export function ActionBar({ secondary, primary }: { secondary: Action; primary: Action }) {
  return (
    <View style={styles.row}>
      <SecondaryAction {...secondary} flex={weight(secondary.title)} />
      <PrimaryAction {...primary} flex={weight(primary.title)} />
    </View>
  );
}

function SecondaryAction({ title, icon, onPress, disabled, loading, tint, flex }: Action & { flex: number }) {
  const { colors: c } = useStore();
  const color = tint ?? c.violet;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => { haptic.tap(); onPress?.(); }}
      style={({ pressed }) => [
        styles.secondary,
        { flex, backgroundColor: pressed ? c.surface3 : c.surface2, borderColor: c.line, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      <View style={[styles.chip, { backgroundColor: alpha(color, 0.16) }]}>
        {loading ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={19} color={color} />}
      </View>
      <Text style={[styles.secondaryText, { color: c.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
        {title}
      </Text>
    </Pressable>
  );
}

function PrimaryAction({ title, icon, onPress, disabled, loading, flex }: Action & { flex: number }) {
  const { colors: c } = useStore();
  const off = !!disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: off }}
      disabled={off || loading}
      onPress={() => { haptic.tap(); onPress?.(); }}
      style={({ pressed }) => [styles.primaryWrap, { flex }, !off && styles.glow, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      {off ? (
        <View style={[styles.primary, { backgroundColor: c.surface3 }]}>
          <Ionicons name={icon} size={20} color={c.faint} />
          <Text style={[styles.primaryText, { color: c.faint }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>{title}</Text>
        </View>
      ) : (
        <LinearGradient colors={['#FFDD55', '#FFC800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
          {loading ? <ActivityIndicator color={c.brandText} /> : (
            <>
              <View style={styles.primaryIcon}>
                <Ionicons name={icon} size={18} color={c.brandText} />
              </View>
              <Text style={[styles.primaryText, { color: c.brandText }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>{title}</Text>
            </>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const HEIGHT = 56;
const RADIUS = 18;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  secondary: {
    minWidth: 0, height: HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingStart: 10, paddingEnd: 12, borderRadius: RADIUS, borderWidth: StyleSheet.hairlineWidth,
  },
  chip: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { flex: 1, minWidth: 0, fontFamily: F.heavy, fontSize: 14.5, lineHeight: 18, letterSpacing: -0.2 },
  primaryWrap: { minWidth: 0, borderRadius: RADIUS },
  glow: { shadowColor: '#FFB800', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  primary: {
    height: HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    paddingHorizontal: 14, borderRadius: RADIUS, overflow: 'hidden',
  },
  primaryIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(14,21,37,0.1)', alignItems: 'center', justifyContent: 'center' },
  primaryText: { flexShrink: 1, fontFamily: F.heavy, fontSize: 16, lineHeight: 19, letterSpacing: -0.2, textAlign: 'center' },
});
