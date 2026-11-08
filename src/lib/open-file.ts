// Serverdan kelgan fayllarni ochish. Chat, loyiha va tasdiqlash hujjatlari API orqali data URI
// (`data:<mime>;base64,...`) ko'rinishida keladi: Linking ularni ocholmaydi. Vebda fayl yuklab
// olinadi, telefonda keshga yozilib tizimning «Ulashish / Ochish» oynasi chiqariladi.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

const DATA_URI = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/;

/** Fayl nomidan tizim uchun xavfli belgilarni olib tashlaydi */
const safeName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '_').slice(-120) || 'file';

/** Faylni ochadi; ochib bo'lmasa false qaytaradi */
export async function openFile(uri: string, name: string): Promise<boolean> {
  const m = DATA_URI.exec(uri);
  if (!m) {
    await Linking.openURL(uri);
    return true;
  }
  const [, mime = 'application/octet-stream', base64, body] = m;

  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName(name);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return true;
  }

  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, safeName(name));
  file.create({ overwrite: true });
  if (base64) await file.write(body, { encoding: 'base64' });
  else await file.write(decodeURIComponent(body));
  await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: name });
  return true;
}
