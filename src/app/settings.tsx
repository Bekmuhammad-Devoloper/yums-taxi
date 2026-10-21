import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { LANGS } from '@/lib/i18n';
import { haptic, useStore, type ThemePref } from '@/lib/store';

export default function Settings() {
  const { colors: c, theme, setTheme, lang, setLang, t } = useStore();
  const [notify, setNotify] = useState({ messages: true, requests: true, moderation: true, ride: true, promo: false });
  const themes: { id: ThemePref; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
    { id: 'system', label: t('settings.system'), icon: 'phone-portrait-outline' },
    { id: 'light', label: t('settings.light'), icon: 'sunny-outline' },
    { id: 'dark', label: t('settings.dark'), icon: 'moon-outline' },
  ];
  const toggles: { k: keyof typeof notify; title: string; sub: string }[] = [
    { k: 'messages', title: 'Yangi xabarlar', sub: 'YUMS Connect suhbatlari' },
    { k: 'requests', title: "Hamkorlik so'rovlari", sub: 'Investor, hamkor va mijozlardan' },
    { k: 'moderation', title: 'Moderatsiya natijalari', sub: "Loyiha va e'lonlar holati" },
    { k: 'ride', title: 'Safar holati', sub: 'YUMS Taxi: haydovchi keldi, safar tugadi' },
    { k: 'promo', title: 'Aksiya va yangiliklar', sub: 'Promokodlar va platforma yangiliklari' },
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
              <Txt v="small" style={{ fontWeight: '700' }}>{x.label}</Txt>
            </Pressable>
          );
        })}
      </Row>

      <SectionTitle>{t('settings.language')}</SectionTitle>
      <Card style={{ padding: 6 }}>
        {LANGS.map(l => (
          <Pressable key={l.id} onPress={() => { haptic.tap(); setLang(l.id); }} style={({ pressed }) => [styles.lang, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
            <Text style={{ fontSize: 22 }}>{l.flag}</Text>
            <Txt v="h3" style={{ flex: 1 }}>{l.label}</Txt>
            {lang === l.id && <Ionicons name="checkmark-circle" size={22} color={c.brandDeep} />}
          </Pressable>
        ))}
      </Card>
      <Txt v="tiny" faint style={{ marginTop: -6, marginLeft: 4 }}>Foydalanuvchilar joylashtirgan kontent muallif tilida ko'rsatiladi.</Txt>

      <SectionTitle>{t('settings.notifications')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        {toggles.map(x => (
          <Row key={x.k}>
            <View style={{ flex: 1 }}><Txt v="h3">{x.title}</Txt><Txt v="small" muted>{x.sub}</Txt></View>
            <Switch value={notify[x.k]} onValueChange={v => setNotify(n => ({ ...n, [x.k]: v }))} trackColor={{ true: c.brand }} />
          </Row>
        ))}
      </Card>

      <SectionTitle>{t('settings.account')}</SectionTitle>
      <Card style={{ padding: 6 }}>
        <ListItem icon="person-outline" title="Profil" onPress={() => router.push('/profile-edit')} />
        <ListItem icon="lock-closed-outline" title="Xavfsizlik va zaxira" onPress={() => router.push('/security')} />
        <ListItem icon="document-text-outline" title="Foydalanish shartlari" onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} />
        <ListItem icon="shield-outline" title="Maxfiylik siyosati" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} />
        <ListItem icon="ellipse-outline" title="Cookie siyosati" onPress={() => router.push({ pathname: '/legal', params: { doc: 'cookies' } })} />
      </Card>
      <Txt v="tiny" faint style={{ textAlign: 'center' }}>YUMS · versiya 1.0.0</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  theme: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: 18, borderWidth: 2 },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
});
