import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { fetchManifest } from '../lib/addons/client';
import { AddonCatalog, AddonManifest } from '../lib/addons/types';

export interface Addon {
  manifestUrl: string;
  id: string;
  name: string;
  version: string;
  types: string[];
  resources: Array<string | { name: string; types: string[]; idPrefixes?: string[] }>;
  idPrefixes?: string[];
  catalogs: AddonCatalog[];
  behaviorHints?: {
    adult?: boolean;
    p2p?: boolean;
    configurable?: boolean;
    configurationRequired?: boolean;
  };
  active: boolean;
  /** undefined = no verificado aun, true = accesible, false = inalcanzable */
  reachable?: boolean;
}

interface PersistedAddonsState {
  addons: Addon[];
}

interface AddonsState {
  addons: Addon[];
  addAddon: (url: string) => Promise<void>;
  removeAddon: (url: string) => void;
  toggleAddon: (url: string) => void;
  getActiveAddons: () => Addon[];
  resetToDefaults: () => void;
  /** Verifica en background si cada addon responde y activa solo los que funcionan */
  validateAndActivateAddons: () => Promise<void>;
}

// Default public domain addon (Cinemeta es el addon de metadatos oficial de Stremio)
const DEFAULT_ADDONS: Addon[] = [
  {
    manifestUrl: 'https://v3-cinemeta.strem.io/manifest.json',
    id: 'org.cinemeta',
    name: 'Cinemeta',
    version: '3.0.0',
    types: ['movie', 'series'],
    resources: ['catalog', 'meta'],
    idPrefixes: ['tt'],
    catalogs: [
      {
        id: 'top',
        type: 'movie',
        name: 'Top Movies',
        extra: [{ name: 'search' }],
      },
      {
        id: 'top',
        type: 'series',
        name: 'Top Series',
        extra: [{ name: 'search' }],
      }
    ],
    behaviorHints: {
      configurable: false,
      configurationRequired: false,
      adult: false,
      p2p: false,
    },
    active: true
  },
  // Torrentio: addon de streams más popular del ecosistema Stremio.
  // Devuelve streams con infoHash (P2P) y, cuando se configura con debrid,
  // también links HTTP directos. En web, los torrents se resuelven via WebTorrent.
  {
    manifestUrl: 'https://torrentio.strem.fun/manifest.json',
    id: 'com.torrentio',
    name: 'Torrentio',
    version: '0.0.14',
    types: ['movie', 'series', 'anime', 'other'],
    resources: [
      { name: 'stream', types: ['movie', 'series', 'anime', 'other'], idPrefixes: ['tt', 'kitsu'] }
    ],
    idPrefixes: ['tt', 'kitsu'],
    catalogs: [],
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
      adult: false,
      p2p: true,
    },
    active: true
  }
];

function isValidResourceEntry(
  resource: string | { name: string; types: string[]; idPrefixes?: string[] }
): boolean {
  if (typeof resource === 'string') {
    return resource.length > 0;
  }

  return (
    !!resource.name &&
    Array.isArray(resource.types) &&
    resource.types.every((entry) => typeof entry === 'string' && entry.length > 0)
  );
}

function normalizeAddon(url: string, manifest: AddonManifest): Addon {
  return {
    manifestUrl: url,
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    types: manifest.types ?? [],
    resources: (manifest.resources ?? []).filter(isValidResourceEntry),
    idPrefixes: manifest.idPrefixes,
    catalogs: (manifest.catalogs ?? []).map((catalog) => ({
      id: catalog.id,
      type: catalog.type,
      name: catalog.name || catalog.id,
      extra: catalog.extra,
    })),
    behaviorHints: manifest.behaviorHints,
    active: true,
  };
}

function isValidAddonShape(addon: unknown): addon is Addon {
  if (!addon || typeof addon !== 'object') {
    return false;
  }

  const candidate = addon as Partial<Addon>;
  return (
    typeof candidate.manifestUrl === 'string' &&
    Array.isArray(candidate.resources) &&
    candidate.resources.length > 0 &&
    Array.isArray(candidate.catalogs)
  );
}

export const useAddonsStore = create<AddonsState>()(
  persist(
    (set, get) => ({
      addons: DEFAULT_ADDONS,
      addAddon: async (url: string) => {
        // Fetch manifest to get details
        const manifest = await fetchManifest(url);

        const newAddon = normalizeAddon(url, manifest);
        if (newAddon.resources.length === 0) {
          throw new Error('El manifest no declara resources validos para el protocolo de Stremio.');
        }

        set((state) => {
          // Check if already exists
          const exists = state.addons.find(a => a.manifestUrl === url);
          if (exists) return state; // Do nothing if already installed
          return { addons: [...state.addons, newAddon] };
        });
      },
      removeAddon: (url: string) => {
        set((state) => ({
          addons: state.addons.filter(a => a.manifestUrl !== url)
        }));
      },
      toggleAddon: (url: string) => {
        set((state) => ({
          addons: state.addons.map(a => 
            a.manifestUrl === url ? { ...a, active: !a.active } : a
          )
        }));
      },
      getActiveAddons: () => {
        return get().addons.filter(a => a.active);
      },
      resetToDefaults: () => {
        // reemplaza cualquier entrada corrupta/desactualizada por los addons validos por defecto
        set({ addons: DEFAULT_ADDONS });
      },
      validateAndActivateAddons: async () => {
        const { addons } = get();
        // Verificamos todos los addons en paralelo con un timeout de 8s
        const results = await Promise.allSettled(
          addons.map(async (addon) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);
              const response = await fetch(addon.manifestUrl, {
                method: 'HEAD',
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              return { url: addon.manifestUrl, reachable: response.ok };
            } catch {
              return { url: addon.manifestUrl, reachable: false };
            }
          })
        );

        // Actualizar el estado con los resultados de validacion
        set((state) => ({
          addons: state.addons.map((addon) => {
            const result = results.find(
              (r) => r.status === 'fulfilled' && r.value.url === addon.manifestUrl
            );
            const reachable =
              result?.status === 'fulfilled' ? result.value.reachable : false;
            return {
              ...addon,
              reachable,
              // Activar automaticamente si el addon es alcanzable,
              // desactivar solo si se confirma inalcanzable (no afecta addons configurados a mano)
              active: reachable,
            };
          }),
        }));
      },
    }),
    {
      name: 'freeview-addons-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      migrate: (persistedState, version) => {
        // v4: agrega Torrentio como addon de streams por defecto.
        // Si la version guardada es menor a 4, reseteamos a defaults.
        if (!persistedState || version < 4) {
          return { addons: DEFAULT_ADDONS };
        }

        const state = persistedState as PersistedAddonsState;
        if (!Array.isArray(state.addons) || state.addons.length === 0 || !state.addons.every(isValidAddonShape)) {
          return { addons: DEFAULT_ADDONS };
        }

        return state;
      },
    }
  )
);
