import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { pickAvatar } from '@/lib/media';
import { haptic, useStore } from '@/lib/store';

import { Logo } from './platform-ui';
import { toast } from './toast';
import { ActionSheet, Avatar, DEFAULT_AVATAR, Txt } from './ui';

/** Profil rasmi: bosilganda galereya / kamera / o'chirish tanlovi */
export function AvatarEditor({ size = 64 }: { size?: number }) {
  const { colors: c, user, updateUser } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const company = user.kind === 'company' && user.company;

  const pick = async (source: 'library' | 'camera') => {
    setOpen(false);
    setBusy(true);
    const r = await pickAvatar(source);
    setBusy(false);
    if (r.ok) { updateUser({ avatar: r.uri }); haptic.success(); toast('Profil rasmi yangilandi', 'image'); return; }
    if (r.reason === 'denied') toast('Kameraga ruxsat berilmadi — sozlamalardan yoqing', 'camera');
    else if (r.reason === 'error') toast("Rasmni yuklab bo'lmadi, boshqasini tanlang", 'alert-circle');
  };

  return (
    <>
      <Pressable onPress={() => { haptic.tap(); setOpen(true); }} accessibilityRole="button" accessibilityLabel="Profil rasmini o'zgartirish" style={{ width: size, height: size }}>
        {user.avatar || !company ? <Avatar name={user.name} size={size} uri={user.avatar} fallback={DEFAULT_AVATAR} /> : <Logo name={company} color={c.ok} size={size} />}
        {busy && (
          <View style={[StyleSheet.absoluteFill, styles.busy, { borderRadius: size / 2.6 }]}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: c.ink, borderColor: c.surface }]}>
          <Ionicons name="camera" size={13} color={c.bg} />
        </View>
      </Pressable>

      <ActionSheet
        visible={open}
        onClose={() => setOpen(false)}
        header={
          <>
            <Avatar name={user.name} size={44} uri={user.avatar} fallback={DEFAULT_AVATAR} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3" numberOfLines={1}>Profil rasmi</Txt>
              <Txt v="small" muted numberOfLines={1}>JPG yoki PNG · 400×400</Txt>
            </View>
          </>
        }
        groups={[
          [
            { icon: 'images-outline', title: 'Galereyadan tanlash', sub: 'Telefon yoki kompyuterdan', color: c.accent, onPress: () => pick('library') },
            ...(Platform.OS !== 'web' ? [{ icon: 'camera-outline' as const, title: 'Kamera bilan olish', sub: 'Hozir surat oling', color: c.ok, onPress: () => pick('camera') }] : []),
          ],
          user.avatar ? [{ icon: 'trash-outline', title: "Rasmni o'chirish", danger: true, onPress: () => { setOpen(false); updateUser({ avatar: undefined }); toast("Profil rasmi o'chirildi", 'trash'); } }] : [],
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  busy: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -3, bottom: -3, width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
});
