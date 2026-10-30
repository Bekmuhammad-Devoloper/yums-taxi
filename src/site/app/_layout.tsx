import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { Onest_700Bold } from '@expo-google-fonts/onest/700Bold';
import { Onest_800ExtraBold } from '@expo-google-fonts/onest/800ExtraBold';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono/400Regular';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { ToastHost } from '@/components/toast';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const css = document.createElement('style');
  css.textContent = [
    'input,textarea,select,[tabindex],[role=button],[role=link]{outline:none!important}',
    'input,textarea{caret-color:#E0A800}',
    '*{scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.35) transparent}',
    '*::-webkit-scrollbar{width:8px;height:8px}*::-webkit-scrollbar-thumb{background:rgba(127,127,127,.35);border-radius:8px}',
    '[role=button]:focus-visible,[role=link]:focus-visible,input:focus-visible{box-shadow:0 0 0 3px rgba(255,200,0,.55)!important}',
  ].join('');
  document.head.appendChild(css);
}

function Root() {
  const { ready, dark, colors } = useStore();
  const [fontsLoaded, fontError] = useFonts({ Unbounded_700Bold, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold, ShareTechMono_400Regular });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="admin" />
        </Stack>
        <ToastHost />
      </View>
    </ThemeProvider>
  );
}

/** YUMS sayti: bosh sahifa (landing) va /admin — boshqaruv paneli */
export default function SiteLayout() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}
