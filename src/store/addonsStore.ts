import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchManifest } from '../lib/addons/client';

export interface Addon {
  manifestUrl: string;
  name: string;
  version: string;
  catalogs: { id: string; type: string; name: string }[];
  active: boolean;
}

interface AddonsState {
  addons: Addon[];
  addAddon: (url: string) => Promise<void>;
  removeAddon: (url: string) => void;
  toggleAddon: (url: string) => void;
  getActiveAddons: () => Addon[];
}

// Default public domain addon (Cinemeta is usually default for Stremio, 
// but we'll use a placeholder or let user add them. We can add Cinemeta as default)
const DEFAULT_ADDONS: Addon[] = [
  {
    manifestUrl: 'https://v3-cinemeta.strem.io/manifest.json',
    name: 'Cinemeta',
    version: '3.0.0',
    catalogs: [
      { id: 'top', type: 'movie', name: 'Top Movies' },
      { id: 'top', type: 'series', name: 'Top Series' }
    ],
    active: true
  }
];

export const useAddonsStore = create<AddonsState>()(
  persist(
    (set, get) => ({
      addons: DEFAULT_ADDONS,
      addAddon: async (url: string) => {
        // Fetch manifest to get details
        const manifest = await fetchManifest(url);
        
        const newAddon: Addon = {
          manifestUrl: url,
          name: manifest.name,
          version: manifest.version,
          catalogs: manifest.catalogs.map(c => ({
            id: c.id,
            type: c.type,
            name: c.name || c.id,
          })),
          active: true,
        };

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
      }
    }),
    {
      name: 'freeview-addons-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
