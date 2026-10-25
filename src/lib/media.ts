import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PickResult = { ok: true; uri: string } | { ok: false; reason: 'cancel' | 'denied' | 'error' };

/** Rasm o'lchamlari: profil 1:1, reklama banneri 2:1, mahsulot 4:3. Loyiha muqovasi qirqilmaydi (o'z nisbatida) */
export const IMAGE_SPECS = {
  avatar: { aspect: [1, 1] as [number, number], width: 400, label: '400×400' },
  cover: { aspect: [16, 9] as [number, number], width: 1600, label: '16:9 tavsiya · qirqilmaydi', free: true },
  banner: { aspect: [2, 1] as [number, number], width: 1200, label: '1200×600 (2:1)' },
  product: { aspect: [4, 3] as [number, number], width: 1000, label: '1000×750 (4:3)' },
};

/**
 * Rasm tanlash: galereya yoki kamera → kerakli nisbatda markazdan qirqish → JPEG.
 * Natija data: URI — qurilmada saqlanadi va internetga bog'liq emas.
 */
export async function pickImage(kind: keyof typeof IMAGE_SPECS, source: 'library' | 'camera' = 'library'): Promise<PickResult> {
  const spec = IMAGE_SPECS[kind];
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'denied' };
    }
    const free = 'free' in spec && spec.free;
    // Muqova butunligicha saqlanadi — yozuvli bannerlar chetidan kesilmasin
    const options: ImagePicker.ImagePickerOptions = free ? { mediaTypes: ['images'], allowsEditing: false, quality: 0.9 } : { mediaTypes: ['images'], allowsEditing: true, aspect: spec.aspect, quality: 0.9 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancel' };

    const a = res.assets[0];
    const [rw, rh] = spec.aspect;
    if (Platform.OS === 'web') {
      const uri = await cropOnCanvas(a.uri, free ? 0 : rw / rh, spec.width, kind === 'avatar' ? 0.82 : 0.8);
      return { ok: true, uri };
    }
    const ctx = ImageManipulator.manipulate(a.uri);
    if (free) {
      if (a.width > spec.width) ctx.resize({ width: spec.width });
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      return out.base64 ? { ok: true, uri: `data:image/jpeg;base64,${out.base64}` } : { ok: false, reason: 'error' };
    }
    // Vebda qirqish oynasi yo'q — markazdan kerakli nisbatda olamiz
    if (a.width && a.height && Math.abs(a.width / a.height - rw / rh) > 0.01) {
      const w = Math.min(a.width, (a.height * rw) / rh);
      const h = (w * rh) / rw;
      ctx.crop({ originX: Math.round((a.width - w) / 2), originY: Math.round((a.height - h) / 2), width: Math.round(w), height: Math.round(h) });
    }
    const width = Math.min(spec.width, a.width || spec.width);
    ctx.resize({ width, height: Math.round((width * rh) / rw) });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: kind === 'avatar' ? 0.82 : 0.75, base64: true });
    return out.base64 ? { ok: true, uri: `data:image/jpeg;base64,${out.base64}` } : { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * Veb: rasmni brauzerning o'zida (canvas) qirqib, kichraytirib, JPEG data: URI ga aylantiramiz.
 * Tarmoq so'rovi yo'q — cheklangan muhitlarda ham ishlaydi.
 */
function cropOnCanvas(src: string, ratio: number, maxW: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      // ratio 0 — qirqmasdan, faqat kichraytiramiz
      if (!ratio) ratio = img.naturalWidth / img.naturalHeight;
      const sw = Math.min(img.naturalWidth, img.naturalHeight * ratio);
      const sh = sw / ratio;
      const w = Math.round(Math.min(maxW, sw)), h = Math.round(w / ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('image'));
    img.src = src;
  });
}

export const pickAvatar = (source: 'library' | 'camera') => pickImage('avatar', source);
