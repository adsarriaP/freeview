import { Addon } from '../../store/addonsStore';

type ResourceName = 'catalog' | 'meta' | 'stream' | 'subtitles';

function getResourceObject(addon: Addon, resource: string) {
  return addon.resources.find(
    (entry): entry is { name: string; types: string[]; idPrefixes?: string[] } =>
      typeof entry !== 'string' && entry.name === resource
  );
}

export function supportsResource(addon: Addon, resource: ResourceName): boolean {
  return addon.resources.some((entry) => {
    if (typeof entry === 'string') {
      return entry === resource;
    }

    return entry.name === resource;
  });
}

export function getEffectiveIdPrefixes(addon: Addon, resource: string): string[] | undefined {
  const fromResource = getResourceObject(addon, resource)?.idPrefixes;
  if (fromResource && fromResource.length > 0) {
    return fromResource;
  }

  if (addon.idPrefixes && addon.idPrefixes.length > 0) {
    return addon.idPrefixes;
  }

  return undefined;
}

export function supportsId(addon: Addon, resource: string, id: string): boolean {
  const prefixes = getEffectiveIdPrefixes(addon, resource);
  if (!prefixes || prefixes.length === 0) {
    return true;
  }

  return prefixes.some((prefix) => id.startsWith(prefix));
}

export function supportsType(addon: Addon, resource: string, type: string): boolean {
  const resourceObject = getResourceObject(addon, resource);
  if (resourceObject) {
    if (!resourceObject.types || resourceObject.types.length === 0) {
      return true;
    }

    return resourceObject.types.includes(type);
  }

  if (!addon.types || addon.types.length === 0) {
    return true;
  }

  return addon.types.includes(type);
}
