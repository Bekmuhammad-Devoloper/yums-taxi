import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, ListItem, Screen, Txt, type IconName } from '@/components/ui';
import { useStore } from '@/lib/store';

type Doc = { id: string; title: string; icon: IconName; updated: string; sections: [string, string][] };

const DOCS: Doc[] = [
  {
    id: 'terms', title: 'Foydalanish shartlari', icon: 'document-text-outline', updated: '21.10.2026',
    sections: [
      ['1. Umumiy qoidalar', "YUMS — loyihalar, kompaniyalar, mutaxassislar va xizmatlarni bog'lovchi xalqaro raqamli platforma. Ro'yxatdan o'tish orqali siz ushbu shartlarga rozilik bildirasiz. Platformadan 18 yoshdan oshgan shaxslar va qonuniy ro'yxatdan o'tgan tashkilotlar foydalanishi mumkin."],
      ['2. Hisob va profil', "Siz kiritgan ma'lumotlarning to'g'riligi uchun javobgarsiz. Bitta shaxs yoki kompaniya bitta asosiy hisobga ega bo'ladi. Hisobga kirish ma'lumotlarini boshqalarga bermang."],
      ["3. E'lonlar va loyihalar", "Barcha loyiha va e'lonlar moderatsiyadan o'tadi. YUMS foydalanuvchilar bergan ma'lumotlarni avtomatik ravishda haqiqat deb qabul qilmaydi; «Tasdiqlangan» belgisi faqat hujjatlar tekshiruvidan keyin beriladi."],
      ['4. Taqiqlangan faoliyat', "Firibgarlik, soxta investitsiya takliflari, «kafolatlangan daromad» va'dalari, moliyaviy piramidalar, noqonuniy tovar va xizmatlar, litsenziyasiz moliyaviy faoliyat, boshqalarning intellektual mulkini buzish taqiqlanadi."],
      ["5. To'lovlar va tariflar", "Oddiy joylashtirish bepul. Ustuvor ko'rsatish, obuna tariflari, reklama va professional xizmatlar pullik. Savdo bitimlaridan komissiya faqat qonuniy to'lov va shartnoma asosida olinadi."],
      ["6. Javobgarlik", "YUMS foydalanuvchilar o'rtasidagi bitimlarning tomoni emas. Platforma tomonlarni bog'laydi va nizolarni ko'rib chiqish tartibini taqdim etadi."],
      ['7. Nizolar', "Shikoyat va nizolar «Shikoyat qilish» funksiyasi orqali qabul qilinadi va 24 soat ichida ko'rib chiqiladi. Qoidabuzarlik aniqlansa, kontent bloklanishi yoki hisob cheklanishi mumkin."],
    ],
  },
  {
    id: 'privacy', title: 'Maxfiylik siyosati', icon: 'lock-closed-outline', updated: '21.10.2026',
    sections: [
      ["Qanday ma'lumot yig'iladi", "Ism, telefon yoki email, mamlakat, profil turi, siz joylashtirgan loyiha va e'lonlar, xabarlar, kirish tarixi (qurilma, vaqt). YUMS Taxi uchun — safar vaqtidagi joylashuv."],
      ['Maqsad', "Hisobni yuritish, qidiruv va tavsiyalar, moderatsiya va firibgarlikka qarshi kurash, xavfsizlik monitoringi, qonun talablarini bajarish."],
      ['Uchinchi shaxslarga berish', "Ma'lumotlar sotilmaydi. Faqat to'lov hamkorlari, xosting provayderi va qonuniy so'rov asosida vakolatli organlarga beriladi."],
      ['Sizning huquqlaringiz', "Ma'lumotlaringiz nusxasini olish (Xavfsizlik → Zaxira nusxa), tuzatish, o'chirish va qayta ishlashga e'tiroz bildirish. Yevropa Ittifoqi foydalanuvchilari uchun GDPR talablari qo'llaniladi."],
      ['Himoya', "Shifrlangan aloqa, ruxsat darajalari (foydalanuvchi, moderator, administrator), ikki bosqichli kirish, muntazam zaxira nusxalar va xavfsizlik monitoringi."],
    ],
  },
  {
    id: 'cookies', title: 'Cookie siyosati', icon: 'ellipse-outline', updated: '21.10.2026',
    sections: [
      ['Zarur cookie fayllar', 'Kirish holati, til va mavzu sozlamalari. Ularsiz platforma ishlamaydi.'],
      ['Analitika', "Anonimlashtirilgan foydalanish statistikasi — xizmatni yaxshilash uchun. Sozlamalarda o'chirish mumkin."],
      ['Reklama', "Faqat tekshirilgan reklama beruvchilar. Shaxsiylashtirilgan reklama faqat sizning roziligingiz bilan."],
    ],
  },
  {
    id: 'retention', title: "Ma'lumotlarni saqlash qoidalari", icon: 'server-outline', updated: '21.10.2026',
    sections: [
      ['Saqlash muddatlari', "Hisob ma'lumotlari — hisob faol ekan. Xabarlar — 3 yil. Kirish jurnali — 12 oy. To'lov hujjatlari — qonunchilikda belgilangan muddat (odatda 5 yil). O'chirilgan e'lonlar — 30 kun ichida butunlay o'chiriladi."],
      ['Zaxira nusxalar', "Har kuni shifrlangan zaxira nusxa olinadi va 35 kun saqlanadi."],
      ["Hisobni o'chirish", "Hisob o'chirilgach, shaxsiy ma'lumotlar 30 kun ichida o'chiriladi; qonun talab qiladigan yozuvlar bundan mustasno."],
    ],
  },
  {
    id: 'rules', title: 'Platforma va moderatsiya qoidalari', icon: 'shield-checkmark-outline', updated: '21.10.2026',
    sections: [
      ['Moderatsiya', "Har bir loyiha va e'lon avtomatik filtr va moderator tomonidan tekshiriladi. Shubhali e'lonlar qo'lda ko'rib chiqiladi."],
      ['Tasdiqlash belgisi', "Jismoniy shaxslar — shaxsni tasdiqlovchi hujjat va selfi; kompaniyalar — ro'yxatdan o'tganlik guvohnomasi va direktor hujjati. Belgi faqat tekshiruvdan keyin beriladi."],
      ['Shikoyat va bloklash', "Har qanday foydalanuvchi kontentga shikoyat qilishi yoki suhbatdoshni bloklashi mumkin. Takroriy qoidabuzarlikda hisob cheklanadi."],
      ['Litsenziyalanadigan faoliyat', "Moliya, investitsiya, tibbiyot, ta'lim va boshqa litsenziyalanadigan sohalarda tegishli ruxsatnoma talab qilinishi mumkin."],
    ],
  },
  {
    id: 'invest', title: 'Investitsiya bo\'yicha ogohlantirish', icon: 'trending-up-outline', updated: '21.10.2026',
    sections: [
      ['Muhim', "YUMS INVEST bo'limi investorlar va loyiha egalarini bog'laydi va moliyalashtirish takliflari haqida ma'lumot joylashtiradi. YUMS investitsiya maslahatchisi emas va mablag' qabul qilmaydi."],
      ['Risklar', "Startap va loyihalarga investitsiya yuqori riskli. Mablag'ning bir qismi yoki hammasini yo'qotish mumkin. Qaror qabul qilishdan oldin mustaqil tekshiruv (due diligence) o'tkazing."],
      ['Bitimlar', "Mablag' qabul qilish va bitimlar faqat tegishli litsenziyaga ega moliyaviy hamkorlar orqali, har bir mamlakat qonunchiligiga muvofiq amalga oshiriladi."],
    ],
  },
];

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const { colors: c } = useStore();
  const d = DOCS.find(x => x.id === doc);

  if (d) {
    return (
      <Screen title={d.title} subtitle={`Yangilangan: ${d.updated}`}>
        {d.sections.map(([h, body]) => (
          <Card key={h} style={{ gap: 6 }}>
            <Txt v="h3">{h}</Txt>
            <Txt muted style={{ lineHeight: 22 }}>{body}</Txt>
          </Card>
        ))}
        <Draft />
      </Screen>
    );
  }

  return (
    <Screen title="Huquqiy hujjatlar">
      <Card style={{ padding: 6 }}>
        {DOCS.map(x => <ListItem key={x.id} icon={x.icon} title={x.title} sub={`Yangilangan: ${x.updated}`} onPress={() => router.push({ pathname: '/legal', params: { doc: x.id } })} />)}
      </Card>
      <View style={[styles.note, { backgroundColor: c.surface2 }]}>
        <Ionicons name="mail-outline" size={18} color={c.muted} />
        <Txt v="small" muted style={{ flex: 1 }}>Ma'lumotlarni himoya qilish bo'yicha murojaatlar: privacy@yums.example</Txt>
      </View>
      <Draft />
    </Screen>
  );
}

function Draft() {
  const { colors: c } = useStore();
  return (
    <View style={[styles.note, { backgroundColor: c.warnSoft }]}>
      <Ionicons name="alert-circle-outline" size={18} color={c.warn} />
      <Txt v="small" color={c.warn} style={{ flex: 1, lineHeight: 19 }}>
        Hujjatlar dastlabki tahrirda. Ishga tushirishdan oldin har bir bozor (O'zbekiston, Yevropa Ittifoqi va boshqalar) uchun yurist bilan tekshirilishi kerak.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
});
