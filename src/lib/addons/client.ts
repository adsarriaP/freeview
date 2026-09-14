import { AddonManifest, CatalogResponse, MetaResponse, StreamsResponse } from './types';

const TIMEOUT_MS = 10000;

class AddonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AddonError';
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new AddonError(`HTTP Error: ${response.status}`);
    }
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new AddonError(`Timeout fetching ${url}`);
    }
    throw new AddonError(error.message || 'Network error');
  } finally {
    clearTimeout(id);
  }
}

export function formatAddonUrl(url: string): string {
  if (url.startsWith('stremio://')) {
    return url.replace('stremio://', 'https://');
  }
  return url;
}

export function getBaseUrl(manifestUrl: string): string {
  return manifestUrl.replace('/manifest.json', '');
}

export async function fetchManifest(manifestUrl: string): Promise<AddonManifest> {
  const url = formatAddonUrl(manifestUrl);
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  return data;
}

export async function fetchCatalog(
  manifestUrl: string,
  type: string,
  catalogId: string,
  extra?: Record<string, string>
): Promise<CatalogResponse> {
  const baseUrl = getBaseUrl(formatAddonUrl(manifestUrl));
  let url = `${baseUrl}/catalog/${type}/${catalogId}`;
  
  if (extra && Object.keys(extra).length > 0) {
    const extraParts = Object.entries(extra).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
    url += `/${extraParts.join('&')}`;
  }
  
  url += '.json';
  
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  return data;
}

export async function fetchMeta(manifestUrl: string, type: string, id: string): Promise<MetaResponse> {
  const baseUrl = getBaseUrl(formatAddonUrl(manifestUrl));
  const url = `${baseUrl}/meta/${type}/${encodeURIComponent(id)}.json`;
  
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  return data;
}

export async function fetchStreams(manifestUrl: string, type: string, id: string): Promise<StreamsResponse> {
  const baseUrl = getBaseUrl(formatAddonUrl(manifestUrl));
  const url = `${baseUrl}/stream/${type}/${encodeURIComponent(id)}.json`;
  
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  return data;
}
