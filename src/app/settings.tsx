import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { toast } from '@/components/toast';
import { Card, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { haptic, useStore, type ThemePref } from '@/lib/store';

export default function Settings() {
  const { colors: c, theme, setTheme, logout } = useStore();
  const [push, setPush] = useState(true);
  const [promo, setPromo] = useState(false);
  const themes: { id: ThemePref; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
    { id: 'system', label: 'Tizim', icon: 'phone-portrait-outline' },
    { id: 'light', label: "Yorug'", icon: 'sunny-outline' },
    { id: 'dark', label: "Qorong'i", icon: 'moon-outline' },
  ];
  return (
    <Screen title="Sozlamalar">
      <SectionTitle>Ko'rinish</SectionTitle>
      <Row gap={8}>
        {themes.map(t => {
          const on = theme === t.id;
          return (
            <Pressable key={t.id} onPress={() => { haptic.tap(); setTheme(t.id); }} style={[styles.theme, { backgroundColor: on ? c.brandSoft : c.surface, borderColor: on ? c.brand : c.line }]}>
              <Ionicons name={t.icon} size={24} color={c.text} />
              <Txt v="small" style={{ fontWeight: '700' }}>{t.label}</Txt>
            </Pressable>
          );
        })}
      </Row>

      <SectionTitle>Til</SectionTitle>
      <Card style={{ padding: 6 }}>
        <ListItem icon="language-outline" title="O'zbekcha" right={<Ionicons name="checkmark" size={22} color="#E0A800" />} />
        <ListItem icon="language-outline" title="Русский" sub="Tez orada" onPress={() => toast('Rus tili keyingi versiyada', 'language')} />
        <ListItem icon="language-outline" title="English" sub="Tez orada" onPress={() => toast('Ingliz tili keyingi versiyada', 'language')} />
      </Card>

      <SectionTitle>Bildirishnomalar</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Row><View style={{ flex: 1 }}><Txt v="h3">Safar holati</Txt><Txt v="small" muted>Haydovchi keldi, safar tugadi</Txt></View><Switch value={push} onValueChange={setPush} trackColor={{ true: c.brand }} /></Row>
        <Row><View style={{ flex: 1 }}><Txt v="h3">Aksiya va chegirmalar</Txt><Txt v="small" muted>Promokodlar haqida</Txt></View><Switch value={promo} onValueChange={setPromo} trackColor={{ true: c.brand }} /></Row>
      </Card>

      <SectionTitle>Hisob</SectionTitle>
      <Card style={{ padding: 6 }}>
        <ListItem icon="document-text-outline" title="Foydalanish shartlari" onPress={() => toast("Hujjat yurist bilan tayyorlanmoqda", 'document-text')} />
        <ListItem icon="lock-closed-outline" title="Maxfiylik siyosati" onPress={() => toast("Hujjat yurist bilan tayyorlanmoqda", 'lock-closed')} />
        <ListItem icon="trash-outline" title="Hisobni o'chirish" danger onPress={() => { logout(); router.replace('/login'); toast("Hisob o'chirildi", 'trash'); }} />
      </Card>
      <Txt v="tiny" faint style={{ textAlign: 'center' }}>Versiya 1.0.0</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  theme: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: 18, borderWidth: 2 },
});
