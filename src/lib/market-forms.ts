// E'lon turiga qarab forma: tovar, raqamli mahsulot va xizmat har biri o'z maydonlari va so'zlari bilan.
// Server e'londa uchta umumiy matn maydonini saqlaydi — har bir tur ularga o'z ma'nosini beradi:
//   unit     — tovarda birlik (kg, dona…), raqamlida to'lov turi (bir martalik/obuna), xizmatda narx turi (soat…);
//   delivery — tovarda yetkazib berish, raqamlida olish usuli, xizmatda ish formati;
//   minOrder — tovarda minimal buyurtma, raqamlida format (kurs, shablon…), xizmatda bajarish muddati.
// Tanlov qiymatlari o'zbekcha saqlanadi va ekranda tr() bilan o'giriladi.
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import { tr } from '@/lib/i18n';
import type { MarketKind } from '@/lib/platform-data';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type Choice = { value: string; label: string; icon?: IconName };
type Slot = { label: string; icon: IconName; hint?: string; choices?: Choice[]; initial?: string };

export type MarketForm = {
  titleHint: string;
  priceLabel: string;
  descHint: string;
  imageLabel: string;
  /** Turga xos maydonlar kartasining sarlavhasi */
  section: string;
  unit: { label: string; choices: Choice[]; initial: string };
  delivery: Slot;
  minOrder: Slot;
};

const own = (value: string, icon?: IconName): Choice => ({ value, label: tr(value), icon });

export function marketForm(kind: MarketKind): MarketForm {
  if (kind === 'digital') {
    return {
      titleHint: tr('Masalan: Excel moliyaviy model shabloni'),
      priceLabel: tr('Narx (USD)'),
      descHint: tr('Ichida nima bor, kimga foydali, tizim talablari…'),
      imageLabel: tr('Muqova rasmi'),
      section: tr('Format va olish'),
      unit: {
        label: tr("To'lov turi"),
        choices: [{ value: 'nusxa', label: tr('Bir martalik'), icon: 'bag-check-outline' }, { value: 'oy', label: tr('Oylik obuna'), icon: 'repeat-outline' }],
        initial: 'nusxa',
      },
      minOrder: {
        label: tr('Format'),
        icon: 'albums-outline',
        choices: [own('Kurs', 'school-outline'), own('Shablon', 'document-text-outline'), own('Dastur', 'code-slash-outline'), own('E-kitob', 'book-outline'), own('Boshqa', 'ellipsis-horizontal')],
      },
      delivery: {
        label: tr('Olish usuli'),
        icon: 'flash-outline',
        // tugmada qisqa nom, e'londa to'liq qiymat
        choices: [
          { value: 'Darhol yuklab olish', label: tr('Yuklab olish'), icon: 'download-outline' },
          { value: 'Havola emailga', label: tr('Emailga havola'), icon: 'mail-outline' },
          { value: 'Platformaga kirish', label: tr('Platformada'), icon: 'key-outline' },
        ],
        initial: 'Darhol yuklab olish',
      },
    };
  }
  if (kind === 'service') {
    return {
      titleHint: tr('Masalan: Mobil ilova ishlab chiqish'),
      priceLabel: tr('Narx, dan (USD)'),
      descHint: tr('Nima qilasiz, natija, tajribangiz va portfolio…'),
      imageLabel: tr('Portfolio rasmi'),
      section: tr('Ish shartlari'),
      unit: {
        label: tr('Narx turi'),
        choices: [{ value: 'soat', label: tr('Soatbay'), icon: 'time-outline' }, { value: 'loyiha', label: tr('Loyiha uchun'), icon: 'flag-outline' }, { value: 'oy', label: tr('Oylik'), icon: 'calendar-outline' }],
        initial: 'loyiha',
      },
      delivery: {
        label: tr('Ish formati'),
        icon: 'briefcase-outline',
        choices: [own('Masofaviy', 'globe-outline'), own('Joyida', 'location-outline'), own('Aralash', 'swap-horizontal-outline')],
        initial: 'Masofaviy',
      },
      minOrder: { label: tr('Bajarish muddati'), icon: 'hourglass-outline', hint: tr('Masalan: 2–4 hafta') },
    };
  }
  return {
    titleHint: tr("Masalan: Quritilgan o'rik"),
    priceLabel: tr('Narx (USD)'),
    descHint: tr('Sifat, sertifikatlar, saqlash shartlari…'),
    imageLabel: tr('Mahsulot rasmi'),
    section: tr('Yetkazib berish va buyurtma'),
    unit: { label: tr('Birlik'), choices: ['dona', 'kg', 'tonna', 'quti', 'litr', 'm²'].map(v => own(v)), initial: 'dona' },
    delivery: { label: tr('Yetkazib berish'), icon: 'car-outline', hint: tr('Masalan: DHL, 5–9 kun') },
    minOrder: { label: tr('Minimal buyurtma'), icon: 'layers-outline', hint: tr('Masalan: 100 kg') },
  };
}
