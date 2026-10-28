// Ovozli yo'riqnoma: yangi buyurtma, navigator burilishlari, safar holatlari.
// Qurilmada o'zbek ovozi bo'lmasa, tizimning standart ovozi ishlatiladi.
import * as Speech from 'expo-speech';

let enabled = true;

export const setVoiceEnabled = (v: boolean) => {
  enabled = v;
  if (!v) Speech.stop().catch(() => {});
};

/** Matnni o'qish; muhimi (yangi buyurtma) navbatdagi gaplarni to'xtatib o'qiladi */
export function say(text: string, urgent = false) {
  if (!enabled) return;
  try {
    if (urgent) Speech.stop().catch(() => {});
    Speech.speak(text, { language: 'uz-UZ', rate: 1.0 });
  } catch {
    // ovoz chiqarish imkoni yo'q (masalan, brauzer ruxsat bermadi)
  }
}

/** «23 000 so'm» → «23 ming so'm» — raqamlar tabiiyroq o'qiladi */
export const spokenSom = (n: number) => {
  const r = Math.round(n / 100) * 100;
  const th = Math.floor(r / 1000), rest = r % 1000;
  return th ? `${th} ming${rest ? ` ${rest}` : ''} so'm` : `${r} so'm`;
};
