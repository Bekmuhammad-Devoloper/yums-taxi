import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdBanner, CompanyCard, SectionArt, SectorGlyph, ProjectCard, ProjectTile, SpecialistMini } from '@/components/platform-ui';
import { Avatar, BrandMark, DEFAULT_AVATAR, Button, IconButton, IconTile, LOGO_EMBLEM, Row, SearchBar, SectionHeader, Txt } from '@/components/ui';
import { TAXI_CARD } from '@/lib/covers';
import { SECTIONS, SECTORS } from '@/lib/platform-data';
import { usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';
import { flipRTL, tr } from '@/lib/i18n';

export default function Home() {
  const { colors: c, user, t } = useStore();
  const p = usePlatform();
  const insets = useSafeAreaInsets();
  const featured = p.publicProjects.filter(x => x.boosted);
  const fresh = [...p.publicProjects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const firstName = (user?.name ?? '').split(' ')[0];
  const sectorName = (s: (typeof SECTORS)[number]) => s.name;
  const stats = [
    [String(p.publicProjects.length * 103 + 4), t('home.statProjects')],
    ['86', t('home.statCountries')],
    [String(SECTORS.length), t('home.statSectors')],
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, gap: 26 }} showsVerticalScrollIndicator={false}>
      {/* Sarlavha: brend chapda, harakatlar o'ngda */}
      <View style={[styles.pad, { gap: 16 }]}>
        <Row>
          <BrandMark size={42} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.brand, { color: c.text }]}>YUMS</Text>
            <Txt v="small" muted numberOfLines={1}>{t('home.hello')}, {firstName}</Txt>
          </View>
          <IconButton name="notifications-outline" badge={p.unreadNotices > 0} size={44} onPress={() => router.push('/notifications')} />
          <Pressable onPress={() => router.push('/profile')} hitSlop={6} accessibilityLabel={t('tab.profile')}>
            <Avatar name={user?.name ?? '?'} size={44} uri={user?.avatar} fallback={DEFAULT_AVATAR} />
          </Pressable>
        </Row>
        <SearchBar placeholder={t('home.search')} onPress={() => router.push('/world')} right={<Ionicons name="options-outline" size={20} color={c.muted} />} />
      </View>

      {/* Asosiy banner */}
      <View style={styles.pad}>
        <LinearGradient colors={['#000000', '#0D0B06', '#231C08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Image source={LOGO_EMBLEM} style={styles.heroMark} contentFit="contain" />
          <Text style={styles.heroKicker}>{t('home.kicker')}</Text>
          <Text style={styles.heroTitle}>{t('home.tagline')}</Text>
          <View style={styles.heroStats}>
            {stats.map(([v, l], i) => (
              <Fragment key={l}>
                {i > 0 && <View style={styles.heroDivider} />}
                <View>
                  <Text style={styles.heroNum}>{v}</Text>
                  <Text style={styles.heroLbl}>{l}</Text>
                </View>
              </Fragment>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Bo'limlar: kartasiz, toza to'r */}
      <View style={[styles.pad, { gap: 14 }]}>
        <SectionHeader title={t('home.sections')} action={t('home.all')} onAction={() => router.push('/about')} />
        <View style={styles.grid}>
          {SECTIONS.map(s => (
            <Pressable
              key={s.id}
              onPress={() => { haptic.tap(); router.push(s.route as never); }}
              style={({ pressed }) => [styles.section, { opacity: pressed ? 0.6 : 1 }]}>
              <SectionArt id={s.id} icon={s.icon} color={s.color} size={54} />
              <Text style={[styles.sectionName, { color: c.text }]} numberOfLines={1}>{s.name}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => { haptic.tap(); router.push('/taxi'); }}
            style={({ pressed }) => [styles.section, { opacity: pressed ? 0.6 : 1 }]}>
            <SectionArt id="taxi" icon="car-sport-outline" color={c.brandDeep} size={54} />
            <Text style={[styles.sectionName, { color: c.text }]}>{tr('TAXI')}</Text>
          </Pressable>
        </View>
      </View>

      {/* YUMS Taxi */}
      <View style={styles.pad}>
        <Pressable onPress={() => { haptic.tap(); router.push('/taxi'); }} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
          <LinearGradient colors={['#FFD84D', '#FFC800', '#F2B100']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.taxi}>
            <Image source={TAXI_CARD} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right" />
            <View style={styles.taxiText}>
              {/* mashina tomidagi «YUMS» belgisi uslubida: qora plashka, oltin harflar */}
              <View style={styles.taxiSign}>
                <Text style={styles.taxiKicker}>YUMS <Text style={{ color: '#FFFFFF' }}>{tr('TAXI')}</Text></Text>
              </View>
              <Text style={styles.taxiTitle} numberOfLines={2}>{t('home.taxiTitle')}</Text>
              <View style={styles.taxiChip}>
                <View style={styles.taxiDot} />
                <Text style={styles.taxiSub} numberOfLines={1}>{t('home.taxiChip')}</Text>
              </View>
            </View>
            <View style={styles.taxiArrow}><Ionicons name="arrow-forward" size={20} color="#FFC800" style={flipRTL()} /></View>
          </LinearGradient>
        </Pressable>
      </View>

      {!p.isVerified && (
        <View style={styles.pad}>
          <Pressable onPress={() => router.push('/verify')} style={({ pressed }) => [styles.verify, { borderColor: c.line, backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 }]}>
            <IconTile name="shield-checkmark-outline" color={c.accent} size={42} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{p.myVerification?.status === 'pending' ? tr("Tasdiqlash ko'rib chiqilmoqda") : t('home.verifyTitle')}</Txt>
              <Txt v="small" muted>{p.myVerification?.status === 'pending' ? tr('Odatda 24 soat ichida') : t('home.verifySub')}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.faint} style={flipRTL()} />
          </Pressable>
        </View>
      )}

      {/* Tavsiya etilgan */}
      {featured.length > 0 && (
        <View style={{ gap: 14 }}>
          <SectionHeader title={t('home.featured')} action={t('home.all')} onAction={() => router.push('/projects')} style={styles.pad} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 2 }}>
            {featured.map(x => <ProjectTile key={x.id} p={x} />)}
          </ScrollView>
        </View>
      )}

      {/* Sohalar */}
      <View style={{ gap: 14 }}>
        <SectionHeader title={t('home.sectors')} action={t('home.all')} onAction={() => router.push('/sectors')} style={styles.pad} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {SECTORS.slice(0, 12).map(s => (
            <Pressable
              key={s.id}
              onPress={() => { haptic.tap(); router.push({ pathname: '/world', params: { sector: s.id } }); }}
              style={({ pressed }) => [styles.sector, { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.7 : 1 }]}>
              <SectorGlyph id={s.id} size={22} />
              <Txt v="small" style={{ fontFamily: F.bold }}>{sectorName(s)}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.pad}><AdBanner /></View>

      {/* Yangi loyihalar */}
      <View style={[styles.pad, { gap: 12 }]}>
        <SectionHeader title={t('home.new')} action={t('home.all')} onAction={() => router.push('/projects')} />
        {fresh.map(x => <ProjectCard key={x.id} p={x} />)}
      </View>

      {/* Mutaxassislar */}
      <View style={{ gap: 14 }}>
        <SectionHeader title={t('home.experts')} action={t('home.all')} onAction={() => router.push('/tech')} style={styles.pad} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 2 }}>
          {p.specialists.filter(x => !p.isBlocked('specialist', x.id)).map(x => <SpecialistMini key={x.id} sp={x} />)}
        </ScrollView>
      </View>

      {/* Kompaniyalar */}
      <View style={[styles.pad, { gap: 12 }]}>
        <SectionHeader title={t('home.companies')} action={t('home.all')} onAction={() => router.push('/business')} />
        {p.companies.filter(x => x.plan === 'business' && !p.isBlocked('company', x.id)).slice(0, 2).map(x => <CompanyCard key={x.id} co={x} />)}
      </View>

      {/* Loyiha yaratish */}
      <View style={styles.pad}>
        <View style={[styles.cta, { backgroundColor: c.surface, borderColor: c.line }]}>
          <IconTile name="rocket-outline" color={c.brandDeep} size={52} />
          <Txt v="h2" style={{ textAlign: 'center', marginTop: 4 }}>{t('home.createTitle')}</Txt>
          <Txt muted style={{ textAlign: 'center', maxWidth: 300 }}>{t('home.createSub')}</Txt>
          <Button title={t('home.createBtn')} icon="add" onPress={() => router.push('/project/edit')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </View>
      </View>

      <Txt v="tiny" faint style={{ textAlign: 'center' }}>{tr("YUMS · 2026 · Barcha e'lonlar moderatsiyadan o'tadi")}</Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  brand: { fontFamily: F.brand, fontSize: 18, letterSpacing: 1.5 },
  hero: { borderRadius: radius.xl, padding: 22, paddingBottom: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,200,0,0.25)' },
  heroMark: { position: 'absolute', right: -40, bottom: -22, width: 210, height: 163, opacity: 0.3 },
  heroKicker: { color: '#FFC800', fontSize: 9.5, fontFamily: F.heavy, letterSpacing: 1.6 },
  heroTitle: { color: '#fff', fontSize: 25, fontFamily: F.display, letterSpacing: -0.8, marginTop: 10, lineHeight: 30, maxWidth: 250 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 },
  heroDivider: { width: StyleSheet.hairlineWidth * 2, height: 28, backgroundColor: 'rgba(255,255,255,0.16)' },
  heroNum: { color: '#fff', fontSize: 20, fontFamily: F.display, letterSpacing: -0.5 },
  heroLbl: { color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontFamily: F.semi, marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  section: { width: '25%', alignItems: 'center', gap: 8 },
  sectionName: { fontSize: 10.5, fontFamily: F.bold, letterSpacing: 0.6 },
  taxi: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: radius.l, overflow: 'hidden', aspectRatio: 3, minHeight: 112 },
  taxiText: { flex: 1, maxWidth: '58%', gap: 7, alignItems: 'flex-start' },
  taxiSign: { backgroundColor: '#0E1525', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  taxiChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(14,21,37,0.12)', paddingHorizontal: 9, height: 24, borderRadius: 12, maxWidth: '100%' },
  taxiKicker: { color: '#FFC800', fontSize: 10, fontFamily: F.brand, letterSpacing: 1.4 },
  taxiTitle: { color: '#0E1525', fontSize: 19, lineHeight: 24, fontFamily: F.brand, letterSpacing: -0.4 },
  taxiDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#12A66A' },
  taxiSub: { flexShrink: 1, color: '#0E1525', fontSize: 12, fontFamily: F.bold },
  taxiArrow: { position: 'absolute', right: 14, bottom: 14, width: 40, height: 40, borderRadius: 14, backgroundColor: '#0E1525', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFC800', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  verify: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  sector: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth },
  cta: { alignItems: 'center', gap: 6, padding: 24, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
});
