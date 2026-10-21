import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic, useColors } from '@/lib/store';
import { radius, shadow } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? c.text} style={style} />;
}

type Variant = 'title' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
const sizes: Record<Variant, TextStyle> = {
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  h2: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500' },
  small: { fontSize: 13, fontWeight: '500' },
  tiny: { fontSize: 11.5, fontWeight: '600' },
};

export function Txt({ v = 'body', muted, faint, color, style, ...rest }: TextProps & { v?: Variant; muted?: boolean; faint?: boolean; color?: string }) {
  const c = useColors();
  return <Text {...rest} style={[sizes[v], { color: color ?? (muted ? c.muted : faint ? c.faint : c.text) }, style]} />;
}

type BtnProps = {
  title: string;
  onPress?: () => void;
  kind?: 'brand' | 'dark' | 'ghost' | 'danger' | 'outline';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  sub?: string;
  small?: boolean;
};

export function Button({ title, onPress, kind = 'brand', icon, disabled, loading, style, sub, small }: BtnProps) {
  const c = useColors();
  const bg = { brand: c.brand, dark: c.ink, ghost: c.surface2, danger: c.dangerSoft, outline: 'transparent' }[kind];
  const fg = { brand: c.brandText, dark: c.bg, ghost: c.text, danger: c.danger, outline: c.text }[kind];
  return (
    <Pressable
      onPress={() => { haptic.tap(); onPress?.(); }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && { height: 42, paddingHorizontal: 14, borderRadius: 13 },
        { backgroundColor: bg, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        kind === 'outline' && { borderWidth: 1.5, borderColor: c.line },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={small ? 17 : 20} color={fg} />}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: fg, fontSize: small ? 14 : 16, fontWeight: '800' }}>{title}</Text>
            {sub ? <Text style={{ color: fg, opacity: 0.7, fontSize: 12, fontWeight: '600' }}>{sub}</Text> : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, style, badge, size = 46, color }: { name: IconName; onPress?: () => void; style?: StyleProp<ViewStyle>; badge?: boolean; size?: number; color?: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => { haptic.tap(); onPress?.(); }}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2.8, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }, shadow(c), style]}>
      <Ionicons name={name} size={22} color={color ?? c.text} />
      {badge && <View style={{ position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger, borderWidth: 2, borderColor: c.surface }} />}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const base = [{ backgroundColor: c.surface, borderRadius: radius.l, padding: 16 }, shadow(c, 0.6), style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }]}>{children}</Pressable>;
}

export function Row({ children, style, gap = 12 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function ListItem({ icon, title, sub, onPress, right, iconBg, iconColor, danger }: {
  icon: IconName; title: string; sub?: string; onPress?: () => void; right?: ReactNode; iconBg?: string; iconColor?: string; danger?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress?.(); }} style={({ pressed }) => [styles.item, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
      <View style={[styles.itemIcon, { backgroundColor: iconBg ?? (danger ? c.dangerSoft : c.surface2) }]}>
        <Ionicons name={icon} size={20} color={iconColor ?? (danger ? c.danger : c.text)} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="h3" color={danger ? c.danger : undefined} numberOfLines={1}>{title}</Txt>
        {sub ? <Txt v="small" muted numberOfLines={1}>{sub}</Txt> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.faint} /> : null)}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => { haptic.tap(); onPress?.(); }}
      style={[styles.chip, { backgroundColor: active ? c.ink : c.surface2, borderColor: active ? c.ink : c.line }]}>
      {icon && <Ionicons name={icon} size={16} color={active ? c.bg : c.text} />}
      <Text style={{ color: active ? c.bg : c.text, fontWeight: '700', fontSize: 13.5 }}>{label}</Text>
    </Pressable>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.line }, style]} />;
}

export function Avatar({ name, size = 48, bg }: { name: string; size?: number; bg?: string }) {
  const c = useColors();
  const init = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: bg ?? c.brand, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.brandText, fontWeight: '800', fontSize: size * 0.36 }}>{init}</Text>
    </View>
  );
}

/** Ichki sahifalar uchun karkas: sarlavha + aylantiriladigan kontent */
export function Screen({ title, children, right, scroll = true, footer }: { title: string; children: ReactNode; right?: ReactNode; scroll?: boolean; footer?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} size={42} />
        <Txt v="h2" style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
        {right}
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + (footer ? 110 : 32), gap: 14 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : <View style={{ flex: 1 }}>{children}</View>}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: c.bg, borderTopColor: c.line }]}>{footer}</View> : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Txt v="tiny" faint style={{ textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginLeft: 4 }}>{children}</Txt>;
}

const styles = StyleSheet.create({
  btn: { height: 56, borderRadius: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
  itemIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
