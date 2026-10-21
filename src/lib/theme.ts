export const palette = {
  light: {
    bg: '#F4F5F8',
    surface: '#FFFFFF',
    surface2: '#F0F2F6',
    surface3: '#E5E8EF',
    text: '#0E1525',
    muted: '#5D6680',
    faint: '#99A1B5',
    line: '#E6E9F0',
    brand: '#FFC800',
    brandText: '#0E1525',
    brandSoft: '#FFF6D1',
    ink: '#0F1E3D',
    accent: '#2457F5',
    ok: '#12A66A',
    okSoft: '#E3F6EE',
    danger: '#E5484D',
    dangerSoft: '#FDECEC',
    overlay: 'rgba(9, 14, 26, 0.45)',
    shadow: '#0F1E3D',
  },
  dark: {
    bg: '#0A0D14',
    surface: '#151A24',
    surface2: '#1D2330',
    surface3: '#272E3D',
    text: '#EEF1F7',
    muted: '#9AA3B8',
    faint: '#69728A',
    line: '#252C3A',
    brand: '#FFC800',
    brandText: '#0E1525',
    brandSoft: '#3A3010',
    ink: '#EEF1F7',
    accent: '#6B8CFF',
    ok: '#2BC48A',
    okSoft: '#0F2E24',
    danger: '#FF6369',
    dangerSoft: '#3A1517',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: '#000000',
  },
};

export type Colors = typeof palette.light;

export const radius = { s: 12, m: 16, l: 22, xl: 28 };

export const shadow = (c: Colors, level = 1) => ({
  shadowColor: c.shadow,
  shadowOpacity: 0.08 * level,
  shadowRadius: 10 * level,
  shadowOffset: { width: 0, height: 4 * level },
  elevation: 3 * level,
});

// Google Maps uchun qorong'i uslub (Android)
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f2b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a93a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2b' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3140' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4357' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export const lightMapStyle = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];
