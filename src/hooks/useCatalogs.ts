import { useQuery } from '@tanstack/react-query';
import { aggregateCatalogs } from '../lib/addons/aggregator';
import { useAddonsStore } from '../store/addonsStore';

export function useCatalogs(
  type: string,
  catalogId: string,
  extra?: Record<string, string>,
  enabled: boolean = true
) {
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter(a => a.active);

  return useQuery({
    queryKey: ['catalogs', type, catalogId, extra, activeAddons.map(a => a.manifestUrl)],
    queryFn: async () => {
      const results = await aggregateCatalogs(activeAddons, type, catalogId, extra);
      return results;
    },
    enabled: enabled && activeAddons.length > 0,
  });
}
