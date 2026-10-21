import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { toast } from '@/components/toast';
import { Card, Divider, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';

const FAQ = [
  ['Narx qanday hisoblanadi?', "Narx tarif, masofa va taxminiy vaqtga qarab buyurtmadan oldin ko'rsatiladi. Talab yuqori bo'lgan soatlarda koeffitsient qo'llanishi mumkin — u albatta oldindan ko'rsatiladi."],
  ['Buyurtmani qanday bekor qilaman?', "Haydovchi qidirilayotganda bepul bekor qilasiz. Haydovchi yo'lga chiqqandan keyin ham bekor qilish mumkin, lekin tez-tez bekor qilish reytingga ta'sir qiladi."],
  ['Bepul kutish necha daqiqa?', "Haydovchi yetib kelgach 3 daqiqa bepul kutadi. Keyin har daqiqa tarif bo'yicha hisoblanadi."],
  ['Buyumimni mashinada unutdim', "Safarlar tarixidan safarni oching va «Muammo haqida xabar berish»ni bosing — haydovchi bilan bog'lab qo'yamiz."],
  ['Keshbek qanday ishlaydi?', "Karta yoki naqd to'lagan har bir safardan 3% YUMS balansga qaytadi. Balans bilan keyingi safarlarni to'lashingiz mumkin."],
];

export default function Support() {
  const { colors: c } = useStore();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen title="Yordam">
      <Card style={{ padding: 6 }}>
        <ListItem icon="paper-plane" iconBg="#E3F2FD" iconColor="#229ED9" title="Telegram orqali yozish" sub="Odatda 2 daqiqada javob beramiz" onPress={() => Linking.openURL('https://t.me/').catch(() => toast('Telegram ochilmadi', 'alert-circle'))} />
        <ListItem icon="call" iconBg={c.okSoft} iconColor={c.ok} title="Qo'ng'iroq qilish" sub="24/7 · bepul" onPress={() => Linking.openURL('tel:+998712000000').catch(() => {})} />
      </Card>

      <SectionTitle>Ko'p beriladigan savollar</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {FAQ.map(([q, a], i) => (
          <View key={q}>
            {i > 0 && <Divider />}
            <Pressable onPress={() => setOpen(open === i ? null : i)} style={{ paddingVertical: 14 }}>
              <Row>
                <Txt v="h3" style={{ flex: 1 }}>{q}</Txt>
                <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={c.faint} />
              </Row>
              {open === i && <Txt muted style={{ marginTop: 8, lineHeight: 21 }}>{a}</Txt>}
            </Pressable>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
