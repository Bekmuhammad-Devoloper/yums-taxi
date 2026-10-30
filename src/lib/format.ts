// Sana va vaqt: oy va hafta kunlari nomlari joriy ilova tilida.
import { getLang, type Lang } from './i18n';

const MONTHS: Record<Lang, string[]> = {
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  tg: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};
/** Hafta kunlari (yakshanbadan boshlab, Date.getDay() tartibida) */
const WEEKDAYS: Record<Lang, string[]> = {
  uz: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  tg: ['Яш', 'Дш', 'Сш', 'Чш', 'Пш', 'Ҷм', 'Шб'],
  ar: ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
};

const pad = (n: number) => String(n).padStart(2, '0');

/** «14:05» */
export const fmtTime = (iso: string | number | Date) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** «14 mar, 10:20» */
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[getLang()][d.getMonth()]}, ${fmtTime(d)}`;
};

/** «14 mar» */
export const fmtDay = (iso: string | number | Date) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[getLang()][d.getMonth()]}`;
};

/** Hafta kunining qisqa nomi */
export const weekdayShort = (d: Date) => WEEKDAYS[getLang()][d.getDay()];
