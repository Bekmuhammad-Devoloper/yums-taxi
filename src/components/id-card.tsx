// Mutaxassis profili — ID karta / pasport uslubida: rasm, maydonlar, himoya naqshi va MRZ qatori.
// O'lcham haqiqiy ID-karta kabi: ISO/IEC 7810 ID-1 (85,6 × 54 mm, nisbat 1,586 : 1).
// Ichidagi barcha o'lchamlar karta kengligiga qarab mutanosib o'zgaradi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useStartChat } from '@/lib/actions';
import { CARD_BACKS } from '@/lib/card-backs';
import { LANGUAGES, type Specialist } from '@/lib/platform-data';
import { countryOf } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

import { SpecialistAvatar } from './platform-ui';
import { toast } from './toast';
import { BrandMark, Flag, Verified, type IconName } from './ui';

const ISO3: Record<string, string> = {
  UZ: 'UZB', KZ: 'KAZ', KG: 'KGZ', TJ: 'TJK', TM: 'TKM', TR: 'TUR', GE: 'GEO', AE: 'ARE', SA: 'SAU', CN: 'CHN', KR: 'KOR', JP: 'JPN', IN: 'IND', SG: 'SGP',
  RU: 'RUS', DE: 'DEU', GB: 'GBR', FR: 'FRA', PL: 'POL', NL: 'NLD', EE: 'EST', US: 'USA', CA: 'CAN', BR: 'BRA', NG: 'NGA', KE: 'KEN', EG: 'EGY', AU: 'AUS',
};

/** ID-1 karta nisbati (85,6 / 54) */
const ID1 = 85.6 / 54;
/** Dizayn shu kenglik uchun chizilgan; boshqa kengliklarda mutanosib kattalashadi/kichrayadi */
const BASE_W = 340;
/** Juda keng ekranda karta haddan tashqari kattalashmasin */
const MAX_W = 440;
const MRZ_LEN = 30;

// MRZ faqat lotin bosh harflari, raqam va «<» dan iborat
const latin = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ'’`]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '<');
const pad = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);

/** o'lchamni karta kengligiga moslash */
type Scale = (n: number) => number;
const makeScale = (w: number): Scale => n => Math.round(n * (w / BASE_W) * 10) / 10;

/** Karta: bosilganda orqa tomoniga aylanadi. Orqa tomon — portfolio sayti yoki YUMS chat */
export function SpecialistIdCard({ sp }: { sp: Specialist }) {
  const [rot] = useState(() => new Animated.Value(0));
  const [backSide, setBackSide] = useState(false);
  const [w, setW] = useState(BASE_W);
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
  const h = Math.round(w / ID1);
  const z = makeScale(w);
  return (
    <View style={styles.wrap} onLayout={e => { const nw = Math.round(e.nativeEvent.layout.width); if (nw && nw !== w) setW(nw); }}>
      <View style={{ width: '100%', height: h }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.face, { transform: [{ perspective: 1200 }, { rotateY: front }] }]} pointerEvents={backSide ? 'none' : 'auto'}>
          <Pressable onPress={flip} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={tr("Kartaning orqa tomonini ko'rish")}>
            <IdFront sp={sp} w={w} z={z} />
          </Pressable>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.face, { transform: [{ perspective: 1200 }, { rotateY: back }] }]} pointerEvents={backSide ? 'auto' : 'none'}>
          <IdBack sp={sp} onFlip={flip} z={z} />
        </Animated.View>
      </View>
    </View>
  );
}

// Har bir mutaxassisga 5 ta dizayndan bittasi (id bo'yicha doimiy)
// Dizayn: chet eldagilar — «Butun dunyo», vodiy, Samarqand, Buxoro — o'z shahri; qolganlari id bo'yicha doimiy
const VALLEY = /andijon|farg.ona|namangan|qo.qon|marg.ilon|asaka/i;
const backIndex = (sp: Pick<Specialist, 'id' | 'country' | 'city'>) => {
  if (sp.country !== 'UZ') return 9;
  if (VALLEY.test(sp.city)) return 8;
  if (/samarqand/i.test(sp.city)) return 5;
  if (/buxoro/i.test(sp.city)) return 6;
  const rest = [0, 1, 2, 3, 4, 7];
  return rest[[...sp.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % rest.length];
};

const BACK_THEMES: readonly (readonly [string, string, string])[] = [
  ['#0B1530', '#14306E', '#0B1530'],
  ['#1A1206', '#3A2A08', '#120C03'],
  ['#062A2A', '#0B4F4A', '#041A1A'],
  ['#160B2E', '#3B1A6E', '#0E0720'],
  ['#0A1A12', '#11402B', '#06110B'],
];

function CardArt({ sp }: { sp: Specialist }) {
  const i = backIndex(sp);
  const art = CARD_BACKS[i];
  return art
    ? <Image source={art} style={StyleSheet.absoluteFill} contentFit="cover" />
    : <LinearGradient colors={BACK_THEMES[i % BACK_THEMES.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />;
}

function IdBack({ sp, onFlip, z }: { sp: Specialist; onFlip: () => void; z: Scale }) {
  const start = useStartChat();
  const site = sp.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const num = 'YM' + sp.id.replace(/\D/g, '').padStart(7, '0');
  const bars = [...(num + sp.name)].map(ch => 1 + (ch.charCodeAt(0) % 4));
  const langs = sp.languages.map(l => LANGUAGES.find(x => x.id === l)?.name ?? l).join(', ');
  const chat = () => { haptic.tap(); start({ peerId: sp.id, peerName: sp.name, peerKind: 'specialist', peerVerified: sp.verified }, { subject: tr('YUMS ID orqali murojaat') }); };
  const go = () => {
    if (!sp.website) return chat();
    haptic.tap();
    Linking.openURL(sp.website).catch(() => toast(tr("Saytni ochib bo'lmadi"), 'alert-circle'));
  };
  const btn = z(30);
  return (
    <View style={[styles.cardBox, { borderRadius: z(16), padding: z(12), justifyContent: 'space-between' }]}>
      <CardArt sp={sp} />
      <LinearGradient colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.2)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.row, { gap: z(7) }]}>
        <BrandMark size={z(20)} style={{ borderRadius: z(6) }} />
        <Text style={[styles.backBrand, { fontSize: z(11.5) }]}>YUMS <Text style={{ color: '#FFC800' }}>ID</Text></Text>
        <Pressable onPress={onFlip} hitSlop={10} style={[styles.round, { width: z(28), height: z(28), borderRadius: z(14) }]} accessibilityLabel={tr('Old tomoniga qaytish')}>
          <Ionicons name="sync-outline" size={z(14)} color="#fff" />
        </Pressable>
      </View>
      <View style={{ gap: z(5) }}>
        <View>
          <Text style={[styles.backKicker, { fontSize: z(8.5) }]} numberOfLines={1}>{sp.website ? tr('PORTFOLIO · {site}', { site }) : tr('YUMS CHAT ORQALI ALOQA')}</Text>
          <Text style={[styles.backTitle, { fontSize: z(18) }]} numberOfLines={1}>{sp.name}</Text>
        </View>
        <View style={[styles.row, { gap: z(5), flexWrap: 'wrap' }]}>
          <Stat z={z} icon="star" tint="#FFC800" text={`${sp.rating.toFixed(1)} (${sp.reviews})`} />
          <Stat z={z} icon="cash-outline" text={tr('${rate}/soat', { rate: sp.rate })} />
          <Stat z={z} icon="ribbon-outline" text={tr('{experience} yil', { experience: sp.experience })} />
          {sp.remote && <Stat z={z} icon="globe-outline" text={tr('Masofaviy')} />}
        </View>
        <View style={[styles.row, { gap: z(4), overflow: 'hidden' }]}>
          {sp.skills.slice(0, 4).map(k => (
            <View key={k} style={[styles.skill, { height: z(19), paddingHorizontal: z(7), borderRadius: z(6) }]}>
              <Text style={[styles.skillText, { fontSize: z(10) }]} numberOfLines={1}>{k}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.backSub, { fontSize: z(10.5) }]} numberOfLines={1}>
          <Ionicons name="language-outline" size={z(11)} color="rgba(255,255,255,0.8)" /> {langs}  ·  {sp.available ? tr("Hozir bo'sh — buyurtma qabul qiladi") : tr('Hozir band')}
        </Text>
      </View>
      <View style={[styles.row, { gap: z(7) }]}>
        <Pressable onPress={go} style={({ pressed }) => [styles.backCta, { height: btn, paddingHorizontal: z(12), borderRadius: btn / 2, opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name={sp.website ? 'open-outline' : 'chatbubble-ellipses'} size={z(14)} color="#0E1525" />
          <Text style={[styles.backCtaText, { fontSize: z(12) }]}>{sp.website ? tr('Saytni ochish') : tr('Chatda yozish')}</Text>
        </Pressable>
        {sp.website ? (
          <Pressable onPress={chat} style={({ pressed }) => [styles.round, { width: btn, height: btn, borderRadius: btn / 2, opacity: pressed ? 0.7 : 1 }]} accessibilityLabel={tr('YUMS chatda yozish')}>
            <Ionicons name="chatbubble-ellipses-outline" size={z(14)} color="#fff" />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'flex-end', gap: z(2) }}>
          <View style={[styles.barcode, { height: z(16) }]}>
            {bars.map((bw, k) => <View key={k} style={{ width: bw, height: k % 3 ? z(16) : z(12), backgroundColor: 'rgba(255,255,255,0.85)' }} />)}
          </View>
          <Text style={[styles.backNum, { fontSize: z(9) }]}>№ {num}</Text>
        </View>
      </View>
    </View>
  );
}

function Stat({ icon, text, tint, z }: { icon: IconName; text: string; tint?: string; z: Scale }) {
  return (
    <View style={[styles.stat, { height: z(21), paddingHorizontal: z(7), borderRadius: z(11) }]}>
      <Ionicons name={icon} size={z(11)} color={tint ?? 'rgba(255,255,255,0.85)'} />
      <Text style={[styles.statText, { fontSize: z(10.5) }]}>{text}</Text>
    </View>
  );
}

function IdFront({ sp, w, z }: { sp: Specialist; w: number; z: Scale }) {
  const { colors: c } = useStore();
  const k = countryOf(sp.country);
  const words = sp.name.trim().split(/\s+/);
  const surname = words.length > 1 ? words[words.length - 1] : words[0];
  const given = words.length > 1 ? words.slice(0, -1).join(' ') : '';
  const iso = ISO3[sp.country] ?? sp.country + 'X';
  const num = 'YM' + sp.id.replace(/\D/g, '').padStart(7, '0');
  const mrz1 = pad(`ID${iso}${latin(surname)}<<${latin(given)}`, MRZ_LEN);
  const mrz2 = pad(`${num}<${iso}<<${String(sp.experience).padStart(2, '0')}Y<<${sp.verified ? 'VERIFIED' : ''}`, MRZ_LEN);
  const t = { ink: '#FFFFFF', label: 'rgba(255,255,255,0.62)', line: 'rgba(255,214,90,0.14)' };

  // MRZ shrifti kenglikdan hisoblanadi: 30 belgi aylantirish tugmasigacha to'liq sig'adi (kesilmaydi)
  const padX = z(12);
  const hint = z(24);
  const mrzSize = Math.min(z(13), Math.floor(((w - padX * 2 - hint - z(8)) / MRZ_LEN - 0.8) / 0.6 * 10) / 10);
  const photoW = z(74);

  return (
    <View style={[styles.cardBox, { borderRadius: z(16) }]}>
      <CardArt sp={sp} />
      <LinearGradient colors={['rgba(0,0,0,0.64)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      {/* Himoya naqshi (gilosh) */}
      <View pointerEvents="none" style={[styles.rosette, { right: -z(70), top: z(10), width: z(240), height: z(240) }]}>
        {Array.from({ length: 14 }, (_, i) => (
          <View key={i} style={[styles.petal, { width: z(230), height: z(88), borderRadius: z(115), borderColor: t.line, transform: [{ rotate: `${i * 13}deg` }] }]} />
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: padX, paddingTop: z(11), gap: z(8) }}>
        {/* Sarlavha */}
        <View style={[styles.row, { gap: z(7) }]}>
          <BrandMark size={z(20)} style={{ borderRadius: z(6) }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.brand, { color: t.ink, fontSize: z(11.5) }]}>YUMS <Text style={{ color: '#E0A800' }}>ID</Text></Text>
            <Text style={[styles.headSub, { color: t.label, fontSize: Math.max(6.5, z(6.8)) }]} numberOfLines={1}>{tr('MUTAXASSIS GUVOHNOMASI')}</Text>
          </View>
          {sp.verified && (
            <View style={[styles.seal, { paddingHorizontal: z(5), paddingVertical: z(2), borderRadius: z(6) }]}>
              <Ionicons name="shield-checkmark" size={z(10)} color="#0095F6" />
              <Text style={[styles.sealText, { fontSize: Math.max(6.5, z(7)) }]}>{tr('TASDIQLANGAN')}</Text>
            </View>
          )}
          <Flag code={k.code} size={z(18)} />
        </View>

        {/* Asosiy qism: tik rasm (3:4) va maydonlar */}
        <View style={[styles.row, { flex: 1, gap: z(11), alignItems: 'flex-start' }]}>
          <View>
            <View style={[styles.photo, { width: photoW, height: Math.round(photoW * 4 / 3), borderRadius: z(10) }]}>
              <SpecialistAvatar sp={sp} size={Math.round(photoW * 4 / 3)} />
            </View>
            <LinearGradient colors={['rgba(255,120,200,0.55)', 'rgba(120,200,255,0.55)', 'rgba(255,230,120,0.55)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.holo, { left: -z(5), bottom: z(12), width: z(22), height: z(22), borderRadius: z(11) }]} />
            <View style={[styles.status, { backgroundColor: sp.available ? c.ok : c.faint, bottom: -z(6), marginHorizontal: z(10), borderRadius: z(6) }]}>
              <Text style={[styles.statusText, { fontSize: Math.max(6.5, z(7.5)) }]}>{sp.available ? tr("BO'SH") : 'BAND'}</Text>
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: z(4) }}>
            <Field z={z} label={tr('FAMILIYA / SURNAME')} value={surname.toUpperCase()} ink={t.ink} labelColor={t.label} big verified={sp.verified} />
            {given ? <Field z={z} label={tr('ISM / GIVEN NAME')} value={given.toUpperCase()} ink={t.ink} labelColor={t.label} big /> : null}
            <Field z={z} label={tr('KASB / PROFESSION')} value={sp.title} ink={t.ink} labelColor={t.label} />
            <View style={[styles.row, { gap: z(12), alignItems: 'flex-start' }]}>
              <Field z={z} label={tr('MAMLAKAT')} value={`${iso} · ${sp.city}`} ink={t.ink} labelColor={t.label} />
              <Field z={z} label={tr('TAJRIBA')} value={tr('{experience} yil', { experience: sp.experience })} ink={t.ink} labelColor={t.label} />
            </View>
          </View>
        </View>
      </View>

      {/* MRZ */}
      <View style={[styles.mrz, { paddingHorizontal: padX, paddingVertical: z(6) }]}>
        <Text style={[styles.mrzText, { color: t.ink, fontSize: mrzSize, lineHeight: Math.round(mrzSize * 1.3) }]} numberOfLines={1}>{mrz1}</Text>
        <Text style={[styles.mrzText, { color: t.ink, fontSize: mrzSize, lineHeight: Math.round(mrzSize * 1.3) }]} numberOfLines={1}>{mrz2}</Text>
        <View style={[styles.round, { position: 'absolute', right: z(9), top: '50%', marginTop: -hint / 2, width: hint, height: hint, borderRadius: hint / 2 }]}>
          <Ionicons name="sync-outline" size={z(12)} color={t.ink} />
        </View>
      </View>
    </View>
  );
}

function Field({ label, value, ink, labelColor, big, verified, z }: { label: string; value: string; ink: string; labelColor: string; big?: boolean; verified?: boolean; z: Scale }) {
  return (
    <View style={{ flexShrink: 1, minWidth: 0 }}>
      <Text style={[styles.label, { color: labelColor, fontSize: Math.max(6.5, z(6.8)) }]} numberOfLines={1}>{label}</Text>
      <View style={[styles.row, { gap: z(4) }]}>
        <Text style={[big ? styles.valueBig : styles.value, { color: ink, fontSize: big ? z(14) : z(11) }]} numberOfLines={1}>{value}</Text>
        {verified && <Verified size={z(13)} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  face: { backfaceVisibility: 'hidden' },
  cardBox: { flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(229,193,88,0.3)', boxShadow: '0 14px 34px rgba(0,0,0,0.28)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  round: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  rosette: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  petal: { position: 'absolute', borderWidth: 1 },
  brand: { fontFamily: F.brand, letterSpacing: 0.6 },
  headSub: { fontFamily: F.bold, letterSpacing: 0.8, marginTop: 1 },
  photo: { overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  holo: { position: 'absolute', opacity: 0.8 },
  status: { position: 'absolute', left: 0, right: 0, paddingVertical: 2, alignItems: 'center' },
  statusText: { color: '#fff', fontFamily: F.heavy, letterSpacing: 1 },
  label: { fontFamily: F.bold, letterSpacing: 0.8 },
  valueBig: { fontFamily: F.heavy, letterSpacing: 0.3, flexShrink: 1 },
  value: { fontFamily: F.semi, flexShrink: 1 },
  seal: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1.2, borderColor: '#0095F6', transform: [{ rotate: '-6deg' }] },
  sealText: { color: '#0095F6', fontFamily: F.heavy, letterSpacing: 0.8 },
  mrz: { backgroundColor: 'rgba(0,0,0,0.4)', gap: 0 },
  mrzText: { fontFamily: F.mono, letterSpacing: 0.8 },
  // orqa tomon
  backBrand: { color: '#fff', fontFamily: F.brand, letterSpacing: 0.6, flex: 1 },
  backKicker: { color: 'rgba(255,255,255,0.75)', fontFamily: F.heavy, letterSpacing: 1.4 },
  backTitle: { color: '#fff', fontFamily: F.display, letterSpacing: -0.4 },
  backSub: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.14)' },
  statText: { color: '#fff', fontFamily: F.bold },
  skill: { borderWidth: 1, borderColor: 'rgba(255,214,90,0.5)', justifyContent: 'center', flexShrink: 1 },
  skillText: { color: '#FFD54A', fontFamily: F.semi },
  backCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFC800' },
  backCtaText: { color: '#0E1525', fontFamily: F.bold },
  barcode: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5 },
  backNum: { color: 'rgba(255,255,255,0.7)', fontFamily: F.mono, letterSpacing: 1.2 },
});
