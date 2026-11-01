import { Redirect } from 'expo-router';

/** Noma'lum havola ochilganda bosh sahifaga qaytaramiz (ro'yxatdan o'tmagan bo'lsa — ro'yxatdan o'tishga) */
export default function NotFound() {
  return <Redirect href="/" />;
}
