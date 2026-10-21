import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { toast } from '@/components/toast';
import { Button, Card, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const DOCS = {
  person: ['Pasport yoki ID karta', 'Hujjat bilan selfi'],
  company: ["Davlat ro'yxatidan o'tganlik guvohnomasi", 'Direktor pasporti', 'Litsenziya (litsenziyalanadigan faoliyat uchun)'],
};

export default function Verify() {
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const kind = user?.kind ?? 'person';
  const docs = DOCS[kind];
  const [files, setFiles] = useState<Record<string, string>>({});
  const v = p.myVerification;
  const required = kind === 'company' ? docs.slice(0, 2) : docs;
  const ready = required.every(d => files[d]);

  const pick = async (doc: string) => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (r.canceled) return;
      haptic.tap();
      setFiles(f => ({ ...f, [doc]: r.assets[0].name }));
    } catch {
      toast("Fayl tanlab bo'lmadi", 'alert-circle');
    }
  };

  const status = v?.status === 'approved'
    ? { icon: 'shield-checkmark' as const, color: c.accent, bg: c.accentSoft, title: 'Profil tasdiqlangan', text: "Profilingiz va e'lonlaringizda «Tasdiqlangan» belgisi ko'rinadi." }
    : v?.status === 'pending'
      ? { icon: 'hourglass' as const, color: c.warn, bg: c.warnSoft, title: "Hujjatlar ko'rib chiqilmoqda", text: 'Moderator odatda 24 soat ichida tekshiradi. Natija bildirishnoma orqali keladi.' }
      : v?.status === 'rejected'
        ? { icon: 'close-circle' as const, color: c.danger, bg: c.dangerSoft, title: 'Tasdiqlash rad etildi', text: "Hujjatlar aniq ko'rinmadi yoki ma'lumotlar mos kelmadi. Qayta yuboring." }
        : null;

  return (
    <Screen
      title="Profilni tasdiqlash"
      subtitle={kind === 'company' ? 'Kompaniya' : 'Jismoniy shaxs'}
      footer={v?.status === 'approved' || v?.status === 'pending' ? undefined : (
        <Button title="Tekshiruvga yuborish" icon="send" disabled={!ready} onPress={() => { p.requestVerification(Object.keys(files)); haptic.success(); toast('Hujjatlar moderatorga yuborildi', 'shield-checkmark'); }} />
      )}>
      {status && (
        <View style={[styles.status, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={30} color={status.color} />
          <View style={{ flex: 1 }}>
            <Txt v="h3" color={status.color}>{status.title}</Txt>
            <Txt v="small" color={status.color}>{status.text}</Txt>
          </View>
        </View>
      )}

      <Card style={{ gap: 12 }}>
        <Txt v="h3">Nega tasdiqlash kerak?</Txt>
        {[
          ['shield-checkmark-outline', "Investor va hamkorlar ishonchi oshadi"],
          ['trending-up-outline', "Qidiruvda «Faqat tasdiqlanganlar» filtrida ko'rinasiz"],
          ['megaphone-outline', 'Reklama joylashtirish imkoniyati'],
        ].map(([i, t]) => (
          <Row key={t} gap={10}><Ionicons name={i as 'shield-checkmark-outline'} size={20} color={c.accent} /><Txt v="small" style={{ flex: 1 }}>{t}</Txt></Row>
        ))}
      </Card>

      <SectionTitle>Aloqa ma'lumotlari</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Row>
          <Ionicons name={user?.email ? 'mail' : 'call'} size={20} color={c.ok} />
          <Txt style={{ flex: 1 }}>{user?.email || user?.phone}</Txt>
          <Row gap={4}><Ionicons name="checkmark-circle" size={16} color={c.ok} /><Txt v="small" color={c.ok} style={{ fontFamily: F.bold }}>Tasdiqlangan</Txt></Row>
        </Row>
      </Card>

      {v?.status !== 'approved' && v?.status !== 'pending' && (
        <>
          <SectionTitle>Hujjatlar</SectionTitle>
          {docs.map((d, i) => {
            const f = files[d];
            const optional = !required.includes(d);
            return (
              <Pressable key={d} onPress={() => pick(d)} style={({ pressed }) => [styles.doc, { backgroundColor: c.surface, borderColor: f ? c.ok : c.line, opacity: pressed ? 0.85 : 1 }]}>
                <View style={[styles.num, { backgroundColor: f ? c.ok : c.surface2 }]}>
                  {f ? <Ionicons name="checkmark" size={18} color="#fff" /> : <Txt v="h3">{i + 1}</Txt>}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="h3">{d}{optional ? ' (ixtiyoriy)' : ''}</Txt>
                  <Txt v="small" muted numberOfLines={1}>{f ?? 'Rasm yoki PDF yuklang'}</Txt>
                </View>
                <Ionicons name={f ? 'refresh' : 'cloud-upload-outline'} size={20} color={c.muted} />
              </Pressable>
            );
          })}
          <Txt v="tiny" faint style={{ paddingHorizontal: 4, lineHeight: 16 }}>
            Hujjatlar shifrlangan holda saqlanadi va faqat tekshiruv uchun ishlatiladi. Tekshiruvdan so'ng 90 kun ichida o'chiriladi (Ma'lumotlarni saqlash qoidalari).
          </Txt>
        </>
      )}

      {v?.status === 'pending' && user?.role === 'user' && (
        <Card style={{ gap: 8, backgroundColor: c.surface2 }}>
          <Txt v="small" muted>Demo: tasdiqlash jarayonini ko'rish uchun Xavfsizlik bo'limida ruxsat darajasini «Moderator»ga o'zgartiring va Moderatsiya panelida so'rovni tasdiqlang.</Txt>
          <Button title="Xavfsizlik bo'limi" small kind="ghost" onPress={() => router.push('/security')} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18 },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5 },
  num: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
