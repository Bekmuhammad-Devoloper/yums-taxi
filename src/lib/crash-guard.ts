// Telefonda kutilmagan JS xatosi ilovani jim yopib qo'ymasin: xato matni oynada ko'rsatiladi (skrinshot qilib
// dasturchiga yuboriladi) va ilovani qayta ochish taklif qilinadi. Ilovaning eng birinchi moduli (index.js) —
// boshqa modullar yuklanishidagi xatolar ham ushlanadi. Ishlab chiqishda (Expo Go) odatiy qizil ekran qoladi.
import { reloadAppAsync } from 'expo';
import { Alert, Platform } from 'react-native';

type Handler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler(): Handler; setGlobalHandler(handler: Handler): void };

const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

/** Xato matni: nomi, xabari va stekning boshi (oyna sig'adigan qadar) */
export function describeError(error: unknown): string {
  const e = error instanceof Error ? error : new Error(String(error));
  const stack = (e.stack ?? '').split('\n').slice(0, 12).join('\n');
  return `${e.name}: ${e.message}\n\n${stack}`.slice(0, 1500);
}

if (Platform.OS !== 'web' && !__DEV__ && errorUtils) {
  const fallback = errorUtils.getGlobalHandler();
  let open = false;
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (!isFatal) {
      fallback(error, isFatal);
      return;
    }
    if (open) return;
    open = true;
    try {
      Alert.alert(
        'Ilovada xatolik',
        `Bu oynaning rasmini (skrinshot) dasturchiga yuboring.\n\n${describeError(error)}`,
        [{ text: 'Qayta ochish', onPress: () => { open = false; reloadAppAsync('crash').catch(() => {}); } }],
        { cancelable: false },
      );
    } catch {
      // oyna ham ochilmasa — odatiy ishlov (ilova yopiladi, sababi CrashReport faylida)
      fallback(error, isFatal);
    }
  });
}
