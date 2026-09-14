import { CatalogGridScreen } from '../../src/components/CatalogGridScreen';

const matchMovies = (_addon: unknown, catalog: { type: string }) => ({
  included: catalog.type === 'movie',
});

export default function MoviesScreen() {
  return <CatalogGridScreen headerTitle="Peliculas" matchCatalog={matchMovies} />;
}
