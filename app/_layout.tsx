import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAddonsStore } from '../src/store/addonsStore';
import { AppSplashScreen } from '../src/components/SplashScreen';

const queryClient = new QueryClient();

function AppRoot() {
  const validateAndActivateAddons = useAddonsStore((s) => s.validateAndActivateAddons);
  const [validationDone, setValidationDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Validar addons al arrancar; cuando terminen marcamos validationDone
    validateAndActivateAddons().finally(() => {
      setValidationDone(true);
    });
  }, [validateAndActivateAddons]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detail/[type]/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="player/[type]/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>

      {/* Splash animado encima de todo, desaparece cuando validacion completa */}
      {showSplash && (
        <AppSplashScreen
          validationDone={validationDone}
          onFinish={() => setShowSplash(false)}
        />
      )}

      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoot />
    </QueryClientProvider>
  );
}
