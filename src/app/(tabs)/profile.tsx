import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarEditor } from '@/components/avatar-editor';
import { Place, ProjectCard } from '@/components/platform-ui';
import { Badge, Button, Card, Divider, IconTile, ListItem, Row, SectionHeader, Stat, Txt } from '@/components/ui';
import { PLANS } from '@/lib/platform-data';
import { countryOf, short, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';

export default function Profile() {
  const { colors: c, user, t, logout } = useStore();
  const p = usePlatform();
  const insets = useSafeAreaInsets();
  if (!user) return null;

  const company = user.kind === 'company';
  const displayName = company && user.company ? user.company : user.name;
  const k = countryOf(user.country ?? 'UZ');
  const plan = PLANS.find(x => x.id === p.plan)!;
  const views = p.myProjects.reduce((n, x) => n + x.views, 0);
  const staff = user.role === 'moderator' || user.role === 'admin';
  const vs = p.myVerification?.status;
  const verify = vs === 'approved'
    ? { label: t('common.verified'), tone: 'accent' as const, icon: 'checkmark-circle' as const }
    : vs === 'pending'
      ? { label: "Ko'rib chiqilmoqda", tone: 'warn' as const, icon: 'hourglass-outline' as const }
      : { label: 'Tasdiqlanmagan', tone: 'muted' as const, icon: 'shield-outline' as const };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 10, padding: 16, gap: 14, paddingBottom: 30 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="h1">{t('profile.title')}</Txt>
        <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={[styles.gear, { backgroundColor: c.surface }]}>
          <Ionicons name="settings-outline" size={21} color={c.text} />
        </Pressable>
      </Row>

      <Card style={{ gap: 14 }}>
        <Row>
          <AvatarEditor size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h2" numberOfLines={1}>{displayName}</Txt>
            <Place code={k.code} before={company ? `Kompaniya · ${user.name} ·` : 'Jismoniy shaxs ·'} />
            <Txt v="small" muted numberOfLines={1}>{user.email || user.phone}</Txt>
          </View>
        </Row>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Badge label={verify.label} tone={verify.tone} icon={verify.icon} />
          <Badge label={plan.name} tone={p.plan === 'free' ? 'muted' : 'violet'} icon="diamond-outline" />
          {staff && <Badge label={user.role === 'admin' ? 'Administrator' : 'Moderator'} tone="danger" icon="key-outline" />}
        </Row>
        {user.bio ? <Txt v="small" muted style={{ lineHeight: 19 }}>{user.bio}</Txt> : null}
        <Divider />
        <Row>
          <Stat value={String(p.myProjects.length)} label="Loyihalar" />
          <Stat value={String(p.favorites.length)} label="Saqlangan" />
          <Stat value={short(views)} label="Ko'rishlar" />
          <Stat value={String(p.conversations.length)} label="Suhbatlar" />
        </Row>
        <Button title={t('profile.edit')} kind="ghost" small icon="create-outline" onPress={() => router.push('/profile-edit')} />
      </Card>

      {p.plan === 'free' && (
        <Pressable onPress={() => router.push('/plans')} style={({ pressed }) => [styles.plan, { opacity: pressed ? 0.9 : 1 }]}>
          <LinearGradient colors={['#000000', '#0D0B06', '#231C08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={{ flex: 1 }}>
            <Text style={styles.planKicker}>YUMS PRO</Text>
            <Text style={styles.planTitle}>Loyihangizni TOPga chiqaring</Text>
            <Text style={styles.planSub}>Ustuvor ko'rsatish, statistika va kompaniya profili</Text>
          </View>
          <Ionicons name="diamond" size={36} color="#FFC800" />
        </Pressable>
      )}

      <SectionHeader title={t('profile.myProjects')} action={p.myProjects.length ? t('home.all') : undefined} onAction={() => router.push({ pathname: '/projects', params: { tab: 'mine' } })} />
      {p.myProjects.length ? (
        p.myProjects.slice(0, 2).map(x => <ProjectCard key={x.id} p={x} mine />)
      ) : (
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
          <IconTile name="bulb-outline" color={c.brandDeep} size={50} />
          <Txt v="h3">Hali loyihalaringiz yo'q</Txt>
          <Txt v="small" muted style={{ textAlign: 'center' }}>Birinchi loyihangizni joylashtiring — bu bepul</Txt>
          <Button title={t('home.createBtn')} small icon="add" onPress={() => router.push('/project/edit')} style={{ marginTop: 4 }} />
        </Card>
      )}

      <Card style={{ padding: 6 }}>
        <ListItem icon="rocket-outline" title={t('profile.myProjects')} sub="Qoralama, moderatsiya, faol" onPress={() => router.push({ pathname: '/projects', params: { tab: 'mine' } })} />
        <ListItem icon="storefront-outline" title="Bozordagi e'lonlarim" sub={`${p.myMarket.length} ta e'lon`} onPress={() => router.push({ pathname: '/market', params: { tab: 'mine' } })} />
        <ListItem icon="bookmark-outline" title={t('profile.favorites')} sub={`${p.favorites.length} ta`} onPress={() => router.push('/favorites')} />
        <ListItem icon="notifications-outline" title={t('profile.notifications')} right={p.unreadNotices ? <Badge label={String(p.unreadNotices)} tone="danger" /> : undefined} onPress={() => router.push('/notifications')} />
      </Card>

      <Card style={{ padding: 6 }}>
        <ListItem icon="shield-checkmark-outline" iconColor={c.accent} title={t('profile.verify')} sub={verify.label} onPress={() => router.push('/verify')} />
        <ListItem icon="lock-closed-outline" title={t('profile.security')} sub={p.twoFactor ? '2 bosqichli himoya yoqilgan' : 'Kirishlar tarixi, zaxira nusxa'} onPress={() => router.push('/security')} />
        {staff && <ListItem icon="key-outline" iconColor={c.danger} title={t('profile.moderation')} sub="Shikoyatlar, e'lonlar, tasdiqlash" onPress={() => router.push('/moderation')} />}
      </Card>

      <Card style={{ padding: 6 }}>
        <ListItem icon="car-sport-outline" iconBg={c.brandSoft} title={t('profile.taxi')} sub="Safarlar, to'lovlar, manzillar" onPress={() => router.push('/menu')} />
        <ListItem icon="diamond-outline" title={t('profile.plan')} sub={`Joriy: ${plan.name}`} onPress={() => router.push('/plans')} />
      </Card>

      <Card style={{ padding: 6 }}>
        <ListItem icon="settings-outline" title={t('profile.settings')} onPress={() => router.push('/settings')} />
        <ListItem icon="help-buoy-outline" title={t('profile.support')} sub="24/7 qo'llab-quvvatlash" onPress={() => router.push('/support')} />
        <ListItem icon="document-text-outline" title={t('profile.legal')} sub="Shartlar, maxfiylik, cookie" onPress={() => router.push('/legal')} />
        <ListItem icon="information-circle-outline" title={t('profile.about')} onPress={() => router.push('/about')} />
      </Card>

      <Card style={{ padding: 6 }}>
        <ListItem icon="log-out-outline" title={t('profile.logout')} danger onPress={() => { p.logEvent('Tizimdan chiqish'); logout(); router.replace('/login'); }} />
      </Card>
      <Txt v="tiny" faint style={{ textAlign: 'center' }}>YUMS 1.0 · ID {user.id}{user.joinedAt ? ` · ${new Date(user.joinedAt).getFullYear()} yildan beri` : ''}</Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  gear: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: radius.l, backgroundColor: '#000', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,200,0,0.25)' },
  planKicker: { color: '#FFC800', fontSize: 10.5, fontFamily: F.heavy, letterSpacing: 1 },
  planTitle: { color: '#fff', fontSize: 15.5, fontFamily: F.display, letterSpacing: -0.4, marginTop: 4 },
  planSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, fontFamily: F.semi, marginTop: 2 },
});
