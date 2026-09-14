import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { useAddonsStore } from '../../src/store/addonsStore';
import { useCatalogs } from '../../src/hooks/useCatalogs';
import { Row } from '../../src/components/Row';

// A single catalog row component that handles its own fetching
function CatalogRow({ type, catalogId, catalogName }: { type: string, catalogId: string, catalogName: string }) {
  const { data, isLoading, isError } = useCatalogs(type, catalogId);

  if (isLoading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  if (isError || !data || data.length === 0) {
    return null;
  }

  // data is an array of { addonName, metas }
  return (
    <View>
      {data.map((result, index) => (
        <Row 
          key={`${result.addonName}-${index}`} 
          title={`${catalogName} (${result.addonName})`} 
          data={result.metas} 
        />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);

  // Aggregate all unique catalogs from all active addons
  const uniqueCatalogs = React.useMemo(() => {
    const catalogsMap = new Map<string, { type: string, id: string, name: string }>();
    
    activeAddons.forEach(addon => {
      addon.catalogs.forEach(catalog => {
        const key = `${catalog.type}-${catalog.id}`;
        if (!catalogsMap.has(key)) {
          catalogsMap.set(key, { type: catalog.type, id: catalog.id, name: catalog.name || catalog.id });
        }
      });
    });
    
    return Array.from(catalogsMap.values());
  }, [activeAddons]);

  if (activeAddons.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No addons installed.</Text>
          <Text style={styles.emptyStateSubtext}>Go to Settings to add some addons.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>FreeView</Text>
        {uniqueCatalogs.map(catalog => (
          <CatalogRow 
            key={`${catalog.type}-${catalog.id}`} 
            type={catalog.type} 
            catalogId={catalog.id} 
            catalogName={catalog.name} 
          />
        ))}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E6F4FE',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  loadingRow: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  bottomPadding: {
    height: 80, // Space for tab bar
  },
});
