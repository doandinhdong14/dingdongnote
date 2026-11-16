import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authStorage } from '../services/authStorage';
import { notificationService } from '../services/notificationService';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      await notificationService.initChannels();
      const token = await authStorage.getRefreshToken();
      setIsReady(true);

      const inAuthGroup = segments[0] === 'login';
      if (!token && !inAuthGroup) {
        router.replace('/login');
      }
    }
    init();

    const notifSub = notificationService.setupResponseListener((route) => {
      router.push(route as any);
    });

    return () => {
      notifSub.remove();
    };
  }, [segments, router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FAF9F6' },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Cài đặt & Chẩn đoán',
            headerStyle: { backgroundColor: '#FAF9F6' },
            headerTintColor: '#20202A',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
