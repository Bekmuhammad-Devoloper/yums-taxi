import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdBanner, CompanyCard, ProjectCard, ProjectTile, SpecialistMini } from '@/components/platform-ui';
import { Avatar, BrandMark, Button, LOGO_EMBLEM, IconButton, IconTile, Row, SearchBar, SectionHeader, Txt } from '@/components/ui';
import { SECTIONS, SECTORS } from '@/lib/platform-data';
import { usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { radius, shadow } from '@/lib/theme';

export default function Home() {
  const { colors: c, user, t, lang } = useStore();
  const p = usePlatform();
  const insets = useSafeAreaInsets();
  const featured = p.publicProjects.filter(x => x.boosted);
  const fresh = [...p.publicProjects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const firstName = (user?.name ?? '').split(' ')[0];
  const sectorName = (s: (typeof SECTORS)[number]) => (lang === 'ru' ? s.ru : lang === 'en' ? s.en : s.name);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 28, gap: 18 }} showsVerticalScrollIndicator={false}>
      {/* Sarlavha */}
      <Row style={styles.pad}>
        <Pressable onPress={() => router.push('/profile')} hitSlop={6}>
          <Avatar name={user?.name ?? '?'} size={46} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt v="small" muted>{t('home.hello')}, {firstName} 👋</Txt>
          <Row gap={6}>
            <BrandMark size={24} />
            <Txt v="h2" style={{ letterSpacing: 0.5 }}>YUMS</Txt>
          </Row>
        </View>
        <IconButton name="notifications-outline" badge={p.unreadNotices > 0} onPress={() => router.push('/notifications')} />
      </Row>

      <View style={[styles.pad, { gap: 12 }]}>
        <SearchBar placeholder={t('home.search')} onPress={() => router.push('/world')} right={<Ionicons name="options-outline" size={20} color={c.muted} />} />
      </View>

      {/* Asosiy banner */}
      <View style={styles.pad}>
        <LinearGradient colors={['#000000', '#120F07', '#2A2108']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { borderColor: 'rgba(255,200,0,0.22)' }]}>
          <Image source={LOGO_EMBLEM} style={styles.heroMark} contentFit="contain" />
          <Text style={styles.heroKicker}>{t('home.kicker')}</Text>
          <Text style={styles.heroTitle}>{t('home.tagline')}</Text>
          <Row gap={18} style={{ marginTop: 14 }}>
            {[[String(p.publicProjects.length * 103 + 4), t('home.statProjects')], ['86', t('home.statCountries')], [String(SECTORS.length), t('home.statSectors')]].map(([v, l]) => (
              <View key={l}>
                <Text style={styles.heroNum}>{v}</Text>
                <Text style={styles.heroLbl}>{l}</Text>
              </View>
            ))}
          </Row>
        </LinearGradient>
      </View>

      {/* 7 bo'lim */}
      <View style={[styles.pad, { gap: 10 }]}>
        <SectionHeader title={t('home.sections')} action={t('home.all')} onAction={() => router.push('/about')} />
        <View style={styles.grid}>
          {SECTIONS.map(s => (
            <Pressable
              key={s.id}
              onPress={() => { haptic.tap(); router.push(s.route as never); }}
              style={({ pressed }) => [styles.section, { backgroundColor: c.surface, borderColor: c.line, transform: [{ scale: pressed ? 0.96 : 1 }] }, shadow(c, 0.15)]}>
              <IconTile name={s.icon} color={s.color} size={46} />
              <Text style={[styles.sectionName, { color: c.text }]} numberOfLines={1}>{s.name}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => { haptic.tap(); router.push('/taxi'); }}
            style={({ pressed }) => [styles.section, { backgroundColor: c.surface, borderColor: c.line, transform: [{ scale: pressed ? 0.96 : 1 }] }, shadow(c, 0.15)]}>
            <IconTile name="car-sport-outline" color={c.brandDeep} size={46} />
            <Text style={[styles.sectionName, { color: c.text }]}>TAXI</Text>
          </Pressable>
        </View>
      </View>

      {/* Xizmat: taksi */}
      <View style={styles.pad}>
        <Pressable onPress={() => { haptic.tap(); router.push('/taxi'); }} style={({ pressed }) => [styles.taxi, { backgroundColor: c.brand, opacity: pressed ? 0.92 : 1 }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.taxiKicker}>YUMS TAXI</Text>
            <Text style={styles.taxiTitle}>{t('home.taxiTitle')}</Text>
            <Text style={styles.taxiSub}>{t('sec.taxi')} · {t('home.taxiEta')}</Text>
          </View>
          <Text style={{ fontSize: 46 }}>🚕</Text>
          <View style={styles.taxiArrow}><Ionicons name="arrow-forward" size={18} color="#FFC800" /></View>
        </Pressable>
      </View>

      {!p.isVerified && (
        <View style={styles.pad}>
          <Pressable onPress={() => router.push('/verify')} style={[styles.verify, { backgroundColor: c.accentSoft }]}>
            <Ionicons name="shield-checkmark" size={26} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{p.myVerification?.status === 'pending' ? "Tasdiqlash ko'rib chiqilmoqda" : t('home.verifyTitle')}</Txt>
              <Txt v="small" muted>{p.myVerification?.status === 'pending' ? 'Odatda 24 soat ichida' : t('home.verifySub')}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.accent} />
          </Pressable>
        </View>
      )}

      {/* Tavsiya etilgan */}
      {featured.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionHeader title={t('home.featured')} action={t('home.all')} onAction={() => router.push('/projects')} style={styles.pad} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 4 }}>
            {featured.map(x => <ProjectTile key={x.id} p={x} />)}
          </ScrollView>
        </View>
      )}

      {/* Sohalar */}
      <View style={{ gap: 10 }}>
        <SectionHeader title={t('home.sectors')} action={t('home.all')} onAction={() => router.push('/sectors')} style={styles.pad} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {SECTORS.slice(0, 12).map(s => (
            <Pressable
              key={s.id}
              onPress={() => { haptic.tap(); router.push({ pathname: '/world', params: { sector: s.id } }); }}
              style={[styles.sector, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Txt v="small" style={{ fontWeight: '700' }}>{sectorName(s)}</Txt>
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
      <View style={{ gap: 10 }}>
        <SectionHeader title={t('home.experts')} action={t('home.all')} onAction={() => router.push('/tech')} style={styles.pad} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 4 }}>
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
        <View style={[styles.cta, { backgroundColor: c.surface }, shadow(c, 0.5)]}>
          <Text style={{ fontSize: 40 }}>🚀</Text>
          <Txt v="h2" style={{ textAlign: 'center' }}>{t('home.createTitle')}</Txt>
          <Txt muted style={{ textAlign: 'center', lineHeight: 21 }}>{t('home.createSub')}</Txt>
          <Button title={t('home.createBtn')} icon="add-circle" onPress={() => router.push('/project/edit')} style={{ alignSelf: 'stretch', marginTop: 6 }} />
        </View>
      </View>

      <Txt v="tiny" faint style={{ textAlign: 'center' }}>YUMS · 2026 · Barcha e'lonlar moderatsiyadan o'tadi</Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  hero: { borderRadius: radius.xl, padding: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2 },
  heroMark: { position: 'absolute', right: -36, bottom: -18, width: 200, height: 155, opacity: 0.32 },
  heroKicker: { color: '#FFC800', fontSize: 10.5, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 23, fontWeight: '900', letterSpacing: -0.5, marginTop: 6, lineHeight: 28, maxWidth: 250 },
  heroNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  heroLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { width: '22.6%', flexGrow: 1, alignItems: 'center', gap: 9, paddingVertical: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  sectionName: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  taxi: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, borderRadius: radius.l, overflow: 'hidden' },
  taxiKicker: { color: '#0E1525', opacity: 0.6, fontSize: 10.5, fontWeight: '900', letterSpacing: 1 },
  taxiTitle: { color: '#0E1525', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  taxiSub: { color: '#0E1525', opacity: 0.7, fontSize: 12.5, fontWeight: '600' },
  taxiArrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#0E1525', alignItems: 'center', justifyContent: 'center' },
  verify: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.l },
  sector: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  cta: { alignItems: 'center', gap: 6, padding: 22, borderRadius: radius.xl },
});
