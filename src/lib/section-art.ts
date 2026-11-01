// Bo'limlar uchun 3D ikonkalar (shaffof fon). Yo'qlari chiziqli ikonka bilan ko'rsatiladi
export const SECTION_ART: Partial<Record<string, number>> = {
  project: require('@/assets/sections/project.webp'),
  business: require('@/assets/sections/business.webp'),
  invest: require('@/assets/sections/invest.webp'),
  market: require('@/assets/sections/market.webp'),
  technology: require('@/assets/sections/technology.webp'),
  connect: require('@/assets/sections/connect.webp'),
  world: require('@/assets/sections/world.webp'),
  taxi: require('@/assets/sections/taxi.webp'),
};

/** Keng rasmlar (mashina) katakni to'ldirishi uchun kattaroq */
export const SECTION_ART_SCALE: Partial<Record<string, number>> = { taxi: 0.94 };
