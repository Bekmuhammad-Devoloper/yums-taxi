// Mutaxassis profili — ID karta / pasport uslubida: rasm, maydonlar, himoya naqshi va MRZ qatori
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { Specialist } from '@/lib/platform-data';
import { countryOf } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

import { SpecialistAvatar } from './platform-ui';
import { BrandMark, Flag, Verified } from './ui';

const ISO3: Record<string, string> = {
  UZ: 'UZB', KZ: 'KAZ', KG: 'KGZ', TJ: 'TJK', TM: 'TKM', TR: 'TUR', GE: 'GEO', AE: 'ARE', SA: 'SAU', CN: 'CHN', KR: 'KOR', JP: 'JPN', IN: 'IND', SG: 'SGP',
  RU: 'RUS', DE: 'DEU', GB: 'GBR', FR: 'FRA', PL: 'POL', NL: 'NLD', EE: 'EST', US: 'USA', CA: 'CAN', BR: 'BRA', NG: 'NGA', KE: 'KEN', EG: 'EGY', AU: 'AUS',
};

// MRZ faqat lotin bosh harflari, raqam va «<» dan iborat
const latin = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ'’`]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '<');
const pad = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);

export function SpecialistIdCard({ sp }: { sp: Specialist }) {
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
  mrzText: { fontFamily: F.mono, fontSize: 14.5, letterSpacing: 1.6 },
});
