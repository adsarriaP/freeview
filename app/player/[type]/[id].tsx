import { useEvent } from 'expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TVFocusable } from '../../../src/components/tv/TVFocusable';
import { useStreams } from '../../../src/hooks/useStreams';
import { supportsResource } from '../../../src/lib/addons/filter';
import * as WebBrowser from 'expo-web-browser';
import { Stream } from '../../../src/lib/addons/types';
import {
  StreamResolutionError,
  formatSize,
  getStreamKind,
  isEmbedStreamUrl,
  releaseTorrent,
  resolveStreamUrl,
} from '../../../src/lib/streaming/torrentStreamer';
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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function PlayerScreen() {
  const { type, id } = useLocalSearchParams<{ type: string, id: string }>();
  const router = useRouter();
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);
  const activeStreamAddons = activeAddons.filter((addon) => supportsResource(addon, 'stream'));
  const decodedId = decodeParamId(id || '');

  // ID de la opcion seleccionada en la lista de fuentes
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);

  // Estado de resolucion del stream seleccionado
  type ResolveStatus = 'idle' | 'resolving' | 'ready' | 'error';
  const [resolveStatus, setResolveStatus] = useState<ResolveStatus>('idle');
  const [resolveError, setResolveError] = useState<StreamResolutionError | null>(null);
  // URL resuelta lista para pasarle al reproductor
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  // infoHash activo para liberar el torrent al desmontar o cambiar fuente
  const activeInfoHashRef = useRef<string | null>(null);

  const { data: streamGroups, isLoading, isError } = useStreams(type, decodedId);

  // Fuerza landscape mientras se reproduce, restaura al salir
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const streamOptions = useMemo<StreamOption[]>(() => {
    if (!streamGroups) return [];

    return streamGroups.flatMap((group, groupIndex) =>
      group.streams
        // En web, ocultar fuentes marcadas como notWebReady
        .filter((stream) => !(Platform.OS === 'web' && stream.behaviorHints?.notWebReady))
        .map((stream, streamIndex) => ({
          id: `${group.addonName}-${groupIndex}-${streamIndex}`,
          addonName: group.addonName,
          stream,
        }))
    );
  }, [streamGroups]);

  const selectedStreamOption = streamOptions.find((option) => option.id === selectedStreamId) ?? null;

  // Resolver el stream seleccionado de forma async cuando cambia la seleccion
  const handleSelectStream = useCallback(async (optionId: string, stream: Stream) => {
    // Liberar torrent anterior si existia
    if (activeInfoHashRef.current) {
      releaseTorrent(activeInfoHashRef.current);
      activeInfoHashRef.current = null;
    }

    setSelectedStreamId(optionId);
    setSelectedSubtitleId(null);
    setResolvedUrl(null);
    setResolveError(null);
    setResolveStatus('resolving');

    try {
      const resolved = await resolveStreamUrl(stream);
      setResolvedUrl(resolved.url);
      setResolveStatus('ready');
      if (stream.infoHash) {
        activeInfoHashRef.current = stream.infoHash;
      }
    } catch (err) {
      const resErr = err as StreamResolutionError;
      setResolveError(resErr);
      setResolveStatus('error');
    }
  }, []);

  // Liberar torrent al desmontar el reproductor
  useEffect(() => {
    return () => {
      if (activeInfoHashRef.current) {
        releaseTorrent(activeInfoHashRef.current);
      }
    };
  }, []);

  // La fuente que se pasa al reproductor es la URL resuelta (no stream.url directo)
  const playableSource = resolvedUrl
    ? {
        uri: resolvedUrl,
        headers: selectedStreamOption?.stream.behaviorHints?.proxyHeaders,
      }
    : null;

  const player = useVideoPlayer(playableSource, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: player.currentTime, bufferedPosition: -1, currentLiveTimestamp: null, currentOffsetFromLive: null });
  const [duration, setDuration] = useState(0);

  useEvent(player, 'sourceLoad', { duration: player.duration, videoSource: null, availableAudioTracks: [], availableSubtitleTracks: [], availableVideoTracks: [] });

  useEffect(() => {
    if (player.duration > 0) {
      setDuration(player.duration);
    }
  }, [player.duration]);

  // controles se ocultan solos tras 3s de inactividad
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [selectedStreamId]);

  const handleToggleControls = () => {
    if (showControls) {
      setShowControls(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      setShowControls(true);
      scheduleHide();
    }
  };

  const [seekBarWidth, setSeekBarWidth] = useState(0);

  const handleSeek = (locationX: number) => {
    if (!duration || seekBarWidth === 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / seekBarWidth));
    player.currentTime = ratio * duration;
    scheduleHide();
  };

  const handleTogglePlay = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    scheduleHide();
  };

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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const subtitles = selectedStreamOption?.stream.subtitles ?? [];

  return (
    <View style={styles.container}>
      {/* Area de video: muestra estado de resolucion o el video una vez listo */}
      {resolveStatus === 'resolving' ? (
        <View style={styles.selectHintContainer}>
          <ActivityIndicator size="large" color="#E6F4FE" style={{ marginBottom: 12 }} />
          <Text style={styles.selectHintText}>Conectando a la fuente...</Text>
          <Text style={styles.resolveSubText}>
            {selectedStreamOption?.stream.infoHash
              ? 'Buscando peers del torrent. Puede tardar hasta 30s.'
              : 'Resolviendo URL de stream...'}
          </Text>
        </View>
      ) : resolveStatus === 'error' ? (
        <View style={styles.selectHintContainer}>
          <Text style={styles.resolveErrorText}>⚠ No se pudo reproducir esta fuente</Text>
          <Text style={styles.resolveSubText}>{resolveError?.message}</Text>
          {selectedStreamOption && (
            <Pressable
              style={styles.retryButton}
              onPress={() => handleSelectStream(selectedStreamOption.id, selectedStreamOption.stream)}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          )}
        </View>
      ) : resolvedUrl ? (
        Platform.OS === 'web' && isEmbedStreamUrl(resolvedUrl) ? (
          <View style={styles.videoTouchArea}>
            <View style={styles.embedTopBar}>
              <TVFocusable style={styles.closeButton} onPress={() => router.back()}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TVFocusable>
              <Text style={styles.embedNoticeText}>Reproduciendo vía Streamwish / Embed Web</Text>
            </View>
            <View style={styles.video}>
              <iframe
                src={resolvedUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#000',
                }}
                allowFullScreen
                scrolling="no"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            </View>
          </View>
        ) : isEmbedStreamUrl(resolvedUrl) && Platform.OS !== 'web' ? (
          <View style={styles.selectHintContainer}>
            <Text style={styles.resolveErrorText}>📺 Fuente Embed / Web</Text>
            <Text style={styles.resolveSubText}>
              Este stream proviene de un reproductor web ({resolvedUrl.includes('streamwish') ? 'Streamwish' : 'Embed'}). Puedes abrirlo en el navegador o usar la versión Web de Freeview.
            </Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => WebBrowser.openBrowserAsync(resolvedUrl)}
            >
              <Text style={styles.retryButtonText}>Abrir en Navegador</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.videoTouchArea} onPress={handleToggleControls}>
            <VideoView
              style={styles.video}
              player={player}
              nativeControls={false}
            />

            {showControls && (
              <View style={styles.controlsOverlay} pointerEvents="box-none">
                <SafeAreaView style={styles.topControls}>
                  <TVFocusable style={styles.closeButton} onPress={() => router.back()}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TVFocusable>
                </SafeAreaView>

                <View style={styles.centerControls}>
                  <TVFocusable style={styles.playPauseButton} onPress={handleTogglePlay}>
                    <Text style={styles.playPauseButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
                  </TVFocusable>
                </View>

                <View style={styles.bottomControls}>
                  {subtitles.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subtitlesRow}>
                      <Pressable
                        style={[styles.subtitleChip, !selectedSubtitleId && styles.subtitleChipSelected]}
                        onPress={() => setSelectedSubtitleId(null)}
                      >
                        <Text style={styles.subtitleChipText}>Sin subtitulos</Text>
                      </Pressable>
                      {subtitles.map((sub) => (
                        <Pressable
                          key={sub.id}
                          style={[styles.subtitleChip, selectedSubtitleId === sub.id && styles.subtitleChipSelected]}
                          onPress={() => setSelectedSubtitleId(sub.id)}
                        >
                          <Text style={styles.subtitleChipText}>{sub.lang}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                  {selectedSubtitleId ? (
                    <Text style={styles.subtitleDisclaimer}>
                      Subtitulos externos aun no soportados por el reproductor nativo.
                    </Text>
                  ) : null}

                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>

                  <Pressable
                    style={styles.seekBarContainer}
                    onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
                    onPress={(e) => handleSeek(e.nativeEvent.locationX)}
                  >
                    <View style={styles.seekBarTrack}>
                      <View style={[styles.seekBarFill, { width: `${progressPercent}%` }]} />
                    </View>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        )
      ) : (
        <View style={styles.selectHintContainer}>
          <Text style={styles.selectHintText}>Selecciona una fuente para comenzar la reproduccion.</Text>
        </View>
      )}

      <View style={styles.sourcesContainer}>
        <Text style={styles.sourcesTitle}>Fuentes disponibles</Text>
        <ScrollView>
          {streamOptions.map((option) => {
            const kind = getStreamKind(option.stream);
            const isSelected = option.id === selectedStreamId;
            const streamName = option.stream.name || option.stream.title || option.stream.description || 'Fuente sin nombre';
            const streamDescription = option.stream.description && option.stream.description !== streamName
              ? option.stream.description
              : null;
            const sizeLabel = formatSize(option.stream.size);
            const seedsLabel = option.stream.seeds != null ? `${option.stream.seeds} seeds` : null;

            return (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.sourceItem,
                  isSelected && styles.sourceItemSelected,
                  pressed && styles.sourceItemPressed,
                ]}
                onPress={() => handleSelectStream(option.id, option.stream)}
              >
                {/* Fila superior: addon + badge de tipo */}
                <View style={styles.sourceHeaderRow}>
                  <Text style={styles.sourceAddon}>{option.addonName}</Text>
                  <View style={[
                    styles.kindBadge,
                    kind === 'embed'
                      ? styles.kindBadgeEmbed
                      : kind === 'http'
                      ? styles.kindBadgeHttp
                      : styles.kindBadgeTorrent,
                  ]}>
                    <Text style={styles.kindBadgeText}>
                      {kind === 'embed' ? '🟣 EMBED' : kind === 'http' ? '🔵 HTTP' : '🟠 P2P'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sourceName}>{streamName}</Text>
                {streamDescription ? <Text style={styles.sourceDescription}>{streamDescription}</Text> : null}
                {/* Metadata de disponibilidad */}
                <View style={styles.sourceMetaRow}>
                  {sizeLabel ? <Text style={styles.sourceMeta}>{sizeLabel}</Text> : null}
                  {seedsLabel ? <Text style={styles.sourceMeta}>{seedsLabel}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
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
  videoTouchArea: {
    flex: 3,
    width: '100%',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButtonText: {
    color: '#fff',
    fontSize: 28,
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  subtitlesRow: {
    marginBottom: 6,
  },
  subtitleChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  subtitleChipSelected: {
    backgroundColor: '#E6F4FE',
  },
  subtitleChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitleDisclaimer: {
    color: '#ccc',
    fontSize: 11,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  seekBarContainer: {
    width: '100%',
    paddingVertical: 8,
  },
  seekBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  seekBarFill: {
    height: '100%',
    backgroundColor: '#E6F4FE',
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
  sourceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sourceAddon: {
    color: '#E6F4FE',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 6,
  },
  kindBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kindBadgeHttp: {
    backgroundColor: '#0D2F4F',
  },
  kindBadgeTorrent: {
    backgroundColor: '#3A2200',
  },
  kindBadgeEmbed: {
    backgroundColor: '#4A154B',
  },
  kindBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
  sourceMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  sourceMeta: {
    color: '#666',
    fontSize: 11,
  },
  resolveErrorText: {
    color: '#F4A0A0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  resolveSubText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  retryButton: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 12,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  embedTopBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  embedNoticeText: {
    color: '#E6F4FE',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
});
