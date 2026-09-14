import { Addon } from '../../store/addonsStore';
import { fetchCatalog, fetchMeta, fetchStreams } from './client';
import { supportsId, supportsResource, supportsType } from './filter';
import { MetaDetail, MetaPreview, Stream } from './types';

export async function aggregateCatalogs(
  addons: Addon[],
  type: string,
  catalogId: string,
  extra?: Record<string, string>
): Promise<{ addonName: string; metas: MetaPreview[] }[]> {
  const promises = addons.map(async (addon) => {
    if (!supportsResource(addon, 'catalog') || !supportsType(addon, 'catalog', type)) {
      return null;
    }

    // Check if addon supports this catalog
    const hasCatalog = addon.catalogs.some(c => c.id === catalogId && c.type === type);
    if (!hasCatalog) return null;

    const catalog = addon.catalogs.find((entry) => entry.id === catalogId && entry.type === type);
    const requiredExtras = (catalog?.extra ?? []).filter((entry) => entry.isRequired);
    const missingRequiredExtra = requiredExtras.some((required) => !extra?.[required.name]);
    if (missingRequiredExtra) {
      return null;
    }

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
  addons: Addon[],
  type: string,
  id: string
): Promise<{ addonName: string; streams: Stream[] }[]> {
  const promises = addons.map(async (addon) => {
    if (
      !supportsResource(addon, 'stream') ||
      !supportsType(addon, 'stream', type) ||
      !supportsId(addon, 'stream', id)
    ) {
      return null;
    }

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

export async function aggregateMeta(
  addons: Addon[],
  type: string,
  id: string
): Promise<{ addonName: string; addonUrl: string; meta: MetaDetail } | null> {
  const compatibleAddons = addons.filter(
    (addon) =>
      supportsResource(addon, 'meta') && supportsType(addon, 'meta', type) && supportsId(addon, 'meta', id)
  );

  for (const addon of compatibleAddons) {
    try {
      const response = await fetchMeta(addon.manifestUrl, type, id);
      if (response?.meta) {
        return {
          addonName: addon.name,
          addonUrl: addon.manifestUrl,
          meta: response.meta,
        };
      }
    } catch (e) {
      console.warn(`Failed to fetch meta from ${addon.name}`, e);
    }
  }

  return null;
}
