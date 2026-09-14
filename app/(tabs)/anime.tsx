import { CatalogGridScreen } from '../../src/components/CatalogGridScreen';
import { AddonCatalog } from '../../src/lib/addons/types';
import { Addon } from '../../src/store/addonsStore';

// Manifest-driven: usa catalogs tipo 'anime' declarados por el addon,
// o catalogs movie/series cuyo extra 'genre' ofrezca la opcion 'Anime'.
function matchAnime(_addon: Addon, catalog: AddonCatalog) {
  if (catalog.type === 'anime') {
    return { included: true };
  }

  const genreExtra = catalog.extra?.find((entry) => entry.name === 'genre');
  const hasAnimeGenre = genreExtra?.options?.some((option) => option.toLowerCase() === 'anime');

  if ((catalog.type === 'movie' || catalog.type === 'series') && hasAnimeGenre) {
    return { included: true, forcedExtra: { genre: 'Anime' } };
  }

  return { included: false };
}

export default function AnimeScreen() {
  return <CatalogGridScreen headerTitle="Anime" matchCatalog={matchAnime} />;
}
