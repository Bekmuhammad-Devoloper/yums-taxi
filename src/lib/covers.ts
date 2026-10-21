import type { ImageSource } from 'expo-image';

import type { Project } from './platform-data';

// Namuna loyihalar va reklamalar uchun tayyor bannerlar (16:9 va 2:1)
const SEED_COVERS: Record<string, number> = {
  p1: require('@/assets/covers/p1-agrosmart.webp'),
  p2: require('@/assets/covers/p2-edubridge.webp'),
  p11: require('@/assets/covers/p11-yums-taxi.webp'),
};

export const AD_BANNER = require('@/assets/banners/silk-road.webp');

/** Loyiha muqovasi: foydalanuvchi yuklagan rasm, bo'lmasa namuna banner */
export function coverOf(p: Pick<Project, 'id' | 'cover'>): ImageSource | number | undefined {
  if (p.cover) return { uri: p.cover };
  return SEED_COVERS[p.id];
}
