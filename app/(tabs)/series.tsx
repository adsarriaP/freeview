import { CatalogGridScreen } from '../../src/components/CatalogGridScreen';

const matchSeries = (_addon: unknown, catalog: { type: string }) => ({
  included: catalog.type === 'series',
});

export default function SeriesScreen() {
  return <CatalogGridScreen headerTitle="Series" matchCatalog={matchSeries} />;
}
