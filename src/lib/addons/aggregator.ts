import { fetchCatalog, fetchMeta, fetchStreams } from './client';
import { CatalogResponse, MetaPreview, Stream } from './types';

export interface InstalledAddon {
  manifestUrl: string;
  name: string;
  version: string;
  catalogs: { id: string; type: string; name: string }[];
}

export async function aggregateCatalogs(
  addons: InstalledAddon[],
  type: string,
  catalogId: string,
  extra?: Record<string, string>
): Promise<{ addonName: string; metas: MetaPreview[] }[]> {
  const promises = addons.map(async (addon) => {
    // Check if addon supports this catalog
    const hasCatalog = addon.catalogs.some(c => c.id === catalogId && c.type === type);
    if (!hasCatalog) return null;

    try {
      const response = await fetchCatalog(addon.manifestUrl, type, catalogId, extra);
      if (response && response.metas && response.metas.length > 0) {
        return {
          addonName: addon.name,
          metas: response.metas,
        };
      }
    } catch (e) {
      console.warn(`Failed to fetch catalog from ${addon.name}`, e);
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is { addonName: string; metas: MetaPreview[] } => r !== null);
}

export async function aggregateStreams(
  addons: InstalledAddon[],
  type: string,
  id: string
): Promise<{ addonName: string; streams: Stream[] }[]> {
  const promises = addons.map(async (addon) => {
    try {
      const response = await fetchStreams(addon.manifestUrl, type, id);
      if (response && response.streams && response.streams.length > 0) {
        return {
          addonName: addon.name,
          streams: response.streams,
        };
      }
    } catch (e) {
      console.warn(`Failed to fetch streams from ${addon.name}`, e);
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is { addonName: string; streams: Stream[] } => r !== null);
}
