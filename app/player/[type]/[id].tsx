import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { aggregateStreams } from '../../../src/lib/addons/aggregator';
import { supportsResource } from '../../../src/lib/addons/filter';
import { Stream } from '../../../src/lib/addons/types';
import { useAddonsStore } from '../../../src/store/addonsStore';

interface StreamOption {
  id: string;
  addonName: string;
  stream: Stream;
}

function decodeParamId(rawId: string): string {
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}

export default function PlayerScreen() {
  const { type, id } = useLocalSearchParams<{ type: string, id: string }>();
  const router = useRouter();
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);
  const activeStreamAddons = activeAddons.filter((addon) => supportsResource(addon, 'stream'));
  const decodedId = decodeParamId(id || '');
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);

  const { data: streamGroups, isLoading, isError } = useQuery({
    queryKey: ['stream', type, decodedId, activeAddons.map(a => a.manifestUrl)],
    queryFn: async () => {
      return aggregateStreams(activeAddons, type, decodedId);
    },
    enabled: activeAddons.length > 0 && !!type && !!decodedId,
  });

  const streamOptions = useMemo<StreamOption[]>(() => {
    if (!streamGroups) {
      return [];
    }

    return streamGroups.flatMap((group, groupIndex) =>
      group.streams.map((stream, streamIndex) => ({
        id: `${group.addonName}-${groupIndex}-${streamIndex}`,
        addonName: group.addonName,
        stream,
      }))
    );
  }, [streamGroups]);

  const selectedStreamOption = streamOptions.find((option) => option.id === selectedStreamId) ?? null;
  const playableSource = selectedStreamOption?.stream.url
    ? {
        uri: selectedStreamOption.stream.url,
        headers: selectedStreamOption.stream.behaviorHints?.proxyHeaders,
      }
    : null;

  const player = useVideoPlayer(playableSource, (p) => {
    p.loop = false;
    p.play();
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E6F4FE" />
      </View>
    );
  }

  if (isError || streamOptions.length === 0) {
    const noStreamAddons = activeStreamAddons.length === 0;

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No compatible stream found for this content.</Text>
        {noStreamAddons ? (
          <Text style={styles.subErrorText}>No hay addons de stream activos. Instala o activa uno desde Settings.</Text>
        ) : (
          <Text style={styles.subErrorText}>Hay {activeStreamAddons.length} addon(es) de stream activos, pero ninguno devolvio fuentes para este ID.</Text>
        )}
        <Text style={styles.debugText}>Tipo: {type} | ID: {decodedId}</Text>
        {noStreamAddons ? (
          <Pressable style={styles.settingsButton} onPress={() => router.push('/(tabs)/settings')}>
            <Text style={styles.settingsButtonText}>Ir a Settings</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedStreamOption?.stream.url ? (
        <VideoView
          style={styles.video}
          player={player}
          nativeControls
        />
      ) : (
        <View style={styles.selectHintContainer}>
          <Text style={styles.selectHintText}>Selecciona una fuente para comenzar la reproduccion.</Text>
        </View>
      )}

      <View style={styles.sourcesContainer}>
        <Text style={styles.sourcesTitle}>Fuentes disponibles</Text>
        <ScrollView>
          {streamOptions.map((option) => {
            const isPlayable = Boolean(option.stream.url);
            const isSelected = option.id === selectedStreamId;
            const streamName = option.stream.name || option.stream.title || option.stream.description || 'Fuente sin nombre';
            const streamDescription = option.stream.description || (option.stream.infoHash ? 'Torrent (requiere servidor)' : null);

            return (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.sourceItem,
                  !isPlayable && styles.sourceItemDisabled,
                  isSelected && styles.sourceItemSelected,
                  pressed && isPlayable && styles.sourceItemPressed,
                ]}
                onPress={() => {
                  if (!isPlayable) return;
                  setSelectedStreamId(option.id);
                }}
                disabled={!isPlayable}
              >
                <Text style={styles.sourceAddon}>{option.addonName}</Text>
                <Text style={styles.sourceName}>{streamName}</Text>
                {streamDescription ? <Text style={styles.sourceDescription}>{streamDescription}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      
      {/* Custom back button overlay */}
      <SafeAreaView style={styles.overlayContainer}>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  video: {
    flex: 3,
    width: '100%',
    height: '100%',
  },
  selectHintContainer: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  selectHintText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
  sourcesContainer: {
    flex: 2,
    borderTopWidth: 1,
    borderTopColor: '#1D1D1D',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#080808',
  },
  sourcesTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  sourceItem: {
    backgroundColor: '#151515',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2B2B2B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  sourceItemSelected: {
    borderColor: '#E6F4FE',
    backgroundColor: '#1D2730',
  },
  sourceItemDisabled: {
    opacity: 0.5,
  },
  sourceItemPressed: {
    opacity: 0.85,
  },
  sourceAddon: {
    color: '#E6F4FE',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  sourceName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sourceDescription: {
    color: '#A0A0A0',
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  subErrorText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  debugText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  settingsButton: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  settingsButtonText: {
    color: '#000',
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    pointerEvents: 'box-none',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
