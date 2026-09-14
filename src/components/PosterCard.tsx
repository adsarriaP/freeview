import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, Platform } from 'react-native';
import { MetaPreview } from '../lib/addons/types';
import { useRouter } from 'expo-router';

interface PosterCardProps {
  meta: MetaPreview;
}

export function PosterCard({ meta }: PosterCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/detail/${meta.type}/${encodeURIComponent(meta.id)}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageContainer}>
        {meta.poster ? (
          <Image source={{ uri: meta.poster }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{meta.name}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {meta.name}
      </Text>
      {meta.releaseInfo && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {meta.releaseInfo}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  focused: {
    transform: [{ scale: 1.05 }],
    borderColor: '#fff',
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  placeholderText: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 12,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  subtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});
