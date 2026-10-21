import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/components/ui';
import type { TKey } from '@/lib/i18n';
import { usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { shadow } from '@/lib/theme';

const TABS: Record<string, { icon: IconName; active: IconName; label: TKey }> = {
  index: { icon: 'home-outline', active: 'home', label: 'tab.home' },
  world: { icon: 'earth-outline', active: 'earth', label: 'tab.world' },
  connect: { icon: 'chatbubbles-outline', active: 'chatbubbles', label: 'tab.connect' },
  profile: { icon: 'person-circle-outline', active: 'person-circle', label: 'tab.profile' },
};

function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { colors: c, t } = useStore();
  const { unread } = usePlatform();
  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((r, i) => {
        const meta = TABS[r.name];
        if (!meta) return null;
        const on = state.index === i;
        const badge = r.name === 'connect' && unread > 0 ? unread : 0;
        return (
          <Fragment key={r.key}>
            {i === 2 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tab.create')}
                onPress={() => { haptic.tap(); router.push('/project/edit'); }}
                style={styles.item}>
                <View style={[styles.plus, { backgroundColor: c.brand }, shadow(c, 0.8)]}>
                  <Ionicons name="add" size={28} color={c.brandText} />
                </View>
                <Text style={[styles.label, { color: c.muted }]}>{t('tab.create')}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => { if (!on) haptic.tap(); navigateToTab(r.key); }}
              style={styles.item}>
              <View style={[styles.iconWrap, on && { backgroundColor: c.brandSoft }]}>
                <Ionicons name={on ? meta.active : meta.icon} size={23} color={on ? c.text : c.muted} />
                {badge ? <View style={[styles.badge, { backgroundColor: c.danger, borderColor: c.surface }]}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
              </View>
              <Text style={[styles.label, { color: on ? c.text : c.muted, fontWeight: on ? '800' : '600' }]} numberOfLines={1}>{t(meta.label)}</Text>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { user, colors: c } = useStore();
  if (!user) return <Redirect href="/login" />;
  return (
    <Tabs tabBar={p => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="world" />
      <Tabs.Screen name="connect" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 52, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11 },
  plus: { width: 52, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  badge: { position: 'absolute', top: -3, right: 6, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});
