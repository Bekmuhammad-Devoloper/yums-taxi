import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { toast } from '@/components/toast';
import { IOSSwitch, Badge, Card, ListItem, Row, Screen, SectionTitle, Segmented, Txt } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { ago, usePlatform } from '@/lib/platform';
import { useStore, type Role } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

const ROLES: { id: Role; label: string; short: string; can: string }[] = [
  { id: 'user', get label() { return tr('Foydalanuvchi'); }, get short() { return tr('Oddiy'); }, get can() { return tr("Loyiha va e'lon joylashtirish, xabarlar, shikoyat yuborish"); } },
  { id: 'moderator', get label() { return tr('Moderator'); }, get short() { return tr('Moderator'); }, get can() { return tr("+ e'lonlarni tasdiqlash/rad etish, shikoyatlarni ko'rib chiqish, profillarni tasdiqlash"); } },
  { id: 'admin', get label() { return tr('Administrator'); }, get short() { return tr('Admin'); }, get can() { return tr('+ moderatorlarni boshqarish, tizim sozlamalari va monitoring'); } },
];

export default function Security() {
  const { colors: c, user, updateUser, deleteAccount } = useStore();
  const p = usePlatform();
  const role = user?.role ?? 'user';

  const backup = () => {
    Share.share({ title: tr("YUMS — ma'lumotlarim"), message: p.exportData() }).catch(() => {});
    p.logEvent(tr("Ma'lumotlar nusxasi eksport qilindi"));
  };

  return (
    <Screen title={tr('Xavfsizlik va zaxira')}>
      <View style={[styles.monitor, { backgroundColor: c.okSoft }]}>
        <Ionicons name="pulse" size={26} color={c.ok} />
        <View style={{ flex: 1 }}>
          <Txt v="h3" color={c.ok}>{tr('Xavfsizlik monitoringi faol')}</Txt>
          <Txt v="small" color={c.ok}>{tr('Shubhali faollik aniqlanmadi · oxirgi tekshiruv hozir')}</Txt>
        </View>
      </View>

      <SectionTitle>{tr('Kirish')}</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Row>
          <View style={{ flex: 1 }}>
            <Txt v="h3">{tr('Ikki bosqichli himoya')}</Txt>
            <Txt v="small" muted>{tr("Har kirishda {v2} orqali qo'shimcha kod", { v2: user?.email ? tr('email') : 'SMS' })}</Txt>
          </View>
          <IOSSwitch value={p.twoFactor} onChange={v => { p.setTwoFactor(v); p.logEvent(v ? tr('2FA yoqildi') : tr("2FA o'chirildi")); toast(v ? tr('Ikki bosqichli himoya yoqildi') : tr("Ikki bosqichli himoya o'chirildi"), 'lock-closed'); }} />
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
        <Segmented<Role> value={role} onChange={r => { updateUser({ role: r }); p.logEvent(tr("Rol o'zgartirildi: {role}", { role: ROLES.find(x => x.id === r)?.label ?? r })); }} items={ROLES.map(r => ({ id: r.id, label: r.short }))} />
        {ROLES.map(r => (
          <Row key={r.id} gap={10} style={{ alignItems: 'flex-start', opacity: r.id === role ? 1 : 0.55 }}>
            <Ionicons name={r.id === role ? 'radio-button-on' : 'radio-button-off'} size={18} color={r.id === role ? c.brandDeep : c.faint} />
            <View style={{ flex: 1 }}>
              <Txt v="small" style={{ fontFamily: F.heavy }}>{r.label}</Txt>
              <Txt v="tiny" faint>{r.can}</Txt>
            </View>
          </Row>
        ))}
        <Txt v="tiny" faint>{tr("Demo rejim: rolni o'zingiz almashtira olasiz. Haqiqiy tizimda rollarni faqat administrator beradi.")}</Txt>
        {role !== 'user' && <ListItem icon="key-outline" iconColor={c.danger} title={tr("Moderatsiya paneliga o'tish")} onPress={() => router.push('/moderation')} />}
      </Card>

      <SectionTitle>{tr("Ma'lumotlar")}</SectionTitle>
      <Card style={{ padding: 6 }}>
        <ListItem icon="cloud-download-outline" title={tr("Ma'lumotlarim nusxasi")} sub={tr("Profil, loyihalar, e'lonlar — JSON")} onPress={backup} />
        <ListItem icon="server-outline" title={tr('Avtomatik zaxira nusxa')} sub={tr('Har kuni · 35 kun saqlanadi')} right={<Badge label={tr('Yoqilgan')} tone="ok" />} />
        <ListItem icon="document-lock-outline" title={tr('Saqlash qoidalari')} onPress={() => router.push({ pathname: '/legal', params: { doc: 'retention' } })} />
        <ListItem icon="trash-outline" title={tr("Hisobni o'chirish")} danger onPress={() => confirm(tr("Hisobni o'chirasizmi?"), tr("Barcha loyihalar, e'lonlar va xabarlar o'chiriladi. Bu amalni qaytarib bo'lmaydi."), () => {
          p.resetPlatform(); deleteAccount(); router.replace('/login'); toast(tr("Hisob o'chirildi"), 'trash');
        }, tr("O'chirish"))} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monitor: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18 },
});
