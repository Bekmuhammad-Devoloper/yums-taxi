// Mutaxassis profili — ID karta / pasport uslubida: rasm, maydonlar, himoya naqshi va MRZ qatori
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useStartChat } from '@/lib/actions';
import { CARD_BACKS } from '@/lib/card-backs';
import type { Specialist } from '@/lib/platform-data';
import { countryOf } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import { SpecialistAvatar } from './platform-ui';
import { toast } from './toast';
import { BrandMark, Flag, Verified } from './ui';

const ISO3: Record<string, string> = {
  UZ: 'UZB', KZ: 'KAZ', KG: 'KGZ', TJ: 'TJK', TM: 'TKM', TR: 'TUR', GE: 'GEO', AE: 'ARE', SA: 'SAU', CN: 'CHN', KR: 'KOR', JP: 'JPN', IN: 'IND', SG: 'SGP',
  RU: 'RUS', DE: 'DEU', GB: 'GBR', FR: 'FRA', PL: 'POL', NL: 'NLD', EE: 'EST', US: 'USA', CA: 'CAN', BR: 'BRA', NG: 'NGA', KE: 'KEN', EG: 'EGY', AU: 'AUS',
};

// MRZ faqat lotin bosh harflari, raqam va «<» dan iborat
const latin = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ'’`]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '<');
const pad = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);

/** Karta: bosilganda orqa tomoniga aylanadi. Orqa tomon — portfolio sayti yoki YUMS chat */
export function SpecialistIdCard({ sp }: { sp: Specialist }) {
  const [rot] = useState(() => new Animated.Value(0));
  const [backSide, setBackSide] = useState(false);
  const busy = useRef(false);
  const flip = () => {
    if (busy.current) return;
    busy.current = true;
    haptic.tap();
    const to = backSide ? 0 : 1;
    setBackSide(!backSide);
    Animated.timing(rot, { toValue: to, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(() => { busy.current = false; });
  };
  // Ochilganda karta bir marta biroz buriladi — orqa tomoni borligini ko'rsatish uchun
  useEffect(() => {
    const peek = Animated.sequence([
      Animated.delay(700),
      Animated.timing(rot, { toValue: 0.12, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(rot, { toValue: 0, friction: 4, useNativeDriver: Platform.OS !== 'web' }),
    ]);
    peek.start();
    return () => peek.stop();
  }, [rot]);
  const front = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const back = rot.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  return (
    <View>
      <View>
      <Animated.View style={[styles.face, { transform: [{ perspective: 1200 }, { rotateY: front }] }]} pointerEvents={backSide ? 'none' : 'auto'}>
        <Pressable onPress={flip} accessibilityRole="button" accessibilityLabel="Kartaning orqa tomonini ko'rish">
          <IdFront sp={sp} />
        </Pressable>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.face, { transform: [{ perspective: 1200 }, { rotateY: back }] }]} pointerEvents={backSide ? 'auto' : 'none'}>
        <IdBack sp={sp} onFlip={flip} />
      </Animated.View>
      </View>
      <Pressable onPress={flip} hitSlop={6} style={({ pressed }) => [styles.flipBtn, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
        <Ionicons name="sync-outline" size={15} color="#E0A800" />
        <Text style={styles.flipBtnText}>{backSide ? 'Old tomoni' : sp.website ? 'Orqa tomoni · portfolio' : 'Orqa tomoni · aloqa'}</Text>
      </Pressable>
    </View>
  );
}

// Har bir mutaxassisga 5 ta dizayndan bittasi (id bo'yicha doimiy)
const backIndex = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 5;

const BACK_THEMES: readonly (readonly [string, string, string])[] = [
  ['#0B1530', '#14306E', '#0B1530'],
  ['#1A1206', '#3A2A08', '#120C03'],
  ['#062A2A', '#0B4F4A', '#041A1A'],
  ['#160B2E', '#3B1A6E', '#0E0720'],
  ['#0A1A12', '#11402B', '#06110B'],
];

function IdBack({ sp, onFlip }: { sp: Specialist; onFlip: () => void }) {
  const start = useStartChat();
  const i = backIndex(sp.id);
  const art = CARD_BACKS[i];
  const site = sp.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const num = 'YM' + sp.id.replace(/\D/g, '').padStart(7, '0');
  const bars = [...(num + sp.name)].map(ch => 1 + (ch.charCodeAt(0) % 4));
  const go = () => {
    haptic.tap();
    if (sp.website) Linking.openURL(sp.website).catch(() => toast("Saytni ochib bo'lmadi", 'alert-circle'));
    else start({ peerId: sp.id, peerName: sp.name, peerKind: 'specialist', peerVerified: sp.verified }, { subject: 'YUMS ID orqali murojaat' });
  };
  return (
    <Pressable onPress={go} style={styles.back} accessibilityRole="button" accessibilityLabel={sp.website ? `Portfolio saytini ochish: ${site}` : 'YUMS chatda yozish'}>
      {art ? <Image source={art} style={StyleSheet.absoluteFill} contentFit="cover" /> : <LinearGradient colors={BACK_THEMES[i]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
      <View style={styles.backTop}>
        <BrandMark size={22} style={{ borderRadius: 6 }} />
        <Text style={styles.backBrand}>YUMS <Text style={{ color: '#FFC800' }}>ID</Text></Text>
        <Pressable onPress={onFlip} hitSlop={10} style={styles.backFlip} accessibilityLabel="Old tomoniga qaytish">
          <Ionicons name="sync-outline" size={16} color="#fff" />
        </Pressable>
      </View>
      <View>
        <Text style={styles.backKicker}>{sp.website ? 'PORTFOLIO' : 'YUMS CHAT'}</Text>
        <Text style={styles.backTitle} numberOfLines={1}>{sp.website ? site : sp.name}</Text>
        <Text style={styles.backSub} numberOfLines={1}>{sp.website ? 'Ishlari, keyslari va aloqa ma\'lumotlari' : "Sayti yo'q — to'g'ridan-to'g'ri yozing"}</Text>
        <View style={styles.backCta}>
          <Ionicons name={sp.website ? 'open-outline' : 'chatbubble-ellipses'} size={15} color="#0E1525" />
          <Text style={styles.backCtaText}>{sp.website ? 'Saytni ochish' : 'Chatda yozish'}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={styles.backNum}>№ {num}</Text>
        <View style={styles.barcode}>
          {bars.map((w, k) => <View key={k} style={{ width: w, height: k % 3 ? 26 : 20, backgroundColor: 'rgba(255,255,255,0.85)' }} />)}
        </View>
      </View>
    </Pressable>
  );
}

function IdFront({ sp }: { sp: Specialist }) {
  const { colors: c, dark } = useStore();
  const k = countryOf(sp.country);
  const words = sp.name.trim().split(/\s+/);
  const surname = words.length > 1 ? words[words.length - 1] : words[0];
  const given = words.length > 1 ? words.slice(0, -1).join(' ') : '';
  const iso = ISO3[sp.country] ?? sp.country + 'X';
  const num = 'YM' + sp.id.replace(/\D/g, '').padStart(7, '0');
  const mrz1 = pad(`ID${iso}${latin(surname)}<<${latin(given)}`, 30);
  const mrz2 = pad(`${num}<${iso}<<${String(sp.experience).padStart(2, '0')}Y<<${sp.verified ? 'VERIFIED' : ''}`, 30);

  const t = dark
    ? { bg: ['#1C2537', '#121926', '#1A2740'] as const, ink: '#EEF1F7', label: '#8E99B3', line: 'rgba(229,193,88,0.16)', mrz: 'rgba(255,255,255,0.05)' }
    : { bg: ['#FFF8E1', '#FFFFFF', '#EAF1FF'] as const, ink: '#14213D', label: '#6B7690', line: 'rgba(184,138,0,0.17)', mrz: 'rgba(20,33,61,0.05)' };

  return (
    <View style={[styles.card, { borderColor: dark ? 'rgba(229,193,88,0.28)' : 'rgba(184,138,0,0.25)' }]}>
      <LinearGradient colors={t.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Himoya naqshi (gilosh) */}
      <View pointerEvents="none" style={styles.rosette}>
        {Array.from({ length: 14 }, (_, i) => (
          <View key={i} style={[styles.petal, { borderColor: t.line, transform: [{ rotate: `${i * 13}deg` }] }]} />
        ))}
      </View>

      {/* Sarlavha */}
      <View style={styles.head}>
        <BrandMark size={24} style={{ borderRadius: 7 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.brand, { color: t.ink }]}>YUMS <Text style={{ color: '#E0A800' }}>ID</Text></Text>
          <Text style={[styles.headSub, { color: t.label }]}>MUTAXASSIS GUVOHNOMASI</Text>
        </View>
        {sp.verified && (
          <View style={styles.seal}>
            <Ionicons name="shield-checkmark" size={12} color="#0095F6" />
            <Text style={styles.sealText}>TASDIQLANGAN</Text>
          </View>
        )}
        <Flag code={k.code} size={22} />
      </View>

      {/* Asosiy qism */}
      <View style={styles.body}>
        <View>
          <View style={[styles.photo, { borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(20,33,61,0.1)' }]}>
            <SpecialistAvatar sp={sp} size={96} />
          </View>
          <LinearGradient colors={['rgba(255,120,200,0.55)', 'rgba(120,200,255,0.55)', 'rgba(255,230,120,0.55)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.holo} />
          <View style={[styles.status, { backgroundColor: sp.available ? c.ok : c.faint }]}>
            <Text style={styles.statusText}>{sp.available ? "BO'SH" : 'BAND'}</Text>
          </View>
        </View>

        <View style={{ flex: 1, gap: 7 }}>
          <Field label="FAMILIYA / SURNAME" value={surname.toUpperCase()} ink={t.ink} labelColor={t.label} big verified={sp.verified} />
          {given ? <Field label="ISM / GIVEN NAME" value={given.toUpperCase()} ink={t.ink} labelColor={t.label} big /> : null}
          <Field label="KASB / PROFESSION" value={sp.title} ink={t.ink} labelColor={t.label} />
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Field label="MAMLAKAT" value={`${iso} · ${sp.city}`} ink={t.ink} labelColor={t.label} />
            <Field label="TAJRIBA" value={`${sp.experience} yil`} ink={t.ink} labelColor={t.label} />
          </View>
        </View>
      </View>

      {/* MRZ */}
      <View style={[styles.mrz, { backgroundColor: t.mrz }]}>
        <Text style={[styles.mrzText, { color: t.ink }]} numberOfLines={1} adjustsFontSizeToFit>{mrz1}</Text>
        <Text style={[styles.mrzText, { color: t.ink }]} numberOfLines={1} adjustsFontSizeToFit>{mrz2}</Text>
        <View style={[styles.flipHint, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(20,33,61,0.08)' }]}>
          <Ionicons name="sync-outline" size={13} color={t.ink} />
        </View>
      </View>
    </View>
  );
}

function Field({ label, value, ink, labelColor, big, verified }: { label: string; value: string; ink: string; labelColor: string; big?: boolean; verified?: boolean }) {
  return (
    <View style={{ flexShrink: 1 }}>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={[big ? styles.valueBig : styles.value, { color: ink }]} numberOfLines={big ? 1 : 2}>{value}</Text>
        {verified && <Verified size={15} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { backfaceVisibility: 'hidden' },
  flipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 10, paddingHorizontal: 12, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(224,168,0,0.45)', backgroundColor: 'rgba(255,200,0,0.1)' },
  flipBtnText: { color: '#E0A800', fontFamily: F.bold, fontSize: 12.5 },
  card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, padding: 14, paddingBottom: 0, gap: 12 },
  rosette: { position: 'absolute', right: -70, top: 18, width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  petal: { position: 'absolute', width: 250, height: 96, borderRadius: 125, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brand: { fontFamily: F.brand, fontSize: 13, letterSpacing: 0.6 },
  headSub: { fontFamily: F.bold, fontSize: 8.5, letterSpacing: 0.9, marginTop: 1 },
  body: { flexDirection: 'row', gap: 14 },
  photo: { borderRadius: 40, borderWidth: 1, overflow: 'hidden' },
  holo: { position: 'absolute', left: -6, bottom: 14, width: 28, height: 28, borderRadius: 14, opacity: 0.8 },
  status: { position: 'absolute', left: 0, right: 0, bottom: -8, alignSelf: 'center', marginHorizontal: 18, borderRadius: 8, paddingVertical: 2, alignItems: 'center' },
  statusText: { color: '#fff', fontFamily: F.heavy, fontSize: 9.5, letterSpacing: 1 },
  label: { fontFamily: F.bold, fontSize: 8, letterSpacing: 0.9 },
  valueBig: { fontFamily: F.heavy, fontSize: 16, letterSpacing: 0.3, flexShrink: 1 },
  value: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 16, flexShrink: 1 },
  seal: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1.2, borderColor: '#0095F6', borderRadius: 7, paddingHorizontal: 5, paddingVertical: 2, transform: [{ rotate: '-6deg' }] },
  sealText: { color: '#0095F6', fontFamily: F.heavy, fontSize: 8, letterSpacing: 0.8 },
  mrz: { marginHorizontal: -14, paddingHorizontal: 14, paddingVertical: 8, gap: 1 },
  mrzText: { fontFamily: F.mono, fontSize: 14.5, letterSpacing: 1.6, paddingRight: 30 },
  flipHint: { position: 'absolute', right: 10, top: 12, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  // orqa tomon
  back: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(229,193,88,0.3)', padding: 14, justifyContent: 'space-between' },
  backTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBrand: { color: '#fff', fontFamily: F.brand, fontSize: 12, letterSpacing: 0.6, flex: 1 },
  backFlip: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  backKicker: { color: 'rgba(255,255,255,0.75)', fontFamily: F.heavy, fontSize: 10, letterSpacing: 1.6 },
  backTitle: { color: '#fff', fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 },
  backSub: { color: 'rgba(255,255,255,0.8)', fontFamily: F.semi, fontSize: 12.5 },
  backCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#FFC800', height: 34, paddingHorizontal: 14, borderRadius: 17, marginTop: 8 },
  backCtaText: { color: '#0E1525', fontFamily: F.bold, fontSize: 13 },
  barcode: { flexDirection: 'row', alignItems: 'flex-end', height: 26, gap: 1.5 },
  backNum: { color: 'rgba(255,255,255,0.7)', fontFamily: F.mono, fontSize: 12, letterSpacing: 1.4 },
});
