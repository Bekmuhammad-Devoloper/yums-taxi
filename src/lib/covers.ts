import type { ImageSource } from 'expo-image';

import type { Project } from './platform-data';

/**
 * Namuna loyihalar uchun ilovadagi tayyor bannerlar (16:9). Backend ularni doimiy id bilan yaratadi
 * (seed 11: uuidOf('project:p1') …), shuning uchun har bazada — lokal ham, staging ham — id bir xil.
 */
const SEED_COVERS: Record<string, number> = {
  // p1 — AgroSmart: aqlli tomchilatib sug'orish
  '3fbde691-6de3-49ac-a14d-8f626111d4dc': require('@/assets/covers/p1-agrosmart.webp'),
  // p2 — EduBridge: o'zbek tilidagi onlayn universitet
  '990cf60b-3697-42de-adb9-7c128d487b6e': require('@/assets/covers/p2-edubridge.webp'),
  // p11 — YUMS Taxi: shaharlararo yo'nalishlar
  '53dc70cd-3dbd-47aa-af7b-9d9d3be8a3ac': require('@/assets/covers/p11-yums-taxi.webp'),
};

// Reklama va taksi kartasi uchun tayyor bannerlar (2:1)
export const AD_BANNER = require('@/assets/banners/silk-road.webp');
export const TAXI_CARD = require('@/assets/banners/taxi-card.webp');

/** Loyiha muqovasi: egasi yuklagan rasm, bo'lmasa namuna banner (yo'q bo'lsa — soha belgisi) */
export function coverOf(p: Pick<Project, 'id' | 'cover'>): ImageSource | number | undefined {
  if (p.cover) return { uri: p.cover };
  return SEED_COVERS[p.id];
}
