// E'lon/loyiha joylashtirish uchun umumiy bloklar: tur plitkalari, 3D ikonkali sohalar qatori,
// «boshlash» banneri va «qanday ishlaydi» qadamlari. Tanlangani sariq ramka va belgi bilan ajralib turadi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PickerSheet } from '@/components/platform-ui';
import { Card, Chip, Txt, alpha } from '@/components/ui';
import type { Choice } from '@/lib/market-forms';
import { sectorOf } from '@/lib/platform';
import { MARKET_KINDS, SECTORS, type MarketKind } from '@/lib/platform-data';
import { SECTOR_ART } from '@/lib/sector-art';
import { haptic, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';
import { flipRTL, tr } from '@/lib/i18n';

const ON_BRAND = '#0E1525';

export const KIND_HINT: Record<MarketKind, () => string> = {
  goods: () => tr('Jismoniy mahsulot'),
  digital: () => tr('Fayl, kurs, dastur'),
  service: () => tr('Ish va konsalting'),
};

/**
 * Uch tur — ustma-ust kartalar: belgi, nom, qisqa izoh va o'ngda tanlov doirasi. Har qanday tilda va katta
 * shriftda ham nom to'liq sig'adi. `nav` — tanlov emas, havola (o'ngda o'q): bo'sh ro'yxatda tez boshlash uchun.
 */
export function KindTiles({ value, onChange, nav }: { value?: MarketKind; onChange: (kind: MarketKind) => void; nav?: boolean }) {
  const { colors: c, dark } = useStore();
  return (
    <View style={styles.kinds} accessibilityRole={nav ? undefined : 'radiogroup'}>
      {MARKET_KINDS.map(k => {
        const on = !nav && k.id === value;
        return (
          <Pressable
            key={k.id}
            accessibilityRole={nav ? 'button' : 'radio'}
            accessibilityState={nav ? undefined : { checked: on }}
            accessibilityLabel={`${k.name}. ${KIND_HINT[k.id]()}`}
            onPress={() => { haptic.tap(); onChange(k.id); }}
            style={({ pressed }) => [
              styles.kind,
              {
                backgroundColor: on ? alpha(c.brand, dark ? 0.12 : 0.16) : pressed ? c.surface2 : c.surface,
                borderColor: on ? c.brand : c.line,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}>
            <View style={[styles.kindIcon, { backgroundColor: on ? c.brand : c.surface2 }]}>
              <Ionicons name={k.icon} size={22} color={on ? ON_BRAND : c.text} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[styles.kindName, { color: c.text }]}>{k.name}</Text>
              <Text style={[styles.kindHint, { color: c.muted }]}>{KIND_HINT[k.id]()}</Text>
            </View>
            {nav ? (
              <Ionicons name="chevron-forward" size={18} color={c.faint} style={flipRTL()} />
            ) : (
              <View style={[styles.radio, { borderColor: on ? c.brand : c.faint, backgroundColor: on ? c.brand : 'transparent' }]}>
                {on && <Ionicons name="checkmark" size={14} color={ON_BRAND} />}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Sohalar qatori: tanlangani boshida turadi (aylantirmasdan ko'rinadi), oxirida «Barchasi» — to'liq ro'yxat */
export function SectorStrip({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { colors: c, dark } = useStore();
  const [all, setAll] = useState(false);
  const [order, setOrder] = useState(() => [value, ...SECTORS.map(s => s.id).filter(id => id !== value)]);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const sec = sectorOf(value);

  const fromList = (id: string) => {
    onChange(id);
    setOrder(o => [id, ...o.filter(x => x !== id)]);
    scroll.current?.scrollTo({ x: 0, animated: true });
  };

  return (
    <View style={{ gap: 12 }}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.sectors}>
        {order.map(id => {
          const s = sectorOf(id);
          const on = id === value;
          const art = SECTOR_ART[id];
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={s.name}
              onPress={() => { haptic.tap(); onChange(id); }}
              style={({ pressed }) => [styles.sector, { opacity: pressed ? 0.75 : 1 }]}>
              <View style={[styles.sectorImg, { backgroundColor: on ? alpha(c.brand, dark ? 0.12 : 0.16) : dark ? c.surface : '#FFFFFF', borderColor: on ? c.brand : c.line }]}>
                {/* recyclingKey: Android tartib o'zgarganda boshqa sohaning rasmini ko'rsatib qo'ymasin */}
                {art ? <Image source={art} recyclingKey={id} style={styles.sectorArt} contentFit="contain" /> : <Ionicons name={s.icon} size={28} color={s.color} />}
                {on && (
                  <View style={[styles.check, { backgroundColor: c.brand, borderColor: c.bg }]}>
                    <Ionicons name="checkmark" size={11} color={ON_BRAND} />
                  </View>
                )}
              </View>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.sectorText, { color: on ? c.text : c.muted, fontFamily: on ? F.bold : F.semi }]}>{s.name}</Text>
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); setAll(true); }} style={({ pressed }) => [styles.sector, { opacity: pressed ? 0.75 : 1 }]}>
          <View style={[styles.sectorImg, { backgroundColor: c.surface2, borderColor: c.line }]}>
            <Ionicons name="apps" size={24} color={c.text} />
          </View>
          <Text numberOfLines={2} style={[styles.sectorText, { color: c.text, fontFamily: F.bold }]}>{tr('Barchasi')}</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.picked, { backgroundColor: c.surface2 }]}>
        <Ionicons name="checkmark-circle" size={20} color={c.brand} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.pickedName, { color: c.text }]}>{sec.name}</Text>
          {sec.examples ? <Text style={[styles.pickedSub, { color: c.muted }]}>{sec.examples}</Text> : null}
        </View>
      </View>

      <PickerSheet
        visible={all}
        onClose={() => setAll(false)}
        title={tr('Soha')}
        selected={[value]}
        onChange={ids => ids[0] && fromList(ids[0])}
        options={SECTORS.map(s => ({ id: s.id, label: s.name, icon: s.icon, art: SECTOR_ART[s.id], sub: s.examples }))}
      />
    </View>
  );
}

/** Sariq banner: kichik sarlavha, nom, izoh, qora «tugma» va o'ngda 3D rasm — butun banner bosiladi */
export function StartHero({ kicker, title, sub, cta, art, onPress }: { kicker: string; title: string; sub: string; cta: string; art?: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <LinearGradient colors={['#FFE27A', '#FFC800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.heroKicker}>{kicker}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroSub}>{sub}</Text>
          <View style={styles.heroCta}>
            <Ionicons name="add" size={16} color="#FFC800" />
            <Text style={styles.heroCtaText}>{cta}</Text>
          </View>
        </View>
        {art ? <Image source={art} style={styles.heroArt} contentFit="contain" /> : null}
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Bitta tanlov: uchtagacha variant — bitta qatorda teng bo'laklar (belgi tepada, nom pastda, sig'masa
 * biroz kichrayadi); ko'proq bo'lsa — qatorga sig'maganda pastga o'tadigan chiplar.
 */
export function OptionRow({ choices, value, onChange }: { choices: Choice[]; value?: string; onChange: (value: string) => void }) {
  const { colors: c } = useStore();
  if (choices.length > 3) {
    return (
      <View style={styles.optionWrap}>
        {choices.map(o => <Chip key={o.value} label={o.label} icon={o.icon} active={o.value === value} onPress={() => onChange(o.value)} />)}
      </View>
    );
  }
  return (
    <View style={styles.options} accessibilityRole="radiogroup">
      {choices.map(o => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            onPress={() => { haptic.tap(); onChange(o.value); }}
            style={({ pressed }) => [styles.option, { backgroundColor: on ? c.ink : c.surface2, borderColor: on ? c.ink : c.line, opacity: pressed ? 0.85 : 1 }]}>
            {o.icon ? <Ionicons name={o.icon} size={19} color={on ? c.bg : c.text} /> : null}
            <Text style={[styles.optionText, { color: on ? c.bg : c.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Raqamlangan qadamlar */
export function HowItWorks({ steps }: { steps: string[] }) {
  const { colors: c } = useStore();
  return (
    <Card style={{ gap: 12 }}>
      <Txt v="h3">{tr('Qanday ishlaydi')}</Txt>
      {steps.map((step, i) => (
        <View key={step} style={styles.step}>
          <View style={[styles.stepNo, { backgroundColor: c.brandSoft }]}>
            <Text style={[styles.stepNoText, { color: c.text }]}>{i + 1}</Text>
          </View>
          <Txt v="small" style={{ flex: 1, fontFamily: F.semi, lineHeight: 19 }}>{step}</Txt>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 18, paddingStart: 18, paddingEnd: 8, borderRadius: radius.l, overflow: 'hidden' },
  heroKicker: { color: 'rgba(14,21,37,0.6)', fontFamily: F.heavy, fontSize: 10.5, letterSpacing: 1.2 },
  heroTitle: { color: ON_BRAND, fontFamily: F.display, fontSize: 19, lineHeight: 23, letterSpacing: -0.3 },
  heroSub: { color: 'rgba(14,21,37,0.72)', fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: ON_BRAND, paddingStart: 10, paddingEnd: 14, height: 34, borderRadius: 17, marginTop: 4 },
  heroCtaText: { color: '#FFFFFF', fontFamily: F.bold, fontSize: 13 },
  heroArt: { width: 96, height: 96 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1 },
  optionText: { fontFamily: F.bold, fontSize: 13.5, lineHeight: 17, textAlign: 'center' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepNo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepNoText: { fontFamily: F.heavy, fontSize: 13 },
  kinds: { gap: 8 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1.5, paddingVertical: 12, paddingStart: 12, paddingEnd: 14 },
  kindIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  kindName: { fontFamily: F.bold, fontSize: 15, lineHeight: 20 },
  kindHint: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 17 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: -5, end: -5, borderWidth: 2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bleed: { marginHorizontal: -16 },
  sectors: { gap: 10, paddingHorizontal: 16, paddingTop: 6 },
  sector: { width: 84, alignItems: 'center', gap: 7 },
  sectorImg: { width: 70, height: 70, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sectorArt: { width: 46, height: 46 },
  sectorText: { fontSize: 11.5, lineHeight: 14, textAlign: 'center' },
  picked: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14 },
  pickedName: { fontFamily: F.bold, fontSize: 14, lineHeight: 19 },
  pickedSub: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 17 },
});
