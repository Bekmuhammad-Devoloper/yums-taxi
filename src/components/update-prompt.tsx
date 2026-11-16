// «Ilovani yangilang» oynasi: ochilganda va ilovaga qaytilganda (ko'pi bilan 3 soatda bir) Releases'dagi eng
// so'nggi yig'ilish tekshiriladi. Yangisi bo'lsa — yangilash taklifi; minBuild'dan eski bo'lsa — majburiy
// (yopib bo'lmaydi). «Yangilash» yangi APK'ni yuklab oladi, keyin uni ochib o'rnatish kifoya.
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { AppState, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { BrandMark } from '@/components/ui';
import { APK_URL, LOCAL_BUILD, isSnoozed, latestRelease, snooze, updateCheckEnabled, type Release } from '@/lib/app-update';
import { tr } from '@/lib/i18n';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const CHECK_EVERY_MS = 3 * 60 * 60 * 1000;

export function UpdatePrompt() {
  const [release, setRelease] = useState<Release | null>(null);

  useEffect(() => {
    if (!updateCheckEnabled) return;
    let checkedAt = 0;
    let alive = true;
    const check = async () => {
      if (Date.now() - checkedAt < CHECK_EVERY_MS) return;
      checkedAt = Date.now();
      const latest = await latestRelease();
      if (!alive || !latest || latest.build <= LOCAL_BUILD) return;
      const forced = (latest.minBuild ?? 0) > LOCAL_BUILD;
      if (!forced && (await isSnoozed(latest.build))) return;
      if (alive) setRelease(latest);
    };
    // ilova to'liq ochilib bo'lgach tekshiriladi
    const first = setTimeout(() => { check().catch(() => {}); }, 2500);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') check().catch(() => {}); });
    return () => { alive = false; clearTimeout(first); sub.remove(); };
  }, []);

  if (!release || !APK_URL) return null;
  const forced = (release.minBuild ?? 0) > LOCAL_BUILD;
  const url = APK_URL;

  const update = () => {
    haptic.tap();
    Linking.openURL(url).then(() => {
      toast(tr("Yuklab olingan faylni ochib, «O'rnatish»ni bosing"), 'download-outline');
    }).catch(() => toast(tr('Havola ochilmadi'), 'alert-circle'));
    if (!forced) setRelease(null);
  };
  const later = () => {
    snooze(release.build).catch(() => {});
    setRelease(null);
  };

  return <UpdateDialog current={LOCAL_BUILD} latest={release.build} forced={forced} onUpdate={update} onLater={later} />;
}

/** Oynaning o'zi (ko'rinish): joriy va yangi yig'ilish raqami, «Yangilash» va (majburiy bo'lmasa) «Keyinroq» */
export function UpdateDialog({ current, latest, forced, onUpdate, onLater }: { current: number; latest: number; forced: boolean; onUpdate: () => void; onLater: () => void }) {
  const { colors: c, dark } = useStore();
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={forced ? () => {} : onLater}>
      <View style={[styles.backdrop, { backgroundColor: dark ? 'rgba(0,0,0,0.6)' : 'rgba(15,20,30,0.45)' }]}>
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <LinearGradient colors={['#FFE27A', '#FFC800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.glow} />
            <BrandMark size={64} style={{ borderRadius: 18 }} />
            <View style={styles.newBadge}>
              <Ionicons name="sparkles" size={12} color="#FFC800" />
              <Text style={styles.newBadgeText}>{tr('Yangi versiya')}</Text>
            </View>
          </LinearGradient>
          <View style={styles.body}>
            <Text style={[styles.title, { color: c.text }]}>{forced ? tr('Ilovani yangilash kerak') : tr('Ilovani yangilang')}</Text>
            <Text style={[styles.text, { color: c.muted }]}>
              {forced
                ? tr("Bu versiya endi qo'llab-quvvatlanmaydi. Davom etish uchun yangi versiyani o'rnating.")
                : tr("YUMS'ning yangi versiyasi chiqdi: yangi imkoniyatlar va tuzatishlar. Yangilash bir daqiqa oladi, ma'lumotlaringiz saqlanib qoladi.")}
            </Text>
            <View style={[styles.versions, { backgroundColor: c.surface2 }]}>
              <Text style={[styles.versionText, { color: c.muted }]}>{tr('Sizda: #{v}', { v: current })}</Text>
              <Ionicons name="arrow-forward" size={14} color={c.faint} />
              <Text style={[styles.versionText, { color: c.text, fontFamily: F.bold }]}>{tr('Yangi: #{v}', { v: latest })}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onUpdate} style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
              <Ionicons name="download" size={18} color="#0E1525" />
              <Text style={styles.primaryText}>{tr('Yangilash')}</Text>
            </Pressable>
            {!forced && (
              <Pressable accessibilityRole="button" onPress={onLater} hitSlop={8} style={styles.secondary}>
                <Text style={[styles.secondaryText, { color: c.muted }]}>{tr('Keyinroq')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 28, overflow: 'hidden' },
  hero: { height: 132, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -120, right: -60, backgroundColor: 'rgba(255,255,255,0.35)' },
  newBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0E1525', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  newBadgeText: { color: '#FFFFFF', fontFamily: F.bold, fontSize: 12 },
  body: { padding: 20, gap: 12 },
  title: { fontFamily: F.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.4, textAlign: 'center' },
  text: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  versions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 9, borderRadius: 14 },
  versionText: { fontFamily: F.semi, fontSize: 13, fontVariant: ['tabular-nums'] },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 18, backgroundColor: '#FFC800', marginTop: 4 },
  primaryText: { color: '#0E1525', fontFamily: F.bold, fontSize: 16 },
  secondary: { alignItems: 'center', paddingVertical: 6 },
  secondaryText: { fontFamily: F.semi, fontSize: 14.5 },
});
