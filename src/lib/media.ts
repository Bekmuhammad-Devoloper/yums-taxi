import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PickResult = { ok: true; uri: string } | { ok: false; reason: 'cancel' | 'denied' | 'error' };

/** Rasm o'lchamlari: profil 1:1, loyiha muqovasi 16:9, reklama banneri 2:1, mahsulot 4:3 */
export const IMAGE_SPECS = {
  avatar: { aspect: [1, 1] as [number, number], width: 400, label: '400×400' },
  cover: { aspect: [16, 9] as [number, number], width: 1280, label: '1280×720 (16:9)' },
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
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: spec.aspect, quality: 0.9 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancel' };

    const a = res.assets[0];
    const [rw, rh] = spec.aspect;
    const ctx = ImageManipulator.manipulate(a.uri);
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

export const pickAvatar = (source: 'library' | 'camera') => pickImage('avatar', source);
