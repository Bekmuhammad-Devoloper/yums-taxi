// Ilova qayerdan tarqatiladi: Google Play, App Store yoki GitHub'dagi APK.
// Play yig'ilishida EXPO_PUBLIC_STORE=play (.github/workflows/play-bundle.yml); iOS ilova faqat App Store /
// TestFlight orqali tarqatiladi. Do'kon qoidalariga ko'ra:
//  - ilova o'zini o'zi yangilamaydi (yangilanishni do'kon beradi);
//  - raqamli xizmatlar (tariflar, TOP, reklama) faqat do'konning o'z to'lovi orqali sotiladi (Google Play
//    Billing / Apple In-App Purchase) — u ulanmaguncha sotib olish tugmalari ko'rinmaydi. Taksi, balans
//    to'ldirish va haydovchi to'lovlari (jismoniy xizmat) o'zgarmaydi.
import { Platform } from 'react-native';

/** Google Play'dan o'rnatilgan yig'ilish */
export const PLAY_BUILD = process.env.EXPO_PUBLIC_STORE === 'play';

/** App Store / TestFlight'dan o'rnatilgan yig'ilish (iOS'da boshqa yo'l yo'q) */
export const APP_STORE_BUILD = Platform.OS === 'ios';

/** Tarif, TOP va reklamani ilova ichida sotib olish mumkinmi (do'konlarda — ularning to'lovi ulangach) */
export const DIGITAL_SALES = !PLAY_BUILD && !APP_STORE_BUILD;
