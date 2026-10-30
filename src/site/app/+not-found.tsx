import { Redirect } from 'expo-router';

/** Noma'lum havola — bosh sahifaga */
export default function NotFound() {
  return <Redirect href="/" />;
}
