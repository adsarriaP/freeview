import { AddonManifest } from './types';

// Fuente publica y estable usada por el cliente oficial de Stremio para el
// catalogo de addons de la comunidad. Se documenta aqui porque no hay un
// "manifest" formal para este endpoint, solo devuelve un array de entradas.
const COMMUNITY_ADDONS_URL = 'https://api.strem.io/addonscollection.json';

export interface CommunityAddonEntry {
  transportUrl: string;
  transportName?: string;
  manifest: AddonManifest;
}

function isCommunityAddonEntry(entry: unknown): entry is CommunityAddonEntry {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  const candidate = entry as Partial<CommunityAddonEntry>;
  return (
    typeof candidate.transportUrl === 'string' &&
    !!candidate.manifest &&
    typeof candidate.manifest.name === 'string' &&
    Array.isArray(candidate.manifest.resources)
  );
}

export async function fetchCommunityAddons(): Promise<CommunityAddonEntry[]> {
  const response = await fetch(COMMUNITY_ADDONS_URL);
  if (!response.ok) {
    throw new Error(`No se pudo obtener el catalogo de addons (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Respuesta invalida del catalogo de addons comunitarios');
  }

  // se descartan entradas mal formadas para que un solo addon roto no tumbe la lista
  return data.filter(isCommunityAddonEntry);
}

export type AddonCategory = 'movies' | 'series' | 'anime' | 'iptv' | 'subtitles' | 'other';

export const ADDON_CATEGORIES: { key: AddonCategory; label: string }[] = [
  { key: 'movies', label: 'Peliculas' },
  { key: 'series', label: 'Series' },
  { key: 'anime', label: 'Anime' },
  { key: 'iptv', label: 'IPTV/TV' },
  { key: 'subtitles', label: 'Subtitulos' },
  { key: 'other', label: 'Otros' },
];

// Clasifica un manifest por categoria segun sus types/resources declarados.
export function classifyAddon(manifest: AddonManifest): AddonCategory[] {
  const categories = new Set<AddonCategory>();
  const resourceNames = (manifest.resources ?? []).map((resource) =>
    typeof resource === 'string' ? resource : resource.name
  );
  const types = manifest.types ?? [];

  if (resourceNames.includes('subtitles')) categories.add('subtitles');
  if (types.includes('anime')) categories.add('anime');
  if (types.includes('movie')) categories.add('movies');
  if (types.includes('series')) categories.add('series');
  if (types.includes('tv') || types.includes('channel')) categories.add('iptv');

  if (categories.size === 0) {
    categories.add('other');
  }

  return Array.from(categories);
}
