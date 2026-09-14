import { useQuery } from '@tanstack/react-query';
import { aggregateMeta } from '../lib/addons/aggregator';
import { useAddonsStore } from '../store/addonsStore';

// Trae el meta agregado del primer addon activo compatible (filtrado por
// resource/type/idPrefix via aggregateMeta + filter.ts).
export function useMeta(type: string, id: string) {
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter((a) => a.active);

  return useQuery({
    queryKey: ['meta', type, id, activeAddons.map((a) => a.manifestUrl)],
    queryFn: async () => {
      const result = await aggregateMeta(activeAddons, type, id);
      if (!result) {
        throw new Error('Meta not found');
      }
      return result;
    },
    enabled: activeAddons.length > 0 && !!type && !!id,
  });
}
