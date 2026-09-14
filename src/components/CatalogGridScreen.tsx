import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCatalogs } from '../hooks/useCatalogs';
import { supportsResource } from '../lib/addons/filter';
import { AddonCatalog } from '../lib/addons/types';
import { Addon, useAddonsStore } from '../store/addonsStore';
import { AddonsEmptyState } from './AddonsEmptyState';
import { Row } from './Row';

interface CatalogMatch {
  included: boolean;
  // extra ya resuelto (ej genre=Anime) que no requiere seleccion del usuario
  forcedExtra?: Record<string, string>;
}

export interface CatalogGridScreenProps {
  headerTitle: string;
  matchCatalog: (addon: Addon, catalog: AddonCatalog) => CatalogMatch;
}

interface CatalogExtraConfig {
  name: string;
  options: string[];
}

interface UniqueCatalog {
  type: string;
  id: string;
  name: string;
  requiredExtras: CatalogExtraConfig[];
  forcedExtra?: Record<string, string>;
}

function CatalogRow({
  type,
  catalogId,
  catalogName,
  requiredExtras,
  forcedExtra,
}: {
  type: string;
  catalogId: string;
  catalogName: string;
  requiredExtras: CatalogExtraConfig[];
  forcedExtra?: Record<string, string>;
}) {
  const [selectedExtras, setSelectedExtras] = React.useState<Record<string, string>>({});
  // extras que aun requieren seleccion manual del usuario (no cubiertos por forcedExtra)
  const pendingExtras = requiredExtras.filter((extra) => !forcedExtra?.[extra.name]);
  const hasPendingExtras = pendingExtras.length > 0;
  const canFetch = pendingExtras.every((extra) => Boolean(selectedExtras[extra.name]));
  const extraParams = canFetch ? { ...forcedExtra, ...selectedExtras } : undefined;
  const { data, isLoading, isError } = useCatalogs(type, catalogId, extraParams, !hasPendingExtras || canFetch);

  const handleSelectExtra = (extraName: string, option: string) => {
    setSelectedExtras((previous) => ({
      ...previous,
      [extraName]: option,
    }));
  };

  if (hasPendingExtras && !canFetch) {
    return (
      <View style={styles.catalogBlock}>
        <Text style={styles.extraLabel}>{catalogName}</Text>
        {pendingExtras.map((extra) => (
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

export function CatalogGridScreen({ headerTitle, matchCatalog }: CatalogGridScreenProps) {
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter((addon) => addon.active && supportsResource(addon, 'catalog'));

  const uniqueCatalogs = React.useMemo(() => {
    const catalogsMap = new Map<string, UniqueCatalog>();

    activeAddons.forEach((addon) => {
      addon.catalogs.forEach((catalog) => {
        const match = matchCatalog(addon, catalog);
        if (!match.included) return;

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
            forcedExtra: match.forcedExtra,
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
  }, [activeAddons, matchCatalog]);

  if (activeAddons.length === 0) {
    return <AddonsEmptyState hasNoAddonsAtAll={addons.length === 0} />;
  }

  if (uniqueCatalogs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Sin catalogos para "{headerTitle}"</Text>
          <Text style={styles.emptyStateSubtext}>
            Ninguno de tus addons activos declara catalogos compatibles con esta seccion.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>{headerTitle}</Text>
        {uniqueCatalogs.map((catalog) => (
          <CatalogRow
            key={`${catalog.type}-${catalog.id}`}
            type={catalog.type}
            catalogId={catalog.id}
            catalogName={catalog.name}
            requiredExtras={catalog.requiredExtras}
            forcedExtra={catalog.forcedExtra}
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
    paddingHorizontal: 24,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 80,
  },
});
