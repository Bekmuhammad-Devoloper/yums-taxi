// Tarjima jadvallari: o'zbekcha matn → [rus, ingliz, tojik, arab]. Bo'limlar bo'yicha alohida fayllarda;
// to'liqligini `node scripts/i18n-check.mjs` tekshiradi (koddagi tr('…') matnlari va jadvallar solishtiriladi).
import common from './common';
import driver from './driver';
import platform from './platform';

export type Row = readonly [ru: string, en: string, tg: string, ar: string];

export const PHRASES: Record<string, Row> = { ...common, ...driver, ...platform };
