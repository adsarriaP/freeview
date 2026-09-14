import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Row } from '../../src/components/Row';
import { useDebounce } from '../../src/hooks/useDebounce';
import { fetchCatalog } from '../../src/lib/addons/client';
import { supportsResource, supportsType } from '../../src/lib/addons/filter';
import { MetaPreview } from '../../src/lib/addons/types';
import { useAddonsStore } from '../../src/store/addonsStore';

function SearchResults({ query }: { query: string }) {
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', query, activeAddons.map(a => a.manifestUrl)],
    queryFn: async () => {
      const catalogRequests: Array<Promise<{ title: string; metas: MetaPreview[] } | null>> = [];

      for (const addon of activeAddons) {
        if (!supportsResource(addon, 'catalog')) {
          continue;
        }

        for (const catalog of addon.catalogs) {
          const searchExtra = catalog.extra?.find((extraEntry) => extraEntry.name === 'search');
          if (!searchExtra) {
            continue;
          }

          if (!supportsType(addon, 'catalog', catalog.type)) {
            continue;
          }

          catalogRequests.push(
            fetchCatalog(addon.manifestUrl, catalog.type, catalog.id, { search: query })
              .then((response) => {
                if (!response?.metas || response.metas.length === 0) {
                  return null;
                }

                return {
                  title: `${addon.name} - ${catalog.name || catalog.id}`,
                  metas: response.metas,
                };
              })
              .catch((error) => {
                console.warn(`Failed to search on ${addon.name} / ${catalog.id}`, error);
                return null;
              })
          );
        }
      }

      const results = await Promise.all(catalogRequests);
      return results.filter((entry): entry is { title: string; metas: MetaPreview[] } => entry !== null);
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
          key={`${result.title}-${index}`} 
          title={result.title} 
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
