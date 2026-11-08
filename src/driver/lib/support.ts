// Haydovchilar yordam markazi: savol-javoblar, qo'ng'iroq va chatdagi avtomatik javoblar.
import { Linking, Platform } from 'react-native';

import { toast } from '@/components/toast';
import { tr } from '@/lib/i18n';

import type { DriverRules } from './driver-store';

export const SUPPORT_PHONE = '+998 71 200 00 00';
export const SUPPORT_TELEGRAM = 'https://t.me/yums_driver_support';

export type Faq = { q: string; a: string; keys: string[] };
export type FaqGroup = { title: string; icon: 'wallet' | 'car' | 'pulse' | 'document-text' | 'shield-checkmark'; items: Faq[] };

/**
 * Savol-javoblar joriy tilda (chaqirilgan paytda tarjima qilinadi). Kalit so'zlar qidiruv uchun.
 */
export function faqGroups(rules: DriverRules, commission: number): FaqGroup[] {
  return [
    {
      title: tr("To'lov va balans"), icon: 'wallet', items: [
        { q: tr('Pul kartaga qachon tushadi?'), a: tr("Karta va balans orqali to'langan safarlar darhol balansga tushadi. «Daromad → Pul yechish» orqali so'rov yuborasiz: summa balansdan darhol ushlanadi, moliya bo'limi uni kartangizga o'tkazadi va natija bildirishnomada keladi."), keys: ['pul', 'karta', 'yechish', 'balans', 'tushadi', "to'lov", 'деньг', 'карт', 'вывод', 'баланс', 'money', 'card', 'withdraw', 'balance', 'пул', 'корт', 'مال', 'بطاق', 'سحب', 'رصيد'] },
        { q: tr('Naqd safar komissiyasi qanday yechiladi?'), a: tr("Naqd safarda pulni yo'lovchidan o'zingiz olasiz, YUMS komissiyasi ({sum}) esa balansingizdan yechiladi.", { sum: tr("{n} so'm", { n: commission }) }), keys: ['naqd', 'komissiya', 'налич', 'комисс', 'cash', 'commission', 'нақд', 'نقد', 'عمولة'] },
        { q: tr("Balans manfiy bo'lsa nima bo'ladi?"), a: tr("Balans minimal miqdordan kam bo'lsa, yangi buyurtma olinmaydi va liniyadan chiqasiz. Balansni Click yoki karta orqali to'ldirgach, yana liniyaga chiqasiz."), keys: ['manfiy', 'qarz', 'minus', 'минус', 'долг', 'negative', 'debt', 'қарз', 'سالب', 'دين'] },
      ],
    },
    {
      title: tr('Buyurtmalar'), icon: 'car', items: [
        { q: tr('Mijoz chiqmasa nima qilaman?'), a: tr("Yetib kelgach {free} daqiqa bepul kutasiz, keyin har daqiqa {perMin} so'mdan narxga qo'shiladi. Pullik kutish boshlanganidan {after} daqiqa o'tib «⋯ → Mijoz chiqmadi» tugmasi paydo bo'ladi: buyurtma yopiladi, faollik kamaymaydi.", { free: Math.round(rules.freeWaitSec / 60), perMin: rules.waitPerMin, after: Math.round(rules.noShowAfterSec / 60) }), keys: ['chiqmadi', 'kutish', 'mijoz', 'kelmadi', 'не вышел', 'ожидан', 'клиент', 'no-show', 'wait', 'passenger', 'интизор', 'мизоҷ', 'انتظار', 'الراكب'] },
        ...(rules.chainRadiusKm > 0 ? [{ q: tr('Zanjir buyurtma nima?'), a: tr("Safar tugashiga {km} km qolganda, manzilingizdan {km} km ichidagi yangi buyurtma taklif qilinishi mumkin («Zanjir» belgisi bilan). Qabul qilsangiz, u joriy safar tugagach avtomatik boshlanadi; yo'lovchi sizni xaritada ko'radi. Undan «⋯ → Keyingi buyurtmadan voz kechish» orqali voz kechish mumkin (faollik {cancel}).", { km: rules.chainRadiusKm, cancel: rules.activity.cancel }), keys: ['zanjir', 'keyingi', 'цепоч', 'следующ', 'chain', 'next', 'занҷир', 'سلسلة', 'التالي'] }] : []),
        { q: tr("Buyurtmani bekor qilsam nima bo'ladi?"), a: tr("Qabul qilingan buyurtmani bekor qilish faollikni {n} ballga kamaytiradi. Mijoz bilan muammo bo'lsa, avval chatda yoki qo'ng'iroq orqali bog'laning.", { n: Math.abs(rules.activity.cancel) }), keys: ['bekor', 'otmen', 'отмен', 'cancel', 'бекор', 'إلغاء'] },
      ],
    },
    {
      title: tr('Faollik va reyting'), icon: 'pulse', items: [
        { q: tr('Faollik nima va qanday oshiriladi?'), a: tr("Faollik 0–100 ball. Har bir qabul qilingan buyurtma +{accept}, rad etish yoki o'tkazib yuborish {decline}. Faollik 70 dan yuqori bo'lsa, buyurtmalar sizga birinchi navbatda taklif qilinadi.", { accept: rules.activity.accept, decline: rules.activity.decline }), keys: ['faollik', 'ball', 'aktiv', 'активн', 'activity', 'фаъол', 'نشاط'] },
        { q: tr('Reyting qanday hisoblanadi?'), a: tr("Yo'lovchilar qo'ygan barcha baholarning o'rtachasi. Toza mashina, xushmuomalalik va xavfsiz haydash reytingni oshiradi. Komfort tarifi uchun 4.70, Biznes uchun 4.85 dan yuqori reyting kerak."), keys: ['reyting', 'baho', 'yulduz', 'рейтинг', 'оценк', 'rating', 'star', 'баҳо', 'تقييم'] },
      ],
    },
    {
      title: tr('Hujjatlar va tariflar'), icon: 'document-text', items: [
        { q: tr('Hujjatlar qancha vaqtda tekshiriladi?'), a: tr("Hujjatlarni YUMS operatori tekshiradi, natija bildirishnomada keladi. Rasm aniq va butun bo'lsin, muddati o'tmagan bo'lsin. Rad etilsa, sababi hujjat ichida yoziladi — tuzatib qayta yuborasiz."), keys: ['hujjat', 'tekshir', 'guvohnoma', 'pasport', 'litsenziya', 'osago', 'документ', 'провер', 'права', 'лиценз', 'осаго', 'document', 'license', 'licence', 'insurance', 'ҳуҷҷат', 'مستند', 'رخصة', 'وثيق'] },
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

/** Qo'ng'iroq: telefonda — raqam teriladi, vebda raqam ko'rsatiladi */
export function callNumber(n: string) {
  if (Platform.OS === 'web') { toast(tr("Qo'ng'iroq qiling: {n}", { n }), 'call'); return; }
  Linking.openURL(`tel:${n.replace(/\s/g, '')}`).catch(() => toast(tr("Qo'ng'iroq qiling: {n}", { n }), 'call'));
}

export function openTelegram() {
  if (Platform.OS === 'web') { toast(tr('Telegram: @yums_driver_support'), 'paper-plane'); return; }
  Linking.openURL(SUPPORT_TELEGRAM).catch(() => toast(tr('Telegram: @yums_driver_support'), 'paper-plane'));
}
