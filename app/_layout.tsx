import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detail/[type]/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="player/[type]/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}
