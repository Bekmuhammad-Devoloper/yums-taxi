import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ToastHost } from '@/components/toast';
import { PlatformProvider } from '@/lib/platform';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

function Root() {
  const { ready, dark, colors } = useStore();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="login" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="taxi" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="search" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="project/edit" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="market/new" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
        <ToastHost />
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <PlatformProvider>
        <Root />
      </PlatformProvider>
    </StoreProvider>
  );
}
