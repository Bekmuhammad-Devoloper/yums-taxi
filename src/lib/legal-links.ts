// Maxfiylik siyosati va hisobni o'chirish — ochiq veb-sahifalar (backend: GET /legal/privacy, /legal/account-deletion).
// Google Play talabi: siyosat havolasi do'kon sahifasida ham, ilovaning ichida ham bo'lishi kerak.
import { Linking } from 'react-native';

import { toast } from '@/components/toast';
import { API_URL } from '@/lib/api';
import { tr } from '@/lib/i18n';

export type LegalPage = 'privacy' | 'account-deletion';

/** Sahifalar o'zbek, rus va ingliz tilida; boshqa tilda brauzer tili tanlaydi */
const WEB_LANGS = ['uz', 'ru', 'en'];

export const legalUrl = (page: LegalPage, lang?: string) =>
  `${API_URL}/legal/${page}${lang && WEB_LANGS.includes(lang) ? `?lang=${lang}` : ''}`;

export function openLegal(page: LegalPage, lang?: string) {
  Linking.openURL(legalUrl(page, lang)).catch(() => toast(tr('Havola ochilmadi'), 'alert-circle'));
}
