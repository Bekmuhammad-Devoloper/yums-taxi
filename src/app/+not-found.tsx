import { Redirect } from 'expo-router';

/** Noma'lum havola ochilganda bosh sahifaga qaytaramiz */
export default function NotFound() {
  return <Redirect href="/" />;
}
