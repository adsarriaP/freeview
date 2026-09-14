import { useQuery } from '@tanstack/react-query';
import { useAddonsStore } from '../store/addonsStore';
import { aggregateCatalogs } from '../lib/addons/aggregator';
import { MetaPreview } from '../lib/addons/types';

export function useCatalogs(type: string, catalogId: string, extra?: Record<string, string>) {
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);

  return useQuery({
    queryKey: ['catalogs', type, catalogId, extra, activeAddons.map(a => a.manifestUrl)],
    queryFn: async () => {
      const results = await aggregateCatalogs(activeAddons, type, catalogId, extra);
      return results;
    },
    enabled: activeAddons.length > 0,
  });
}
