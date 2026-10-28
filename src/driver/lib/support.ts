// Haydovchilar yordam markazi: savol-javoblar, qo'ng'iroq va chatdagi avtomatik javoblar.
import { Linking, Platform } from 'react-native';

import { toast } from '@/components/toast';

import { ACTIVITY, COMMISSION, FREE_WAIT_SEC, WAIT_PER_MIN } from './driver-store';

export const SUPPORT_PHONE = '+998 71 200 00 00';
export const SUPPORT_TELEGRAM = 'https://t.me/yums_driver_support';

export type Faq = { q: string; a: string; keys: string[] };
export type FaqGroup = { title: string; icon: 'wallet' | 'car' | 'pulse' | 'document-text' | 'shield-checkmark'; items: Faq[] };

export const FAQ: FaqGroup[] = [
  {
    title: "To'lov va balans", icon: 'wallet', items: [
      { q: 'Pul kartaga qachon tushadi?', a: "Karta orqali to'langan safarlar darhol balansga tushadi. «Daromad → Pul yechish» orqali istalgan vaqtda kartaga o'tkazasiz: 1–2 daqiqada, xizmat haqi 1% (kamida 1 000 so'm).", keys: ['pul', 'karta', 'yechish', 'balans', 'tushadi', "to'lov"] },
      { q: 'Naqd safar komissiyasi qanday yechiladi?', a: `Naqd safarda pulni yo'lovchidan o'zingiz olasiz, YUMS komissiyasi (${COMMISSION * 100}%) esa balansingizdan yechiladi.`, keys: ['naqd', 'komissiya'] },
      { q: "Balans manfiy bo'lsa nima bo'ladi?", a: "Manfiy balans keyingi karta safarlari hisobidan avtomatik yopiladi. Uzoq vaqt manfiy qolsa, liniyaga chiqish cheklanishi mumkin.", keys: ['manfiy', 'qarz', 'minus'] },
    ],
  },
  {
    title: 'Buyurtmalar', icon: 'car', items: [
      { q: 'Mijoz chiqmasa nima qilaman?', a: `Yetib kelgach ${FREE_WAIT_SEC / 60} daqiqa bepul kutasiz, keyin har daqiqa ${WAIT_PER_MIN} so'mdan hisoblanadi. Pullik kutish boshlanganidan 2 daqiqa o'tib «⋯ → Mijoz chiqmadi» tugmasi paydo bo'ladi: faollik kamaymaydi, kutish uchun kompensatsiya olasiz.`, keys: ['chiqmadi', 'kutish', 'mijoz', 'kelmadi'] },
      { q: 'Zanjir buyurtma nima?', a: "Safar tugashiga 2 km qolganda keyingi buyurtma manzilingiz yaqinidan taklif qilinadi. Qabul qilsangiz, joriy safarni yakunlab, darhol keyingi mijozga yo'l olasiz.", keys: ['zanjir', 'keyingi'] },
      { q: 'Buyurtmani bekor qilsam nima bo\'ladi?', a: `Qabul qilingan buyurtmani bekor qilish faollikni ${Math.abs(ACTIVITY.cancel)} ballga kamaytiradi. Mijoz bilan muammo bo'lsa, avval chatda yoki qo'ng'iroq orqali bog'laning.`, keys: ['bekor', 'otmen'] },
    ],
  },
  {
    title: 'Faollik va reyting', icon: 'pulse', items: [
      { q: 'Faollik nima va qanday oshiriladi?', a: `Faollik 0–100 ball. Har bir qabul qilingan buyurtma +${ACTIVITY.accept}, rad etish yoki o'tkazib yuborish ${ACTIVITY.decline}. Faollik 70 dan yuqori bo'lsa, buyurtmalar sizga birinchi navbatda taklif qilinadi.`, keys: ['faollik', 'ball', 'aktiv'] },
      { q: 'Reyting qanday hisoblanadi?', a: "So'nggi 50 ta baho o'rtachasi. Toza mashina, xushmuomalalik va xavfsiz haydash reytingni oshiradi. Komfort tarifi uchun 4.70, Biznes uchun 4.85 dan yuqori reyting kerak.", keys: ['reyting', 'baho', 'yulduz'] },
    ],
  },
  {
    title: 'Hujjatlar va tariflar', icon: 'document-text', items: [
      { q: 'Hujjatlar qancha vaqtda tekshiriladi?', a: "Odatda bir necha daqiqada. Rasm aniq va butun bo'lsin, muddati o'tmagan bo'lsin. Rad etilsa, sababi hujjat ichida yoziladi — tuzatib qayta yuborasiz.", keys: ['hujjat', 'tekshir', 'guvohnoma', 'pasport', 'litsenziya', 'osago'] },
      { q: 'Nega tarif yopiq?', a: "Har bir tarifning shartlari bor: hujjatlar, avtomobil sinfi va yili, reyting, safarlar soni. «Avtomobil va tariflar» bo'limida tarifni bossangiz, qaysi shart bajarilmagani va uni qanday bajarish ko'rsatiladi.", keys: ['tarif', 'yopiq', 'komfort', 'biznes', 'miniven', 'yetkazish'] },
      { q: 'Avtomobilni qanday almashtiraman?', a: "«Avtomobil va tariflar → O'zgartirish». Yangi avtomobil uchun texnik pasport qayta tekshiriladi.", keys: ['avtomobil', 'mashina', 'almashtir'] },
    ],
  },
  {
    title: 'Xavfsizlik', icon: 'shield-checkmark', items: [
      { q: 'Favqulodda vaziyatda nima qilaman?', a: "Safar paytida «⋯ → Xavfsizlik · 112» tugmasi bor. Xavfli yo'lovchi haqida yordam markaziga darhol xabar bering — safar ma'lumotlari saqlanadi.", keys: ['xavf', 'sos', '112', 'avariya', 'favqulodda'] },
    ],
  },
];

/** Chatdagi savolga mos javob (kalit so'zlar bo'yicha) */
export function autoAnswer(text: string): Faq | null {
  const t = text.toLowerCase();
  let best: Faq | null = null, score = 0;
  for (const g of FAQ) for (const f of g.items) {
    const s = f.keys.filter(k => t.includes(k)).length;
    if (s > score) { score = s; best = f; }
  }
  return best;
}

/** Qo'ng'iroq: telefonda — raqam teriladi, vebda raqam ko'rsatiladi */
export function callNumber(n: string) {
  if (Platform.OS === 'web') { toast(`Qo'ng'iroq qiling: ${n}`, 'call'); return; }
  Linking.openURL(`tel:${n.replace(/\s/g, '')}`).catch(() => toast(`Qo'ng'iroq qiling: ${n}`, 'call'));
}

export function openTelegram() {
  if (Platform.OS === 'web') { toast('Telegram: @yums_driver_support', 'paper-plane'); return; }
  Linking.openURL(SUPPORT_TELEGRAM).catch(() => toast('Telegram: @yums_driver_support', 'paper-plane'));
}
