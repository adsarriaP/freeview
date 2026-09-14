import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMeta } from '../../../src/hooks/useMeta';
import { Video } from '../../../src/lib/addons/types';

function decodeParamId(rawId: string): string {
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}

interface SeasonGroup {
  season: number;
  episodes: Video[];
}

function groupVideosBySeason(videos: Video[]): SeasonGroup[] {
  const seasonsMap = new Map<number, Video[]>();

  videos.forEach((video) => {
    const season = video.season ?? 1;
    if (!seasonsMap.has(season)) {
      seasonsMap.set(season, []);
    }
    seasonsMap.get(season)!.push(video);
  });

  return Array.from(seasonsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([season, episodes]) => ({
      season,
      episodes: [...episodes].sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0)),
    }));
}

export default function DetailScreen() {
  const { type, id } = useLocalSearchParams<{ type: string, id: string }>();
  const router = useRouter();
  const decodedId = decodeParamId(id || '');

  const { data: meta, isLoading, isError } = useMeta(type, decodedId);

  const seasons = useMemo(() => groupVideosBySeason(meta?.meta.videos ?? []), [meta]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const activeSeason = selectedSeason ?? seasons[0]?.season ?? null;
  const activeEpisodes = seasons.find((s) => s.season === activeSeason)?.episodes ?? [];

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
    router.push(`/player/${type}/${encodeURIComponent(videoId || decodedId)}`);
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
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', '#000']}
            style={styles.overlay}
          />
        </View>

        <SafeAreaView style={styles.content}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>

          <View style={styles.infoContainer}>
            <View style={styles.titleRow}>
              {m.poster ? (
                <Image source={{ uri: m.poster }} style={styles.poster} resizeMode="cover" />
              ) : null}
              <View style={styles.titleColumn}>
                <Text style={styles.title}>{m.name}</Text>
                <View style={styles.metaRow}>
                  {m.releaseInfo && <Text style={styles.metaText}>{m.releaseInfo}</Text>}
                  {m.imdbRating && <Text style={styles.metaText}> ★ {m.imdbRating}</Text>}
                  {m.runtime && <Text style={styles.metaText}> • {m.runtime}</Text>}
                </View>
              </View>
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

            {/* Si es pelicula, un solo boton de reproduccion */}
            {type === 'movie' && (
              <Pressable
                style={({ pressed }) => [
                  styles.playButton,
                  pressed && styles.playButtonPressed
                ]}
                onPress={() => handlePlay()}
              >
                <Text style={styles.playButtonText}>▶ Ver ahora</Text>
              </Pressable>
            )}

            {/* Si es serie, selector de temporada + lista de episodios */}
            {type === 'series' && seasons.length > 0 && (
              <View style={styles.episodesContainer}>
                <Text style={styles.sectionTitle}>Temporadas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonSelector}>
                  {seasons.map((s) => {
                    const selected = s.season === activeSeason;
                    return (
                      <Pressable
                        key={s.season}
                        style={({ pressed }) => [
                          styles.seasonChip,
                          selected && styles.seasonChipSelected,
                          pressed && styles.episodeRowPressed,
                        ]}
                        onPress={() => setSelectedSeason(s.season)}
                      >
                        <Text style={[styles.seasonChipText, selected && styles.seasonChipTextSelected]}>
                          Temporada {s.season}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {activeEpisodes.map((vid) => (
                  <Pressable
                    key={vid.id}
                    style={({ pressed }) => [
                      styles.episodeRow,
                      pressed && styles.episodeRowPressed
                    ]}
                    onPress={() => handlePlay(vid.id)}
                  >
                    <Text style={styles.episodeText}>
                      S{vid.season ?? activeSeason} E{vid.episode} - {vid.title || `Episodio ${vid.episode}`}
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
  titleRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  poster: {
    width: 90,
    height: 135,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#222',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'flex-end',
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
  seasonSelector: {
    marginBottom: 12,
  },
  seasonChip: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  seasonChipSelected: {
    backgroundColor: '#E6F4FE',
    borderColor: '#E6F4FE',
  },
  seasonChipText: {
    color: '#ddd',
    fontSize: 13,
    fontWeight: '600',
  },
  seasonChipTextSelected: {
    color: '#000',
    fontWeight: '700',
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
