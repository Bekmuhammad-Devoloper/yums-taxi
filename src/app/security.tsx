import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { toast } from '@/components/toast';
import { IOSSwitch, Badge, Card, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { ago, usePlatform } from '@/lib/platform';
import { errorText } from '@/lib/api';
import { useStore, type Role } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

const ROLES: { id: Role; label: string; short: string; can: string }[] = [
  { id: 'user', get label() { return tr('Foydalanuvchi'); }, get short() { return tr('Oddiy'); }, get can() { return tr("Loyiha va e'lon joylashtirish, xabarlar, shikoyat yuborish"); } },
  { id: 'moderator', get label() { return tr('Moderator'); }, get short() { return tr('Moderator'); }, get can() { return tr("+ e'lonlarni tasdiqlash/rad etish, shikoyatlarni ko'rib chiqish, profillarni tasdiqlash"); } },
  { id: 'admin', get label() { return tr('Administrator'); }, get short() { return tr('Admin'); }, get can() { return tr('+ moderatorlarni boshqarish, tizim sozlamalari va monitoring'); } },
];

export default function Security() {
  const { colors: c, user, deleteAccount } = useStore();
  const p = usePlatform();
  const role = user?.role ?? 'user';
  const [openedAt] = useState(Date.now);

  const backup = () => {
    p.exportData().then(data => { if (data) Share.share({ title: tr("YUMS — ma'lumotlarim"), message: data }).catch(() => {}); });
  };
  // So'nggi sutkada noto'g'ri kod bilan kirishga urinish bo'lganmi
  const suspicious = p.security.some(e => !e.ok && openedAt - new Date(e.at).getTime() < 86_400_000);

  return (
    <Screen title={tr('Xavfsizlik va zaxira')}>
      <View style={[styles.monitor, { backgroundColor: suspicious ? c.dangerSoft : c.okSoft }]}>
        <Ionicons name={suspicious ? 'warning' : 'pulse'} size={26} color={suspicious ? c.danger : c.ok} />
        <View style={{ flex: 1 }}>
          <Txt v="h3" color={suspicious ? c.danger : c.ok}>{suspicious ? tr("So'nggi sutkada noto'g'ri kod kiritilgan") : tr('Shubhali faollik aniqlanmadi')}</Txt>
          <Txt v="small" color={suspicious ? c.danger : c.ok}>{suspicious ? tr("Siz bo'lmasangiz — ikki bosqichli himoyani yoqing") : tr("Kirishlar tarixi quyida — server qayd etadi")}</Txt>
        </View>
      </View>

      <SectionTitle>{tr('Kirish')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Row>
          <View style={{ flex: 1 }}>
            <Txt v="h3">{tr('Ikki bosqichli himoya')}</Txt>
            <Txt v="small" muted>{user?.phone && user?.email ? tr("Har kirishda ikkinchi manzilingizga (SMS yoki email) qo'shimcha kod") : tr("Yoqish uchun profilga telefon va email ikkalasini qo'shing")}</Txt>
          </View>
          <IOSSwitch value={p.twoFactor} onChange={v => { p.setTwoFactor(v).then(ok => { if (ok) toast(v ? tr('Ikki bosqichli himoya yoqildi') : tr("Ikki bosqichli himoya o'chirildi"), 'lock-closed'); }); }} />
        </Row>
        <Row>
          <Ionicons name="phone-portrait-outline" size={20} color={c.muted} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">{tr('Joriy qurilma')}</Txt>
            <Txt v="small" muted>{tr('Faol sessiya · {phone}', { phone: user?.phone || user?.email })}</Txt>
          </View>
          <Badge label={tr('Hozir')} tone="ok" />
        </Row>
      </Card>

      <SectionTitle>{tr('Kirishlar tarixi')}</SectionTitle>
      <Card style={{ gap: 12 }}>
        {p.security.length === 0 && <Txt v="small" muted>{tr("Hali yozuvlar yo'q")}</Txt>}
        {p.security.slice(0, 8).map(e => (
          <Row key={e.id} gap={10}>
            <Ionicons name={e.ok ? 'checkmark-circle' : 'warning'} size={18} color={e.ok ? c.ok : c.danger} />
            <View style={{ flex: 1 }}>
              <Txt v="small" style={{ fontFamily: F.bold }}>{e.event}</Txt>
              <Txt v="tiny" faint>{e.device} · {ago(e.at)}</Txt>
            </View>
          </Row>
        ))}
      </Card>

      <SectionTitle>{tr('Ruxsat darajasi')}</SectionTitle>
      <Card style={{ gap: 12 }}>
        {ROLES.map(r => (
          <Row key={r.id} gap={10} style={{ alignItems: 'flex-start', opacity: r.id === role ? 1 : 0.55 }}>
            <Ionicons name={r.id === role ? 'radio-button-on' : 'radio-button-off'} size={18} color={r.id === role ? c.brandDeep : c.faint} />
            <View style={{ flex: 1 }}>
              <Txt v="small" style={{ fontFamily: F.heavy }}>{r.label}</Txt>
              <Txt v="tiny" faint>{r.can}</Txt>
            </View>
          </Row>
        ))}
        <Txt v="tiny" faint>{tr('Rollarni YUMS administratori beradi; yangi rol keyingi kirishda faollashadi.')}</Txt>
        {role !== 'user' && <ListItem icon="key-outline" iconColor={c.danger} title={tr("Moderatsiya paneliga o'tish")} onPress={() => router.push('/moderation')} />}
      </Card>

      <SectionTitle>{tr("Ma'lumotlar")}</SectionTitle>
      <Card style={{ padding: 6 }}>
        <ListItem icon="cloud-download-outline" title={tr("Ma'lumotlarim nusxasi")} sub={tr("Profil, loyihalar, e'lonlar — JSON")} onPress={backup} />
        <ListItem icon="server-outline" title={tr('Avtomatik zaxira nusxa')} sub={tr('Har kuni · 35 kun saqlanadi')} right={<Badge label={tr('Yoqilgan')} tone="ok" />} />
        <ListItem icon="document-lock-outline" title={tr('Saqlash qoidalari')} onPress={() => router.push({ pathname: '/legal', params: { doc: 'retention' } })} />
        <ListItem icon="trash-outline" title={tr("Hisobni o'chirish")} danger onPress={() => confirm(tr("Hisobni o'chirasizmi?"), tr("Shaxsiy ma'lumotlaringiz o'chiriladi, kirish sessiyalari yopiladi. Bu amalni qaytarib bo'lmaydi."), () => {
          deleteAccount()
            .then(() => { p.resetPlatform(); router.replace('/login'); toast(tr("Hisob o'chirildi"), 'trash'); })
            .catch(error => toast(errorText(error), 'alert-circle'));
        }, tr("O'chirish"))} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monitor: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18 },
});
