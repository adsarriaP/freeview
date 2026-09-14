import { CatalogGridScreen } from '../../src/components/CatalogGridScreen';

// Home muestra todos los catalogos disponibles, sin filtrar por type
const matchAll = () => ({ included: true });

export default function HomeScreen() {
  return <CatalogGridScreen headerTitle="FreeView" matchCatalog={matchAll} />;
}
