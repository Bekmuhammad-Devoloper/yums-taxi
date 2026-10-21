import type { ImageSource } from 'expo-image';

import type { Project } from './platform-data';

// Namuna loyihalar va reklamalar uchun tayyor bannerlar (16:9 va 2:1)
const SEED_COVERS: Record<string, number> = {
  p1: require('@/assets/covers/p1-agrosmart.jpg'),
  p2: require('@/assets/covers/p2-edubridge.jpg'),
};

export const AD_BANNER = require('@/assets/banners/silk-road.jpg');
export const TAXI_BANNER = require('@/assets/banners/yums-taxi.jpg');

/** Loyiha muqovasi: foydalanuvchi yuklagan rasm, bo'lmasa namuna banner */
export function coverOf(p: Pick<Project, 'id' | 'cover'>): ImageSource | number | undefined {
  if (p.cover) return { uri: p.cover };
  return SEED_COVERS[p.id];
}
