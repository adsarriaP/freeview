import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { CommunityAddonItem, useCommunityAddons } from '../../src/hooks/useCommunityAddons';
import { useDebounce } from '../../src/hooks/useDebounce';
import { ADDON_CATEGORIES, AddonCategory } from '../../src/lib/addons/community';
import { useAddonsStore } from '../../src/store/addonsStore';

type CategoryFilter = 'all' | AddonCategory;

function AddonRow({ item, isInstalled, onInstall, isInstalling }: {
  item: CommunityAddonItem;
  isInstalled: boolean;
  onInstall: (url: string) => void;
  isInstalling: boolean;
}) {
  const { manifest, transportUrl } = item;

  return (
    <View style={styles.addonRow}>
      <View style={styles.addonLogoContainer}>
        {manifest.logo ? (
          <Image source={{ uri: manifest.logo }} style={styles.addonLogo} resizeMode="contain" />
        ) : (
          <View style={styles.addonLogoPlaceholder}>
            <Text style={styles.addonLogoPlaceholderText}>{manifest.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.addonInfo}>
        <Text style={styles.addonName} numberOfLines={1}>{manifest.name}</Text>
        {manifest.description ? (
          <Text style={styles.addonDescription} numberOfLines={2}>{manifest.description}</Text>
        ) : null}
        <View style={styles.typesRow}>
          {manifest.types?.map((type) => (
            <View key={type} style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{type}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.installButton,
          isInstalled && styles.installedButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => onInstall(transportUrl)}
        disabled={isInstalled || isInstalling}
      >
        {isInstalling ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={[styles.installButtonText, isInstalled && styles.installedButtonText]}>
            {isInstalled ? 'Instalado' : 'Instalar'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function AddonsExplorerScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useCommunityAddons();
  const addons = useAddonsStore((state) => state.addons);
  const addAddon = useAddonsStore((state) => state.addAddon);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [manualUrl, setManualUrl] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [installingUrl, setInstallingUrl] = useState<string | null>(null);

  const installedUrls = useMemo(() => new Set(addons.map((a) => a.manifestUrl)), [addons]);

  const filteredAddons = useMemo(() => {
    if (!data) return [];

    const term = debouncedSearch.trim().toLowerCase();

    return data.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || item.categories.includes(categoryFilter);
      if (!matchesCategory) return false;

      if (!term) return true;
      return (
        item.manifest.name.toLowerCase().includes(term) ||
        (item.manifest.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [data, debouncedSearch, categoryFilter]);

  const handleInstall = async (url: string) => {
    setInstallingUrl(url);
    try {
      await addAddon(url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo instalar el addon.';
      Alert.alert('Error al instalar', message);
    } finally {
      setInstallingUrl(null);
    }
  };

  const handleManualAdd = async () => {
    if (!manualUrl) return;
    setIsAddingManual(true);
    try {
      await addAddon(manualUrl);
      setManualUrl('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo instalar el addon.';
      Alert.alert('Error al instalar', message);
    } finally {
      setIsAddingManual(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar addons</Text>
      </View>

      <View style={styles.manualSection}>
        <Text style={styles.manualLabel}>Agregar por URL (manifest.json)</Text>
        <View style={styles.manualInputRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="https://.../manifest.json"
            placeholderTextColor="#666"
            value={manualUrl}
            onChangeText={setManualUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.manualAddButton,
              pressed && styles.buttonPressed,
              (!manualUrl || isAddingManual) && styles.buttonDisabled,
            ]}
            onPress={handleManualAdd}
            disabled={!manualUrl || isAddingManual}
          >
            <Text style={styles.manualAddButtonText}>{isAddingManual ? '...' : 'Agregar'}</Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar addons..."
        placeholderTextColor="#666"
        value={searchTerm}
        onChangeText={setSearchTerm}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesList}
        contentContainerStyle={styles.categoriesContent}
        data={[{ key: 'all' as CategoryFilter, label: 'Todos' }, ...ADDON_CATEGORIES]}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const selected = categoryFilter === item.key;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.categoryChip,
                selected && styles.categoryChipSelected,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setCategoryFilter(item.key)}
            >
              <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#E6F4FE" />
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>No se pudo cargar el catalogo de addons.</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()} disabled={isFetching}>
            <Text style={styles.retryButtonText}>{isFetching ? 'Reintentando...' : 'Reintentar'}</Text>
          </Pressable>
        </View>
      ) : filteredAddons.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>No hay addons que coincidan con tu busqueda.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAddons}
          keyExtractor={(item) => item.transportUrl}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AddonRow
              item={item}
              isInstalled={installedUrls.has(item.transportUrl)}
              onInstall={handleInstall}
              isInstalling={installingUrl === item.transportUrl}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E6F4FE',
    marginBottom: 12,
  },
  manualSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  manualLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 6,
  },
  manualInputRow: {
    flexDirection: 'row',
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    marginRight: 8,
  },
  manualAddButton: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  manualAddButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  searchInput: {
    marginHorizontal: 16,
    backgroundColor: '#1A1A1A',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  categoriesList: {
    flexGrow: 0,
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#E6F4FE',
    borderColor: '#E6F4FE',
  },
  categoryChipText: {
    color: '#ddd',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  addonLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  addonLogo: {
    width: '100%',
    height: '100%',
  },
  addonLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonLogoPlaceholderText: {
    color: '#aaa',
    fontSize: 20,
    fontWeight: '700',
  },
  addonInfo: {
    flex: 1,
    marginRight: 8,
  },
  addonName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  addonDescription: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  typeBadge: {
    backgroundColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginTop: 2,
  },
  typeBadgeText: {
    color: '#E6F4FE',
    fontSize: 10,
    fontWeight: '600',
  },
  installButton: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 84,
    alignItems: 'center',
  },
  installedButton: {
    backgroundColor: '#222',
  },
  installButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
  installedButtonText: {
    color: '#888',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
