import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAddonsStore } from '../../src/store/addonsStore';
import { aggregateCatalogs } from '../../src/lib/addons/aggregator';
import { Row } from '../../src/components/Row';
import { useDebounce } from '../../src/hooks/useDebounce';

function SearchResults({ query }: { query: string }) {
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', query, activeAddons.map(a => a.manifestUrl)],
    queryFn: async () => {
      // Find catalogs that support search
      const results = [];
      for (const addon of activeAddons) {
        // Typically cinemeta uses catalog id 'top' with extra 'search'
        // For a generalized approach, we just try to fetch from all movie/series catalogs with extra={search: query}
        const movieResults = await aggregateCatalogs([addon], 'movie', 'top', { search: query });
        const seriesResults = await aggregateCatalogs([addon], 'series', 'top', { search: query });
        
        results.push(...movieResults);
        results.push(...seriesResults);
      }
      return results;
    },
    enabled: query.length > 2 && activeAddons.length > 0,
  });

  if (query.length <= 2) {
    return <Text style={styles.promptText}>Type at least 3 characters to search</Text>;
  }

  if (isLoading) {
    return <ActivityIndicator size="large" color="#E6F4FE" style={{ marginTop: 40 }} />;
  }

  if (isError || !data || data.length === 0) {
    return <Text style={styles.promptText}>No results found for "{query}"</Text>;
  }

  return (
    <View>
      {data.map((result, index) => (
        <Row 
          key={`${result.addonName}-${index}`} 
          title={`Results from ${result.addonName}`} 
          data={result.metas} 
        />
      ))}
    </View>
  );
}

export default function SearchScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search movies, series..."
          placeholderTextColor="#666"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoFocus
        />
      </View>
      <ScrollView style={styles.scrollView}>
        <SearchResults query={debouncedSearch} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 24,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  promptText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});
