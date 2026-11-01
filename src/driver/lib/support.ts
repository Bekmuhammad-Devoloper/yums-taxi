// Haydovchilar yordam markazi: savol-javoblar, qo'ng'iroq va chatdagi avtomatik javoblar.
import { Linking, Platform } from 'react-native';

import { toast } from '@/components/toast';
import { tr } from '@/lib/i18n';

import { ACTIVITY, COMMISSION, FREE_WAIT_SEC, WAIT_PER_MIN } from './driver-store';

export const SUPPORT_PHONE = '+998 71 200 00 00';
export const SUPPORT_TELEGRAM = 'https://t.me/yums_driver_support';

export type Faq = { q: string; a: string; keys: string[] };
export type FaqGroup = { title: string; icon: 'wallet' | 'car' | 'pulse' | 'document-text' | 'shield-checkmark'; items: Faq[] };

/**
 * Savol-javoblar joriy tilda (chaqirilgan paytda tarjima qilinadi). Kalit so'zlar — o'zbek, rus, ingliz, tojik va arab
 * tillarida (so'z o'zagi), chatdagi avtomatik javob shular bo'yicha topiladi.
 */
export function faqGroups(): FaqGroup[] {
  return [
    {
      title: tr("To'lov va balans"), icon: 'wallet', items: [
        { q: tr('Pul kartaga qachon tushadi?'), a: tr("Karta orqali to'langan safarlar darhol balansga tushadi. «Daromad → Pul yechish» orqali istalgan vaqtda kartaga o'tkazasiz: 1–2 daqiqada, xizmat haqi 1% (kamida 1 000 so'm)."), keys: ['pul', 'karta', 'yechish', 'balans', 'tushadi', "to'lov", 'деньг', 'карт', 'вывод', 'баланс', 'money', 'card', 'withdraw', 'balance', 'пул', 'корт', 'مال', 'بطاق', 'سحب', 'رصيد'] },
        { q: tr('Naqd safar komissiyasi qanday yechiladi?'), a: tr("Naqd safarda pulni yo'lovchidan o'zingiz olasiz, YUMS komissiyasi ({pct}%) esa balansingizdan yechiladi.", { pct: COMMISSION * 100 }), keys: ['naqd', 'komissiya', 'налич', 'комисс', 'cash', 'commission', 'нақд', 'نقد', 'عمولة'] },
        { q: tr("Balans manfiy bo'lsa nima bo'ladi?"), a: tr('Manfiy balans keyingi karta safarlari hisobidan avtomatik yopiladi. Uzoq vaqt manfiy qolsa, liniyaga chiqish cheklanishi mumkin.'), keys: ['manfiy', 'qarz', 'minus', 'минус', 'долг', 'negative', 'debt', 'қарз', 'سالب', 'دين'] },
      ],
    },
    {
      title: tr('Buyurtmalar'), icon: 'car', items: [
        { q: tr('Mijoz chiqmasa nima qilaman?'), a: tr("Yetib kelgach {free} daqiqa bepul kutasiz, keyin har daqiqa {perMin} so'mdan hisoblanadi. Pullik kutish boshlanganidan 2 daqiqa o'tib «⋯ → Mijoz chiqmadi» tugmasi paydo bo'ladi: faollik kamaymaydi, kutish uchun kompensatsiya olasiz.", { free: FREE_WAIT_SEC / 60, perMin: WAIT_PER_MIN }), keys: ['chiqmadi', 'kutish', 'mijoz', 'kelmadi', 'не вышел', 'ожидан', 'клиент', 'no-show', 'wait', 'passenger', 'интизор', 'мизоҷ', 'انتظار', 'الراكب'] },
        { q: tr('Zanjir buyurtma nima?'), a: tr("Safar tugashiga 2 km qolganda keyingi buyurtma manzilingiz yaqinidan taklif qilinadi. Qabul qilsangiz, joriy safarni yakunlab, darhol keyingi mijozga yo'l olasiz."), keys: ['zanjir', 'keyingi', 'цепоч', 'следующ', 'chain', 'next', 'занҷир', 'سلسل', 'التالي'] },
        { q: tr("Buyurtmani bekor qilsam nima bo'ladi?"), a: tr("Qabul qilingan buyurtmani bekor qilish faollikni {n} ballga kamaytiradi. Mijoz bilan muammo bo'lsa, avval chatda yoki qo'ng'iroq orqali bog'laning.", { n: Math.abs(ACTIVITY.cancel) }), keys: ['bekor', 'otmen', 'отмен', 'cancel', 'бекор', 'إلغاء'] },
      ],
    },
    {
      title: tr('Faollik va reyting'), icon: 'pulse', items: [
        { q: tr('Faollik nima va qanday oshiriladi?'), a: tr("Faollik 0–100 ball. Har bir qabul qilingan buyurtma +{accept}, rad etish yoki o'tkazib yuborish {decline}. Faollik 70 dan yuqori bo'lsa, buyurtmalar sizga birinchi navbatda taklif qilinadi.", { accept: ACTIVITY.accept, decline: ACTIVITY.decline }), keys: ['faollik', 'ball', 'aktiv', 'активн', 'activity', 'фаъол', 'نشاط'] },
        { q: tr('Reyting qanday hisoblanadi?'), a: tr("So'nggi 50 ta baho o'rtachasi. Toza mashina, xushmuomalalik va xavfsiz haydash reytingni oshiradi. Komfort tarifi uchun 4.70, Biznes uchun 4.85 dan yuqori reyting kerak."), keys: ['reyting', 'baho', 'yulduz', 'рейтинг', 'оценк', 'rating', 'star', 'баҳо', 'تقييم'] },
      ],
    },
    {
      title: tr('Hujjatlar va tariflar'), icon: 'document-text', items: [
        { q: tr('Hujjatlar qancha vaqtda tekshiriladi?'), a: tr("Odatda bir necha daqiqada. Rasm aniq va butun bo'lsin, muddati o'tmagan bo'lsin. Rad etilsa, sababi hujjat ichida yoziladi — tuzatib qayta yuborasiz."), keys: ['hujjat', 'tekshir', 'guvohnoma', 'pasport', 'litsenziya', 'osago', 'документ', 'провер', 'права', 'лиценз', 'осаго', 'document', 'license', 'licence', 'insurance', 'ҳуҷҷат', 'مستند', 'رخصة', 'وثيق'] },
        { q: tr('Nega tarif yopiq?'), a: tr("Har bir tarifning shartlari bor: hujjatlar, avtomobil sinfi va yili, reyting, safarlar soni. «Avtomobil va tariflar» bo'limida tarifni bossangiz, qaysi shart bajarilmagani va uni qanday bajarish ko'rsatiladi."), keys: ['tarif', 'yopiq', 'komfort', 'biznes', 'miniven', 'yetkazish', 'тариф', 'комфорт', 'бизнес', 'tariff', 'comfort', 'business', 'فئة', 'تعرفة'] },
        { q: tr('Avtomobilni qanday almashtiraman?'), a: tr("«Avtomobil va tariflar → O'zgartirish». Yangi avtomobil uchun texnik pasport qayta tekshiriladi."), keys: ['avtomobil', 'mashina', 'almashtir', 'автомоб', 'машин', 'сменить', 'car', 'vehicle', 'мошин', 'سيارة'] },
      ],
    },
    {
      title: tr('Xavfsizlik'), icon: 'shield-checkmark', items: [
        { q: tr('Favqulodda vaziyatda nima qilaman?'), a: tr("Safar paytida «⋯ → Xavfsizlik · 112» tugmasi bor. Xavfli yo'lovchi haqida yordam markaziga darhol xabar bering — safar ma'lumotlari saqlanadi."), keys: ['xavf', 'sos', '112', 'avariya', 'favqulodda', 'опасн', 'авари', 'безопас', 'danger', 'accident', 'emergency', 'safety', 'хатар', 'خطر', 'طوارئ', 'حادث'] },
      ],
    },
  ];
}

/** Chatdagi savolga mos javob (kalit so'zlar bo'yicha) */
export function autoAnswer(text: string): Faq | null {
  const t = text.toLowerCase();
  let best: Faq | null = null, score = 0;
  for (const g of faqGroups()) for (const f of g.items) {
    const s = f.keys.filter(k => t.includes(k)).length;
    if (s > score) { score = s; best = f; }
  }
  return best;
}

/** Qo'ng'iroq: telefonda — raqam teriladi, vebda raqam ko'rsatiladi */
export function callNumber(n: string) {
  if (Platform.OS === 'web') { toast(tr("Qo'ng'iroq qiling: {n}", { n }), 'call'); return; }
  Linking.openURL(`tel:${n.replace(/\s/g, '')}`).catch(() => toast(tr("Qo'ng'iroq qiling: {n}", { n }), 'call'));
}

export function openTelegram() {
  if (Platform.OS === 'web') { toast(tr('Telegram: @yums_driver_support'), 'paper-plane'); return; }
  Linking.openURL(SUPPORT_TELEGRAM).catch(() => toast(tr('Telegram: @yums_driver_support'), 'paper-plane'));
}
