// Sahifa pastidagi ikki tugma: chapda ikkinchi darajali amal (belgisi rangli doirachada), o'ngda asosiy amal
// (sariq gradient). Ikkalasi bir xil kenglik va balandlikda, belgi va yozuv o'rtada; uzun yozuv («Hamkorlik
// so'rovi») ikki qatorga o'tadi, sig'masa shrift biroz kichrayadi.
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

export function ActionBar({ secondary, primary }: { secondary: Action; primary: Action }) {
  return (
    <View style={styles.row}>
      <SecondaryAction {...secondary} />
      <PrimaryAction {...primary} />
    </View>
  );
}

function SecondaryAction({ title, icon, onPress, disabled, loading, tint }: Action) {
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
        { backgroundColor: pressed ? c.surface3 : c.surface2, borderColor: c.line, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      <View style={[styles.chip, { backgroundColor: alpha(color, 0.16) }]}>
        {loading ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={18} color={color} />}
      </View>
      <Text style={[styles.secondaryText, { color: c.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
        {title}
      </Text>
    </Pressable>
  );
}

function PrimaryAction({ title, icon, onPress, disabled, loading }: Action) {
  const { colors: c } = useStore();
  const off = !!disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: off }}
      disabled={off || loading}
      onPress={() => { haptic.tap(); onPress?.(); }}
      style={({ pressed }) => [styles.primaryWrap, !off && styles.glow, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      {off ? (
        <View style={[styles.primary, { backgroundColor: c.surface3 }]}>
          <View style={[styles.primaryIcon, { backgroundColor: 'transparent' }]}>
            <Ionicons name={icon} size={18} color={c.faint} />
          </View>
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

// ikkala tugma uchun bir xil o'lchamlar
const HEIGHT = 56;
const RADIUS = 18;
const ICON = 32;
const GAP = 9;
const PAD = 12;
const FONT = 15.5;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1, minWidth: 0, height: HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: GAP,
    paddingHorizontal: PAD, borderRadius: RADIUS, borderWidth: StyleSheet.hairlineWidth,
  },
  chip: { width: ICON, height: ICON, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { flexShrink: 1, minWidth: 0, fontFamily: F.heavy, fontSize: FONT, lineHeight: 18.5, letterSpacing: -0.2, textAlign: 'center' },
  primaryWrap: { flex: 1, minWidth: 0, borderRadius: RADIUS },
  glow: { shadowColor: '#FFB800', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  primary: {
    height: HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: GAP,
    paddingHorizontal: PAD, borderRadius: RADIUS, overflow: 'hidden',
  },
  primaryIcon: { width: ICON, height: ICON, borderRadius: 10, backgroundColor: 'rgba(14,21,37,0.1)', alignItems: 'center', justifyContent: 'center' },
  primaryText: { flexShrink: 1, minWidth: 0, fontFamily: F.heavy, fontSize: FONT, lineHeight: 18.5, letterSpacing: -0.2, textAlign: 'center' },
});
