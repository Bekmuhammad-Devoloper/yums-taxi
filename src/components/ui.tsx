import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic, useColors } from '@/lib/store';
import { F, radius, shadow } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? c.text} style={style} />;
}

type Variant = 'title' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
const sizes: Record<Variant, TextStyle> = {
  title: { fontSize: 30, fontFamily: F.display, letterSpacing: -1, lineHeight: 36 },
  h1: { fontSize: 24, fontFamily: F.display, letterSpacing: -0.7, lineHeight: 30 },
  h2: { fontSize: 19, fontFamily: F.display, letterSpacing: -0.5, lineHeight: 25 },
  h3: { fontSize: 16, fontFamily: F.semi, letterSpacing: -0.2, lineHeight: 21 },
  body: { fontSize: 15, fontFamily: F.medium, lineHeight: 22 },
  small: { fontSize: 13.5, fontFamily: F.medium, lineHeight: 19 },
  tiny: { fontSize: 11.5, fontFamily: F.semi, letterSpacing: 0.1 },
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
            <Text style={{ color: fg, fontSize: small ? 14 : 16, fontFamily: F.heavy }}>{title}</Text>
            {sub ? <Text style={{ color: fg, opacity: 0.7, fontSize: 12, fontFamily: F.semi }}>{sub}</Text> : null}
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
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2.8, backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }, shadow(c, 0.35), style]}>
      <Ionicons name={name} size={21} color={color ?? c.text} />
      {badge && <View style={{ position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger, borderWidth: 2, borderColor: c.surface }} />}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const base = [{ backgroundColor: c.surface, borderRadius: radius.l, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line }, shadow(c, 0.2), style];
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
      <Text style={{ color: active ? c.bg : c.text, fontFamily: F.bold, fontSize: 13.5 }}>{label}</Text>
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
      <Text style={{ color: c.brandText, fontFamily: F.heavy, fontSize: size * 0.36 }}>{init}</Text>
    </View>
  );
}

/** Rangli hex'ga shaffoflik qo'shish: '#2457F5' + 0.12 → '#2457F51F' */
export const alpha = (hex: string, a: number) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

/** Rangni qoraga aralashtirish — chuqur gradientlar uchun */
export const shade = (hex: string, k = 0.55) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (v: number) => Math.round(v * (1 - k)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
};

/**
 * Zamonaviy nozik ikonka: yengil shisha fon, ingichka chegara va outline belgi.
 * `glass` — qorong'i fon (hero) ustida ishlatish uchun.
 */
export function IconTile({ name, color, size = 44, glass, style }: { name: IconName; color: string; size?: number; glass?: boolean; style?: StyleProp<ViewStyle> }) {
  const r = size * 0.32;
  return (
    <View style={[{ width: size, height: size, borderRadius: r, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: glass ? 'rgba(255,255,255,0.14)' : alpha(color, 0.22) }, style]}>
      <LinearGradient
        colors={glass ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)'] : [alpha(color, 0.16), alpha(color, 0.05)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={name} size={size * 0.46} color={color} />
      </LinearGradient>
    </View>
  );
}

const LOGO_MARK = require('@/assets/images/logo-mark.png');
const LOGO_FULL = require('@/assets/images/logo.png');
export const LOGO_EMBLEM = require('@/assets/images/logo-emblem.png');

/** YUMS emblemasi (o'rgimchak) — qora yumaloq fonda */
export function BrandMark({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: '#000', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,200,0,0.35)' }, style]}>
      <Image source={LOGO_MARK} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="YUMS" />
    </View>
  );
}

/** To'liq logo: emblema + YUMS yozuvi */
export function BrandLogo({ width = 220, style }: { width?: number; style?: StyleProp<ViewStyle> }) {
  return <Image source={LOGO_FULL} style={[{ width, height: width * 1.117 }, style as object]} contentFit="contain" accessibilityLabel="YUMS — O'rgimchak Taxi" />;
}

/** Ichki sahifalar uchun karkas: sarlavha + aylantiriladigan kontent */
export function Screen({ title, subtitle, children, right, scroll = true, footer, back = true }: {
  title: string; subtitle?: string; children: ReactNode; right?: ReactNode; scroll?: boolean; footer?: ReactNode; back?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }, !back && { paddingLeft: 20 }]}>
        {back && <IconButton name="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} size={42} />}
        <View style={{ flex: 1 }}>
          <Txt v={back ? 'h2' : 'h1'} numberOfLines={1}>{title}</Txt>
          {subtitle ? <Txt v="small" muted numberOfLines={1}>{subtitle}</Txt> : null}
        </View>
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

/** Bo'lim sarlavhasi + «Barchasi» havolasi */
export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <Row style={[{ justifyContent: 'space-between', marginTop: 6 }, style]}>
      <Txt v="h2" style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
      {action ? (
        <Pressable onPress={() => { haptic.tap(); onAction?.(); }} hitSlop={10} style={styles.headerLink}>
          <Txt v="small" color={c.accent} style={{ fontFamily: F.bold }}>{action}</Txt>
          <Ionicons name="chevron-forward" size={14} color={c.accent} />
        </Pressable>
      ) : null}
    </Row>
  );
}

export type Tone = 'brand' | 'ok' | 'warn' | 'danger' | 'accent' | 'violet' | 'muted';

export function useTone(tone: Tone) {
  const c = useColors();
  return {
    brand: { fg: c.brandDeep, bg: c.brandSoft },
    ok: { fg: c.ok, bg: c.okSoft },
    warn: { fg: c.warn, bg: c.warnSoft },
    danger: { fg: c.danger, bg: c.dangerSoft },
    accent: { fg: c.accent, bg: c.accentSoft },
    violet: { fg: c.violet, bg: c.violetSoft },
    muted: { fg: c.muted, bg: c.surface2 },
  }[tone];
}

export function Badge({ label, tone = 'muted', icon, style }: { label: string; tone?: Tone; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const t = useTone(tone);
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {icon && <Ionicons name={icon} size={12} color={t.fg} />}
      <Text style={{ color: t.fg, fontSize: 11.5, fontFamily: F.heavy }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** Tasdiqlangan profil belgisi — faqat tekshiruvdan keyin beriladi */
export function Verified({ size = 15 }: { size?: number }) {
  const c = useColors();
  return <Ionicons name="checkmark-circle" size={size} color={c.accent} accessibilityLabel="Tasdiqlangan" />;
}

export function Field({ label, hint, error, style, inputStyle, prefix, ...rest }: TextInputProps & { label?: string; hint?: string; error?: string; prefix?: string; inputStyle?: StyleProp<TextStyle> }) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const editable = rest.editable !== false;
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      {label ? <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{label}</Txt> : null}
      <View style={[
        styles.field,
        { backgroundColor: focused ? c.surface : c.surface2, borderColor: error ? c.danger : focused ? c.brand : c.line, opacity: editable ? 1 : 0.7 },
        rest.multiline && { alignItems: 'flex-start', paddingVertical: 12 },
      ]}>
        {prefix ? <Txt v="h3" muted>{prefix}</Txt> : null}
        <TextInput
          placeholderTextColor={c.faint}
          {...rest}
          onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={e => { setFocused(false); rest.onBlur?.(e); }}
          style={[{ flex: 1, minWidth: 0, color: c.text, fontSize: 15.5, fontFamily: F.semi, minHeight: rest.multiline ? 84 : 48, textAlignVertical: rest.multiline ? 'top' : 'center' }, inputStyle]}
        />
      </View>
      {error ? <Txt v="tiny" color={c.danger} style={{ marginLeft: 2 }}>{error}</Txt> : hint ? <Txt v="tiny" faint style={{ marginLeft: 2 }}>{hint}</Txt> : null}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder, onPress, right, autoFocus, style }: {
  value?: string; onChangeText?: (s: string) => void; placeholder: string; onPress?: () => void; right?: ReactNode; autoFocus?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const inner = (
    <>
      <Ionicons name="search" size={20} color={c.muted} />
      {onPress ? (
        <Txt muted style={{ flex: 1 }} numberOfLines={1}>{placeholder}</Txt>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.faint}
          autoFocus={autoFocus}
          returnKeyType="search"
          style={{ flex: 1, minWidth: 0, color: c.text, fontSize: 15.5, fontFamily: F.semi, height: '100%' }}
        />
      )}
      {value && onChangeText ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}><Ionicons name="close-circle" size={19} color={c.faint} /></Pressable>
      ) : null}
      {right}
    </>
  );
  const box = [styles.search, { backgroundColor: c.surface, borderColor: c.line }, shadow(c, 0.15), style];
  if (onPress) return <Pressable onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => [box, { opacity: pressed ? 0.85 : 1 }]}>{inner}</Pressable>;
  return <View style={box}>{inner}</View>;
}

export function Segmented<T extends string>({ items, value, onChange, style }: { items: { id: T; label: string; badge?: number }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.seg, { backgroundColor: c.surface2 }, style]}>
      {items.map(it => {
        const on = it.id === value;
        return (
          <Pressable key={it.id} onPress={() => { haptic.tap(); onChange(it.id); }} style={[styles.segItem, on && [{ backgroundColor: c.surface }, shadow(c, 0.4)]]}>
            <Text style={{ color: on ? c.text : c.muted, fontFamily: F.heavy, fontSize: 13.5 }} numberOfLines={1}>{it.label}</Text>
            {it.badge ? <View style={[styles.segBadge, { backgroundColor: c.danger }]}><Text style={styles.segBadgeText}>{it.badge}</Text></View> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ icon, title, sub, action, onAction }: { icon: IconName; title: string; sub?: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 }}>
      <View style={[styles.emptyIco, { backgroundColor: c.surface2 }]}><Ionicons name={icon} size={34} color={c.muted} /></View>
      <Txt v="h2" style={{ textAlign: 'center', marginTop: 6 }}>{title}</Txt>
      {sub ? <Txt muted style={{ textAlign: 'center', lineHeight: 21 }}>{sub}</Txt> : null}
      {action ? <Button title={action} small onPress={onAction} style={{ marginTop: 10 }} /> : null}
    </View>
  );
}

export function Stat({ value, label, style }: { value: string; label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flex: 1, alignItems: 'center', gap: 1 }, style]}>
      <Txt v="h2">{value}</Txt>
      <Txt v="tiny" faint numberOfLines={1}>{label}</Txt>
    </View>
  );
}

/** Pastdan chiqadigan oyna */
export function Sheet({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={[styles.sheetBg, { backgroundColor: c.overlay }]} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={[styles.grab, { backgroundColor: c.surface3 }]} />
            {title ? (
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="h2" style={{ flex: 1 }}>{title}</Txt>
                <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: c.surface2 }]}><Ionicons name="close" size={18} color={c.text} /></Pressable>
              </Row>
            ) : null}
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12, paddingBottom: 4 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            {footer}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Progress({ value, color, style }: { value: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: 'hidden' }, style]}>
      <View style={{ height: 6, borderRadius: 3, width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color ?? c.brand }} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 56, borderRadius: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
  itemIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  headerLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.m, borderWidth: 1.5, paddingHorizontal: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: radius.m, borderWidth: 1, paddingHorizontal: 14 },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 15, gap: 4 },
  segItem: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 6 },
  segBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  segBadgeText: { color: '#fff', fontSize: 11, fontFamily: F.heavy },
  emptyIco: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sheetBg: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingTop: 10, gap: 14, maxHeight: '92%' },
  grab: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 2 },
  close: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
