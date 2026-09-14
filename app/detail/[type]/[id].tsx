import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Pressable, Platform, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchMeta } from '../../../src/lib/addons/client';
import { useAddonsStore } from '../../../src/store/addonsStore';

export default function DetailScreen() {
  const { type, id } = useLocalSearchParams<{ type: string, id: string }>();
  const router = useRouter();
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);

  const { data: meta, isLoading, isError } = useQuery({
    queryKey: ['meta', type, id, activeAddons.map(a => a.manifestUrl)],
    queryFn: async () => {
      // Find the first addon that provides this meta
      for (const addon of activeAddons) {
        try {
          const response = await fetchMeta(addon.manifestUrl, type, id);
          if (response && response.meta) {
            return { meta: response.meta, addonUrl: addon.manifestUrl };
          }
        } catch (e) {
          // ignore and try next
        }
      }
      throw new Error('Meta not found');
    },
    enabled: activeAddons.length > 0,
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E6F4FE" />
      </View>
    );
  }

  if (isError || !meta) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Could not load details.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const m = meta.meta;

  const handlePlay = (videoId?: string) => {
    // Navigate to player with the specific video ID or just the meta ID
    router.push(`/player/${type}/${encodeURIComponent(videoId || id)}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.header}>
          {m.background || m.poster ? (
            <Image 
              source={{ uri: m.background || m.poster }} 
              style={styles.backdrop} 
              resizeMode="cover" 
            />
          ) : null}
          <View style={styles.overlay} />
        </View>

        <SafeAreaView style={styles.content}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>

          <View style={styles.infoContainer}>
            <Text style={styles.title}>{m.name}</Text>
            
            <View style={styles.metaRow}>
              {m.releaseInfo && <Text style={styles.metaText}>{m.releaseInfo}</Text>}
              {m.imdbRating && <Text style={styles.metaText}> ★ {m.imdbRating}</Text>}
              {m.runtime && <Text style={styles.metaText}> • {m.runtime}</Text>}
            </View>

            <View style={styles.genresRow}>
              {m.genres?.map(g => (
                <View key={g} style={styles.genreBadge}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>

            {m.description && (
              <Text style={styles.description}>{m.description}</Text>
            )}

            {/* If it's a movie, show a single play button */}
            {type === 'movie' && (
              <Pressable 
                style={({ pressed }) => [
                  styles.playButton,
                  pressed && styles.playButtonPressed
                ]} 
                onPress={() => handlePlay()}
              >
                <Text style={styles.playButtonText}>▶ Play Movie</Text>
              </Pressable>
            )}

            {/* If it's a series, list episodes (simplified version for MVP) */}
            {type === 'series' && m.videos && m.videos.length > 0 && (
              <View style={styles.episodesContainer}>
                <Text style={styles.sectionTitle}>Episodes</Text>
                {m.videos.slice(0, 20).map((vid) => ( // limit to 20 for MVP simplicity
                  <Pressable 
                    key={vid.id} 
                    style={({ pressed }) => [
                      styles.episodeRow,
                      pressed && styles.episodeRowPressed
                    ]}
                    onPress={() => handlePlay(vid.id)}
                  >
                    <Text style={styles.episodeText}>
                      S{vid.season} E{vid.episode} - {vid.title || `Episode ${vid.episode}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </SafeAreaView>
      </ScrollView>
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
  },
  errorText: {
    color: '#ff4444',
    fontSize: 18,
    marginBottom: 20,
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
  header: {
    width: '100%',
    height: 400,
    position: 'absolute',
    top: 0,
  },
  backdrop: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
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
  content: {
    flex: 1,
    paddingTop: 300, // pushed down to show backdrop
  },
  infoContainer: {
    backgroundColor: '#000',
    minHeight: 500,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  genreBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: '#E6F4FE',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  playButton: {
    backgroundColor: '#E6F4FE',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playButtonFocused: {
    transform: [{ scale: 1.05 }],
    backgroundColor: '#fff',
  },
  playButtonPressed: {
    opacity: 0.8,
  },
  playButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  episodesContainer: {
    marginTop: 16,
  },
  episodeRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  episodeRowFocused: {
    backgroundColor: '#222',
    paddingHorizontal: 8,
  },
  episodeRowPressed: {
    opacity: 0.6,
  },
  episodeText: {
    color: '#fff',
    fontSize: 16,
  },
});
