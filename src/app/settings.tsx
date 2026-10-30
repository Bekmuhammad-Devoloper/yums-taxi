import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IOSSwitch, Card, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { LangList } from '@/components/lang-picker';
import { haptic, useStore, type ThemePref } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

export default function Settings() {
  const { colors: c, theme, setTheme, t } = useStore();
  const [notify, setNotify] = useState({ messages: true, requests: true, moderation: true, ride: true, promo: false });
  const themes: { id: ThemePref; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
    { id: 'system', label: t('settings.system'), icon: 'phone-portrait-outline' },
    { id: 'light', label: t('settings.light'), icon: 'sunny-outline' },
    { id: 'dark', label: t('settings.dark'), icon: 'moon-outline' },
  ];
  const toggles: { k: keyof typeof notify; title: string; sub: string }[] = [
    { k: 'messages', title: tr('Yangi xabarlar'), sub: tr('YUMS Connect suhbatlari') },
    { k: 'requests', title: tr("Hamkorlik so'rovlari"), sub: tr('Investor, hamkor va mijozlardan') },
    { k: 'moderation', title: tr('Moderatsiya natijalari'), sub: tr("Loyiha va e'lonlar holati") },
    { k: 'ride', title: tr('Safar holati'), sub: tr('YUMS Taxi: haydovchi keldi, safar tugadi') },
    { k: 'promo', title: tr('Aksiya va yangiliklar'), sub: tr('Promokodlar va platforma yangiliklari') },
  ];
  return (
    <Screen title={t('settings.title')}>
      <SectionTitle>{t('settings.appearance')}</SectionTitle>
      <Row gap={8}>
        {themes.map(x => {
          const on = theme === x.id;
          return (
            <Pressable key={x.id} onPress={() => { haptic.tap(); setTheme(x.id); }} style={[styles.theme, { backgroundColor: on ? c.brandSoft : c.surface, borderColor: on ? c.brand : c.line }]}>
              <Ionicons name={x.icon} size={24} color={c.text} />
              <Txt v="small" style={{ fontFamily: F.bold }}>{x.label}</Txt>
            </Pressable>
          );
        })}
      </Row>

      <SectionTitle>{t('settings.language')}</SectionTitle>
      <Card style={{ padding: 6 }}>
        <LangList />
      </Card>
      <Txt v="tiny" faint style={{ marginTop: -6, marginLeft: 4 }}>{tr("Foydalanuvchilar joylashtirgan kontent muallif tilida ko'rsatiladi.")}</Txt>

      <SectionTitle>{t('settings.notifications')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        {toggles.map(x => (
          <Row key={x.k}>
            <View style={{ flex: 1 }}><Txt v="h3">{x.title}</Txt><Txt v="small" muted>{x.sub}</Txt></View>
            <IOSSwitch value={notify[x.k]} onChange={v => setNotify(n => ({ ...n, [x.k]: v }))} />
          </Row>
        ))}
      </Card>

      <SectionTitle>{t('settings.account')}</SectionTitle>
      <Card style={{ padding: 6 }}>
        <ListItem icon="person-outline" title={tr('Profil')} onPress={() => router.push('/profile-edit')} />
        <ListItem icon="lock-closed-outline" title={tr('Xavfsizlik va zaxira')} onPress={() => router.push('/security')} />
        <ListItem icon="document-text-outline" title={tr('Foydalanish shartlari')} onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} />
        <ListItem icon="shield-outline" title={tr('Maxfiylik siyosati')} onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} />
        <ListItem icon="ellipse-outline" title={tr('Cookie siyosati')} onPress={() => router.push({ pathname: '/legal', params: { doc: 'cookies' } })} />
      </Card>
      <Txt v="tiny" faint style={{ textAlign: 'center' }}>{tr('YUMS · versiya 1.0.0')}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  theme: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: 18, borderWidth: 2 },
});
