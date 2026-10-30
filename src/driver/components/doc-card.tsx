// Hujjat ko'rinishi: haqiqiy hujjat dizayniga o'xshash karta (namuna) yoki yuklangan rasm, va holat belgisi.
// Haydovchi ilovasi ham, admin panel ham ishlatadi — shuning uchun haydovchi holatiga bog'lanmagan.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Row } from '@/components/ui';
import { DOC_META, SAMPLE, type DocKind, type DocStatus, type DriverDoc } from '@/driver/lib/docs';
import type { Driver } from '@/lib/data';
import { F } from '@/lib/theme';
import { tr, tx } from '@/lib/i18n';

/** Kartada ko'rsatiladigan egasi va avtomobil ma'lumotlari */
export type DocOwner = Pick<Driver, 'name'> & Partial<Pick<Driver, 'plate' | 'car' | 'color'>> & { year?: number };

export const STATUS: Record<DocStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  missing: { label: tx('Yuklanmagan'), color: '#8A93A6', bg: 'rgba(138,147,166,0.14)', icon: 'cloud-upload-outline' },
  review: { label: tx('Tekshirilmoqda'), color: '#D97706', bg: 'rgba(217,119,6,0.13)', icon: 'time' },
  approved: { label: tx('Tasdiqlangan'), color: '#12A66A', bg: 'rgba(18,166,106,0.13)', icon: 'checkmark-circle' },
  rejected: { label: tx('Rad etildi'), color: '#E5484D', bg: 'rgba(229,72,77,0.13)', icon: 'close-circle' },
};

export function StatusChip({ status }: { status: DocStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={13} color={s.color} />
      <Text style={[styles.chipText, { color: s.color }]}>{tr(s.label)}</Text>
    </View>
  );
}

const CARD_THEME: Record<DocKind, { colors: [string, string]; ink: string; title: string; sub: string }> = {
  license: { colors: ['#F7D9E3', '#D5E6F7'], ink: '#2B2350', title: 'HAYDOVCHILIK GUVOHNOMASI', sub: 'DRIVING LICENCE' },
  techPassport: { colors: ['#DDF0E1', '#F3F1D9'], ink: '#1E3B2A', title: "TRANSPORT VOSITASI GUVOHNOMASI", sub: 'VEHICLE REGISTRATION CERTIFICATE' },
  taxiLicense: { colors: ['#DCE8FF', '#EEF3FF'], ink: '#14285C', title: 'TAKSI XIZMATI LITSENZIYASI', sub: 'TAXI SERVICE LICENCE' },
  osago: { colors: ['#FFFFFF', '#EAF2FF'], ink: '#0F2A57', title: "OSAGO SUG'URTA POLISI", sub: 'MAJBURIY SUG\'URTA' },
};

/** Hujjatning o'zi — haqiqiy hujjat dizayniga o'xshash, haydovchi ma'lumotlari bilan */
export function DocCard({ doc, profile, side = 'front' }: { doc: DriverDoc; profile: DocOwner; side?: 'front' | 'back' }) {
  const t = CARD_THEME[doc.kind];
  const [surname, ...rest] = profile.name.toUpperCase().split(' ').reverse();
  const given = rest.reverse().join(' ');
  const photo = side === 'front' ? doc.front : doc.back;
  // haydovchi o'zi yuklagan rasm bo'lsa — shu rasm ko'rsatiladi
  if (photo && photo !== SAMPLE) {
    return <Image source={{ uri: photo }} style={styles.card} contentFit="cover" accessibilityLabel={side === 'front' ? tr('{title} — old tomoni', { title: tr(DOC_META[doc.kind].title) }) : tr('{title} — orqa tomoni', { title: tr(DOC_META[doc.kind].title) })} />;
  }
  const f = (n: string, label: string, value?: string, big?: boolean) => (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'baseline' }} key={n}>
      <Text style={[styles.fNum, { color: t.ink }]}>{n}</Text>
      <View style={{ flexShrink: 1 }}>
        <Text style={[styles.fLabel, { color: t.ink }]}>{label}</Text>
        <Text style={[big ? styles.fBig : styles.fVal, { color: t.ink }]} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
  return (
    <LinearGradient colors={t.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.flag}><View style={[styles.flagStripe, { backgroundColor: '#1EB5E8' }]} /><View style={[styles.flagStripe, { backgroundColor: '#fff' }]} /><View style={[styles.flagStripe, { backgroundColor: '#2BB34A' }]} /></View>
      <Row gap={8} style={{ alignItems: 'flex-start' }}>
        <View style={[styles.uz, { borderColor: t.ink }]}><Text style={[styles.uzText, { color: t.ink }]}>{tr('UZ')}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.country, { color: t.ink }]}>O&apos;ZBEKISTON RESPUBLIKASI</Text>
          <Text style={[styles.cardTitle, { color: t.ink }]} numberOfLines={1}>{t.title}</Text>
          <Text style={[styles.cardSub, { color: t.ink }]}>{t.sub}</Text>
        </View>
      </Row>
      {side === 'front' ? (
        <Row gap={10} style={{ alignItems: 'flex-start', marginTop: 8, flex: 1 }}>
          {doc.kind === 'license' && (
            <View style={[styles.photo, { borderColor: t.ink }]}>
              <Text style={[styles.photoText, { color: t.ink }]}>{profile.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 3 }}>
            {doc.kind === 'license' && <>{f('1.', 'Familiya', surname)}{f('2.', 'Ism', given)}<Row gap={14}>{f('4a.', 'Berilgan', doc.issued)}{f('4b.', 'Amal qiladi', doc.expires)}</Row>{f('5.', 'Raqam', doc.number, true)}</>}
            {doc.kind === 'techPassport' && <>{f('A.', 'Davlat raqami', profile.plate, true)}{f('D.1', 'Marka, model', profile.car)}<Row gap={14}>{f('B.', 'Yili', profile.year ? String(profile.year) : undefined)}{f('R.', 'Rangi', profile.color)}</Row>{f('C.1', 'Egasi', profile.name.toUpperCase())}</>}
            {doc.kind === 'taxiLicense' && <>{f('№', 'Litsenziya', doc.number, true)}{f('', 'Litsenziat', profile.name.toUpperCase())}<Row gap={14}>{f('', 'Avtomobil', profile.plate)}{f('', 'Amal qiladi', doc.expires)}</Row></>}
            {doc.kind === 'osago' && <>{f('№', 'Polis', doc.number, true)}{f('', "Sug'urtalangan", profile.name.toUpperCase())}<Row gap={14}>{f('', 'Avtomobil', profile.plate)}{f('', 'Amal qiladi', doc.expires)}</Row></>}
          </View>
        </Row>
      ) : (
        <View style={{ marginTop: 8, flex: 1, gap: 4 }}>
          {doc.kind === 'license' ? (
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {['A', 'B', 'BE', 'C', 'CE', 'D'].map(cat => {
                const on = (doc.categories ?? '').split(/[\s,]+/).includes(cat);
                return (
                  <View key={cat} style={[styles.cat, { borderColor: t.ink, opacity: on ? 1 : 0.3 }]}>
                    <Text style={[styles.catText, { color: t.ink }]}>{cat}</Text>
                    <Text style={[styles.fLabel, { color: t.ink }]}>{on ? doc.issued : '—'}</Text>
                  </View>
                );
              })}
            </Row>
          ) : (
            <>{f('', 'Seriya va raqam', doc.number, true)}{f('', 'Berilgan sana', doc.issued)}</>
          )}
          <Text style={[styles.mrz, { color: t.ink }]} numberOfLines={1}>{`${doc.kind === 'license' ? 'DL' : 'VR'}UZB${doc.number.replace(/\s/g, '')}<<${profile.name.toUpperCase().replace(/\s+/g, '<')}<<<<<<<<`}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  chipText: { fontFamily: F.bold, fontSize: 12 },
  card: { width: '100%', aspectRatio: 1.586, borderRadius: 18, padding: 14, overflow: 'hidden' },
  flag: { position: 'absolute', right: 14, top: 14, width: 28, height: 18, borderRadius: 3, overflow: 'hidden' },
  flagStripe: { flex: 1 },
  uz: { width: 30, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  uzText: { fontFamily: F.heavy, fontSize: 10 },
  country: { fontFamily: F.bold, fontSize: 8.5, letterSpacing: 0.8, opacity: 0.8 },
  cardTitle: { fontFamily: F.heavy, fontSize: 12.5, letterSpacing: 0.3, marginRight: 34 },
  cardSub: { fontFamily: F.semi, fontSize: 8, letterSpacing: 0.6, opacity: 0.65 },
  photo: { width: '26%', aspectRatio: 0.78, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' },
  photoText: { fontFamily: F.heavy, fontSize: 22, opacity: 0.6 },
  fNum: { fontFamily: F.bold, fontSize: 9, opacity: 0.6 },
  fLabel: { fontFamily: F.semi, fontSize: 8, opacity: 0.6 },
  fVal: { fontFamily: F.bold, fontSize: 12 },
  fBig: { fontFamily: F.mono, fontSize: 15, letterSpacing: 1 },
  cat: { width: '30%', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  catText: { fontFamily: F.heavy, fontSize: 13 },
  mrz: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1, opacity: 0.75, marginTop: 'auto' },
});
