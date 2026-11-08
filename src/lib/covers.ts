import type { ImageSource } from 'expo-image';

import type { Project } from './platform-data';

// Reklama va taksi kartasi uchun tayyor bannerlar (2:1)
export const AD_BANNER = require('@/assets/banners/silk-road.webp');
export const TAXI_CARD = require('@/assets/banners/taxi-card.webp');

/** Loyiha muqovasi: egasi yuklagan rasm (bo'lmasa soha belgisi ko'rsatiladi) */
export function coverOf(p: Pick<Project, 'id' | 'cover'>): ImageSource | number | undefined {
  return p.cover ? { uri: p.cover } : undefined;
}
