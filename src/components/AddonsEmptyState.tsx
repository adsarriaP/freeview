import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAddonsStore } from '../store/addonsStore';

interface AddonsEmptyStateProps {
  hasNoAddonsAtAll: boolean;
}

export function AddonsEmptyState({ hasNoAddonsAtAll }: AddonsEmptyStateProps) {
  const router = useRouter();
  const resetToDefaults = useAddonsStore((state) => state.resetToDefaults);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const handleRestore = () => {
    setIsRestoring(true);
    // reemplaza cualquier addon corrupto/inactivo por los addons validos por defecto
    resetToDefaults();
    setIsRestoring(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No addons installed.</Text>
        <Text style={styles.emptyStateSubtext}>
          {hasNoAddonsAtAll
            ? 'Go to Settings to add some addons.'
            : 'Tienes addons instalados pero ninguno esta activo o soporta catalogos.'}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.restoreButton, pressed && styles.restoreButtonPressed]}
          onPress={handleRestore}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.restoreButtonText}>Restaurar addons por defecto</Text>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.settingsLinkButton, pressed && styles.restoreButtonPressed]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={styles.settingsLinkButtonText}>Ir a Settings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyStateSubtext: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  restoreButton: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  restoreButtonPressed: {
    opacity: 0.8,
  },
  restoreButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  settingsLinkButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingsLinkButtonText: {
    color: '#E6F4FE',
    fontSize: 14,
    fontWeight: '600',
  },
});
