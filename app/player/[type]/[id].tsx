import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Platform, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQuery } from '@tanstack/react-query';
import { fetchStreams } from '../../../src/lib/addons/client';
import { useAddonsStore } from '../../../src/store/addonsStore';

export default function PlayerScreen() {
  const { type, id } = useLocalSearchParams<{ type: string, id: string }>();
  const router = useRouter();
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);

  const { data: stream, isLoading, isError } = useQuery({
    queryKey: ['stream', type, id, activeAddons.map(a => a.manifestUrl)],
    queryFn: async () => {
      for (const addon of activeAddons) {
        try {
          const response = await fetchStreams(addon.manifestUrl, type, id);
          if (response && response.streams && response.streams.length > 0) {
            // Find the first valid URL stream (we skip torrents for MVP as requested)
            const webStream = response.streams.find(s => s.url);
            if (webStream) {
              return webStream;
            }
          }
        } catch (e) {
          // ignore
        }
      }
      throw new Error('No compatible stream found');
    },
    enabled: activeAddons.length > 0,
  });

  const player = useVideoPlayer(stream?.url || null, (p) => {
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

  if (isError || !stream) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No compatible stream found for this content.</Text>
        <Text style={styles.subErrorText}>(Torrents require a streaming server for now)</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView 
        style={styles.video} 
        player={player} 
        nativeControls
      />
      
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
    flex: 1,
    width: '100%',
    height: '100%',
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
    marginBottom: 20,
    textAlign: 'center',
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
