// Klaviatura: ilova Android'da ham chetdan-chetga (edge-to-edge) chiziladi — tizim oynani klaviatura uchun
// kichraytirmaydi, shuning uchun KeyboardAvoidingView ikkala platformada ham `padding` bilan ishlaydi.
// (Oyna baribir kichraysa, KeyboardAvoidingView o'lchagan qoplanish 0 bo'ladi — joy ikki marta qo'shilmaydi.)
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export const KEYBOARD_BEHAVIOR = Platform.OS === 'web' ? undefined : ('padding' as const);

/** Klaviatura ochiqmi: ochiq paytda pastki tizim chizig'i uchun qo'shimcha joy kerak emas */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return open;
}
