// Ilova qayerdan tarqatiladi: Google Play yoki GitHub'dagi APK. Play yig'ilishida EXPO_PUBLIC_STORE=play
// (.github/workflows/play-bundle.yml) — Play qoidalariga ko'ra:
//  - ilova o'zini o'zi yangilamaydi (yangilanishni Play beradi);
//  - raqamli xizmatlar (tariflar, TOP, reklama) faqat Google Play Billing orqali sotiladi — u ulanmaguncha
//    ularni sotib olish tugmalari ko'rinmaydi. Taksi, balans to'ldirish va haydovchi to'lovlari o'zgarmaydi.

/** Google Play'dan o'rnatilgan yig'ilish */
export const PLAY_BUILD = process.env.EXPO_PUBLIC_STORE === 'play';

/** Tarif, TOP va reklamani ilova ichida sotib olish mumkinmi (Play'da — Play Billing ulangach) */
export const DIGITAL_SALES = !PLAY_BUILD;
