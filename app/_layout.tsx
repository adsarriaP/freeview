import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAddonsStore } from '../src/store/addonsStore';

const queryClient = new QueryClient();

function AppStartup() {
  const validateAndActivateAddons = useAddonsStore((s) => s.validateAndActivateAddons);

  useEffect(() => {
    // Verificar en background cuales addons son accesibles al arrancar la app.
    // Los que no responden quedan inactivos automaticamente.
    validateAndActivateAddons();
  }, [validateAndActivateAddons]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStartup />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detail/[type]/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="player/[type]/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}
