import { useState } from 'react';
import { Alert, Clipboard, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supportsResource } from '../../src/lib/addons/filter';
import { useAddonsStore } from '../../src/store/addonsStore';

// Addons populares del ecosistema Stremio para sugerir al usuario
const SUGGESTED_ADDONS = [
  {
    name: 'Torrentio',
    url: 'https://torrentio.strem.fun/manifest.json',
    description: 'El addon de streams mas popular. Devuelve fuentes P2P (torrents). Con debrid, devuelve links HTTP directos.',
    isP2P: true,
  },
  {
    name: 'Torrentio (configurado con debrid)',
    url: 'https://torrentio.strem.fun/providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,horriblesubs,nyaasi,tokyotosho,anidex/debridoptions=nodownloadlinks,nocatalog/realdebrid=TU_API_KEY/manifest.json',
    description: 'Reemplaza TU_API_KEY con tu clave de Real-Debrid para obtener links HTTP directos.',
    isP2P: false,
  },
  {
    name: 'Opensubtitles V3',
    url: 'https://opensubtitles-v3.strem.io/manifest.json',
    description: 'Addon oficial de subtitulos. Proporciona subtitulos en multiples idiomas para peliculas y series.',
    isP2P: false,
  },
];


export default function SettingsScreen() {
  const { addons, addAddon, removeAddon, toggleAddon, resetToDefaults } = useAddonsStore();
  const [newAddonUrl, setNewAddonUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newAddonUrl) return;
    setIsAdding(true);
    try {
      await addAddon(newAddonUrl);
      setNewAddonUrl('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo instalar el addon.';
      Alert.alert('Error adding addon', message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Addon</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="https://.../manifest.json"
              placeholderTextColor="#666"
              value={newAddonUrl}
              onChangeText={setNewAddonUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable 
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.buttonPressed,
                (!newAddonUrl || isAdding) && styles.buttonDisabled
              ]} 
              onPress={handleAdd}
              disabled={!newAddonUrl || isAdding}
            >
              <Text style={styles.addButtonText}>{isAdding ? '...' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Installed Addons</Text>
          {addons.length === 0 ? (
            <Text style={styles.emptyText}>No addons installed.</Text>
          ) : (
            addons.map((addon) => (
              <View key={addon.manifestUrl} style={styles.addonItem}>
                <View style={styles.addonInfo}>
                  <View style={styles.addonNameRow}>
                    <Text style={styles.addonName}>{addon.name}</Text>
                    <Text style={styles.addonVersion}>v{addon.version}</Text>
                  </View>
                  <Text style={styles.addonUrl} numberOfLines={1}>{addon.manifestUrl}</Text>

                  {/* Badges de capacidades del addon */}
                  <View style={styles.capabilitiesRow}>
                    {supportsResource(addon, 'catalog') && (
                      <View style={styles.capBadge}>
                        <Text style={styles.capBadgeText}>📋 Catálogo</Text>
                      </View>
                    )}
                    {supportsResource(addon, 'meta') && (
                      <View style={styles.capBadge}>
                        <Text style={styles.capBadgeText}>🎥 Meta</Text>
                      </View>
                    )}
                    {supportsResource(addon, 'stream') && (
                      <View style={[styles.capBadge, styles.capBadgeStream]}>
                        <Text style={styles.capBadgeText}>▶️ Streams</Text>
                      </View>
                    )}
                  </View>

                  {addon.types.length > 0 ? (
                    <View style={styles.typesRow}>
                      {addon.types.map((type) => (
                        <View key={type} style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>{type}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.warningsRow}>
                    {addon.behaviorHints?.configurationRequired ? (
                      <View style={styles.warningBadge}>
                        <Text style={styles.warningBadgeText}>Requiere configuracion</Text>
                      </View>
                    ) : null}
                    {addon.behaviorHints?.p2p ? (
                      <View style={styles.dangerBadge}>
                        <Text style={styles.dangerBadgeText}>P2P / Torrent</Text>
                      </View>
                    ) : null}
                    {addon.behaviorHints?.adult ? (
                      <View style={styles.dangerBadge}>
                        <Text style={styles.dangerBadgeText}>Contenido adulto</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.addonActions}>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.toggleButton,
                      addon.active ? styles.toggleActive : styles.toggleInactive,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => toggleAddon(addon.manifestUrl)}
                  >
                    <Text style={styles.toggleButtonText}>
                      {addon.active ? 'Active' : 'Disabled'}
                    </Text>
                  </Pressable>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.removeButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => removeAddon(addon.manifestUrl)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
          <Pressable
            style={({ pressed }) => [styles.resetButton, pressed && styles.buttonPressed]}
            onPress={() => resetToDefaults()}
          >
            <Text style={styles.resetButtonText}>Restaurar addons por defecto</Text>
          </Pressable>
        </View>

        {/* Addons sugeridos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Addons sugeridos</Text>
          <Text style={styles.suggestedNote}>
            Toca el manifest para copiarlo y pegarlo en el campo de arriba.
          </Text>
          {SUGGESTED_ADDONS.map((suggestion) => (
            <Pressable
              key={suggestion.url}
              style={({ pressed }) => [styles.suggestionItem, pressed && styles.buttonPressed]}
              onPress={() => {
                Clipboard.setString(suggestion.url);
                Alert.alert('Copiado', `URL de ${suggestion.name} copiada al portapapeles.`);
              }}
            >
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionName}>{suggestion.name}</Text>
                {suggestion.isP2P && (
                  <View style={styles.dangerBadge}>
                    <Text style={styles.dangerBadgeText}>P2P</Text>
                  </View>
                )}
              </View>
              <Text style={styles.suggestionDesc}>{suggestion.description}</Text>
              <Text style={styles.suggestionUrl} numberOfLines={1}>{suggestion.url}</Text>
            </Pressable>
          ))}
        </View>
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
    padding: 16,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E6F4FE',
    marginBottom: 24,
    marginTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginRight: 12,
  },
  addButton: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonFocused: {
    borderColor: '#fff',
    borderWidth: 2,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  addonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  addonInfo: {
    flex: 1,
    marginRight: 12,
  },
  addonNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  addonName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addonVersion: {
    color: '#666',
    fontSize: 12,
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
  },
  typeBadgeText: {
    color: '#E6F4FE',
    fontSize: 10,
    fontWeight: '600',
  },
  warningsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  warningBadge: {
    backgroundColor: '#382A00',
    borderColor: '#D8A21D',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warningBadgeText: {
    color: '#F4D27A',
    fontSize: 10,
    fontWeight: '700',
  },
  dangerBadge: {
    backgroundColor: '#3A1414',
    borderColor: '#B33A3A',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dangerBadgeText: {
    color: '#F4A0A0',
    fontSize: 10,
    fontWeight: '700',
  },
  addonUrl: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  addonActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  toggleActive: {
    backgroundColor: '#E6F4FE',
  },
  toggleInactive: {
    backgroundColor: '#333',
  },
  toggleButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    width: 32,
    height: 32,
    backgroundColor: '#333',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#E6F4FE',
    fontSize: 14,
    fontWeight: '600',
  },
  // Badges de capacidades del addon (catalogo / meta / streams)
  capabilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  capBadge: {
    backgroundColor: '#1A2A1A',
    borderColor: '#3A6B3A',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  capBadgeStream: {
    backgroundColor: '#0D2540',
    borderColor: '#2A5FA0',
  },
  capBadgeText: {
    color: '#A8E6A8',
    fontSize: 10,
    fontWeight: '700',
  },
  // Seccion de addons sugeridos
  suggestedNote: {
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
  },
  suggestionItem: {
    backgroundColor: '#0D0D0D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginBottom: 10,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  suggestionName: {
    color: '#E6F4FE',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  suggestionDesc: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  suggestionUrl: {
    color: '#444',
    fontSize: 10,
    fontFamily: 'monospace' as const,
  },
  bottomPadding: {
    height: 80,
  }
});
