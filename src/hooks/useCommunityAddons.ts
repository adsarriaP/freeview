import { useQuery } from '@tanstack/react-query';
import { AddonCategory, classifyAddon, CommunityAddonEntry, fetchCommunityAddons } from '../lib/addons/community';

export interface CommunityAddonItem extends CommunityAddonEntry {
  categories: AddonCategory[];
}

export function useCommunityAddons() {
  return useQuery<CommunityAddonItem[]>({
    queryKey: ['community-addons'],
    queryFn: async () => {
      const entries = await fetchCommunityAddons();
      return entries.map((entry) => ({
        ...entry,
        categories: classifyAddon(entry.manifest),
      }));
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });
}
