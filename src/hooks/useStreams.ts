import { useQuery } from '@tanstack/react-query';
import { aggregateStreams } from '../lib/addons/aggregator';
import { useAddonsStore } from '../store/addonsStore';

// Trae y combina streams de todos los addons activos compatibles
// (filtrado por resource/type/idPrefix via aggregateStreams + filter.ts).
export function useStreams(type: string, id: string) {
  const addons = useAddonsStore((state) => state.addons);
  const activeAddons = addons.filter((a) => a.active);

  return useQuery({
    queryKey: ['streams', type, id, activeAddons.map((a) => a.manifestUrl)],
    queryFn: async () => {
      return aggregateStreams(activeAddons, type, id);
    },
    enabled: activeAddons.length > 0 && !!type && !!id,
  });
}
