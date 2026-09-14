import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Row } from '../../src/components/Row';
import { useCatalogs } from '../../src/hooks/useCatalogs';
import { supportsResource } from '../../src/lib/addons/filter';
import { useAddonsStore } from '../../src/store/addonsStore';

interface CatalogExtraConfig {
  name: string;
  options: string[];
}

interface UniqueCatalog {
  type: string;
  id: string;
  name: string;
  requiredExtras: CatalogExtraConfig[];
}

// A single catalog row component that handles its own fetching
function CatalogRow({
  type,
  catalogId,
  catalogName,
  requiredExtras,
}: {
  type: string;
  catalogId: string;
  catalogName: string;
  requiredExtras: CatalogExtraConfig[];
}) {
  const [selectedExtras, setSelectedExtras] = React.useState<Record<string, string>>({});
  const hasRequiredExtras = requiredExtras.length > 0;
  const canFetch = requiredExtras.every((extra) => Boolean(selectedExtras[extra.name]));
  const extraParams = canFetch ? selectedExtras : undefined;
  const { data, isLoading, isError } = useCatalogs(type, catalogId, extraParams, !hasRequiredExtras || canFetch);

  const handleSelectExtra = (extraName: string, option: string) => {
    setSelectedExtras((previous) => ({
      ...previous,
      [extraName]: option,
    }));
  };

  if (hasRequiredExtras && !canFetch) {
    return (
      <View style={styles.catalogBlock}>
        <Text style={styles.extraLabel}>{catalogName}</Text>
        {requiredExtras.map((extra) => (
          <View key={`${catalogId}-${extra.name}`} style={styles.chipsContainer}>
            <Text style={styles.extraName}>Selecciona {extra.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {extra.options.map((option) => {
                const selected = selectedExtras[extra.name] === option;
                return (
                  <Pressable
                    key={`${extra.name}-${option}`}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && styles.chipPressed,
                    ]}
                    onPress={() => handleSelectExtra(extra.name, option)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ))}
      </View>
    );
  }

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
    <View style={styles.catalogBlock}>
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
  const activeAddons = addons.filter((addon) => addon.active && supportsResource(addon, 'catalog'));

  // Aggregate all unique catalogs from all active addons
  const uniqueCatalogs = React.useMemo(() => {
    const catalogsMap = new Map<string, UniqueCatalog>();
    
    activeAddons.forEach(addon => {
      addon.catalogs.forEach(catalog => {
        const key = `${catalog.type}-${catalog.id}`;

        const requiredExtras = (catalog.extra ?? [])
          .filter((entry) => entry.isRequired)
          .map((entry) => ({
            name: entry.name,
            options: entry.options ?? [],
          }));

        if (!catalogsMap.has(key)) {
          catalogsMap.set(key, {
            type: catalog.type,
            id: catalog.id,
            name: catalog.name || catalog.id,
            requiredExtras,
          });
          return;
        }

        const existing = catalogsMap.get(key);
        if (!existing) return;

        for (const requiredExtra of requiredExtras) {
          const sameExtra = existing.requiredExtras.find((entry) => entry.name === requiredExtra.name);
          if (!sameExtra) {
            existing.requiredExtras.push(requiredExtra);
            continue;
          }

          const mergedOptions = Array.from(new Set([...sameExtra.options, ...requiredExtra.options]));
          sameExtra.options = mergedOptions;
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
            requiredExtras={catalog.requiredExtras}
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
  catalogBlock: {
    marginBottom: 8,
  },
  extraLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  extraName: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  chipsContainer: {
    marginBottom: 12,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#E6F4FE',
    borderColor: '#E6F4FE',
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    color: '#ddd',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#000',
    fontWeight: '700',
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
