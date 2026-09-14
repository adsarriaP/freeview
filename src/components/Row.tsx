import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { MetaPreview } from '../lib/addons/types';
import { PosterCard } from './PosterCard';

interface RowProps {
  title: string;
  data: MetaPreview[];
}

export function Row({ title, data }: RowProps) {
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => <PosterCard meta={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
});
