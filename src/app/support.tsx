import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { useStartChat } from '@/lib/actions';

import { toast } from '@/components/toast';
import { Card, Divider, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { tr, tx } from '@/lib/i18n';

const FAQ = [
  [tx('Loyihani qanday joylashtiraman?'), tx("Pastki menyudagi «+ Loyiha» tugmasini bosing, formani to'ldiring va «Yuborish»ni bosing. Moderatsiyadan so'ng loyiha katalogda va qidiruvda ko'rinadi. Oddiy joylashtirish bepul.")],
  [tx("Nega loyiham hali ko'rinmayapti?"), tx("Barcha loyiha va e'lonlar moderatsiyadan o'tadi. Odatda bir necha daqiqa, shubhali e'lonlar uchun 24 soatgacha. Rad etilsa, sabab Kabinet → Mening loyihalarim bo'limida ko'rsatiladi.")],
  [tx('«Tasdiqlangan» belgisini qanday olaman?'), tx("Kabinet → Profilni tasdiqlash bo'limida hujjatlarni yuklang. Belgi faqat moderator tekshiruvidan keyin beriladi.")],
  [tx('Investor bilan qanday bog\'lanaman?'), tx("YUMS Invest bo'limida investorni tanlab «Taklif yuborish»ni bosing. Investor so'rovni qabul qilgach, yozishma va onlayn uchrashuv belgilash mumkin bo'ladi.")],
  [tx('Firibgarlikka duch keldim'), tx("E'lon yoki profil sahifasidagi bayroqcha tugmasi orqali shikoyat qiling. Oldindan to'lovni shaxsiy kartaga o'tkazmang — faqat rasmiy shartnoma va to'lov hamkorlari orqali.")],
  [tx('Narx qanday hisoblanadi?'), tx("Narx tarif, masofa va taxminiy vaqtga qarab buyurtmadan oldin ko'rsatiladi. Talab yuqori bo'lgan soatlarda koeffitsient qo'llanishi mumkin — u albatta oldindan ko'rsatiladi.")],
  [tx('Buyurtmani qanday bekor qilaman?'), tx("Haydovchi qidirilayotganda bepul bekor qilasiz. Haydovchi yo'lga chiqqandan keyin ham bekor qilish mumkin, lekin tez-tez bekor qilish reytingga ta'sir qiladi.")],
  [tx('Bepul kutish necha daqiqa?'), tx("Haydovchi yetib kelgach 3 daqiqa bepul kutadi. Keyin har daqiqa tarif bo'yicha hisoblanadi.")],
  [tx('Buyumimni mashinada unutdim'), tx("Safarlar tarixidan safarni oching va «Muammo haqida xabar berish»ni bosing — haydovchi bilan bog'lab qo'yamiz.")],
  [tx('Keshbek qanday ishlaydi?'), tx("Karta yoki naqd to'lagan har bir safardan 3% YUMS balansga qaytadi. Balans bilan keyingi safarlarni to'lashingiz mumkin.")],
];

export default function Support() {
  const { colors: c } = useStore();
  const start = useStartChat();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen title={tr('Yordam')}>
      <Card style={{ padding: 6 }}>
        <ListItem icon="chatbubbles" iconBg={c.brandSoft} title={tr('Ilovada yozish')} sub={tr("YUMS qo'llab-quvvatlash · 24/7")} onPress={() => start({ peerId: 'support', peerName: "YUMS qo'llab-quvvatlash", peerKind: 'support', peerVerified: true })} />
        <ListItem icon="paper-plane" iconBg="#E3F2FD" iconColor="#229ED9" title={tr('Telegram orqali yozish')} sub={tr('Odatda 2 daqiqada javob beramiz')} onPress={() => Linking.openURL('https://t.me/').catch(() => toast(tr('Telegram ochilmadi'), 'alert-circle'))} />
        <ListItem icon="call" iconBg={c.okSoft} iconColor={c.ok} title={tr("Qo'ng'iroq qilish")} sub={tr('24/7 · bepul')} onPress={() => Linking.openURL('tel:+998712000000').catch(() => {})} />
      </Card>

      <SectionTitle>{tr("Ko'p beriladigan savollar")}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {FAQ.map(([q, a], i) => (
          <View key={q}>
            {i > 0 && <Divider />}
            <Pressable onPress={() => setOpen(open === i ? null : i)} style={{ paddingVertical: 14 }}>
              <Row>
                <Txt v="h3" style={{ flex: 1 }}>{tr(q)}</Txt>
                <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={c.faint} />
              </Row>
              {open === i && <Txt muted style={{ marginTop: 8, lineHeight: 21 }}>{tr(a)}</Txt>}
            </Pressable>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
