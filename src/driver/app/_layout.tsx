import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { Onest_700Bold } from '@expo-google-fonts/onest/700Bold';
import { Onest_800ExtraBold } from '@expo-google-fonts/onest/800ExtraBold';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono/400Regular';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { ToastHost } from '@/components/toast';
import { DriverProvider, useDriver } from '@/driver/lib/driver-store';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const css = document.createElement('style');
  css.textContent = 'input,textarea,[tabindex],[role=button]{outline:none!important}input,textarea{caret-color:#E0A800}html{overflow:hidden;overscroll-behavior:none}*{scrollbar-width:none;-ms-overflow-style:none}*::-webkit-scrollbar{display:none;width:0;height:0}';
  document.head.appendChild(css);
  document.title = 'YUMS Driver';
}

function Root() {
  const { ready, dark, colors, lang } = useStore();
  const d = useDriver();
  const [fontsLoaded, fontError] = useFonts({ Unbounded_700Bold, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold, ShareTechMono_400Regular });
  const loaded = ready && d.ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // Yangi buyurtma kelganda haydovchi qaysi sahifada bo'lmasin — xarita ekraniga qaytariladi
  const pathname = usePathname();
  const offerId = d.offer?.order.id;
  useEffect(() => {
    // dismissTo — stekdagi mavjud xarita ekraniga qaytadi (yangi nusxa ochmaydi)
    if (offerId && pathname !== '/') router.dismissTo('/');
    // faqat yangi taklif kelganda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* til almashganda ekranlar qayta chiziladi (barcha matnlar yangi tilda) */}
        <Stack key={lang} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
          <Stack.Protected guard={!!d.profile}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="menu" options={{ animation: 'slide_from_left' }} />
            <Stack.Screen name="earnings" />
            <Stack.Screen name="quality" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="documents" />
            <Stack.Screen name="support" />
            <Stack.Screen name="support-chat" />
          </Stack.Protected>
          <Stack.Protected guard={!d.profile}>
            <Stack.Screen name="register" options={{ animation: 'fade', gestureEnabled: false }} />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </View>
    </ThemeProvider>
  );
}

export default function DriverLayout() {
  return (
    <StoreProvider>
      <DriverProvider>
        <Root />
      </DriverProvider>
    </StoreProvider>
  );
}
