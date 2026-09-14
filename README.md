# FreeView

FreeView es una app de React Native + Expo que funciona como agregador de addons del
protocolo abierto de Stremio. Corre desde un unico codigo fuente en Android (movil),
Android TV y Web (PWA instalable).

**Aviso legal**: FreeView no incluye, distribuye ni aloja ningun contenido audiovisual
propio. Es un cliente/agregador del protocolo abierto de Stremio: unicamente consume
addons de terceros (instalados por el usuario) que exponen catalogos, metadatos y
enlaces de streams via HTTP/JSON. El uso de addons especificos y el contenido al que
accedan es responsabilidad exclusiva del usuario.

## Funcionalidades

- **Protocolo de addons Stremio**: cliente completo (manifest, catalog, meta, stream)
  con filtrado real por `resources`, `types` e `idPrefixes` declarados en cada manifest.
- **Explorar addons**: catalogo de addons de la comunidad con busqueda, filtros por
  categoria (Peliculas, Series, Anime, IPTV/TV, Subtitulos, Otros) e instalacion con un
  toque, ademas de un formulario para agregar addons manualmente por URL.
- **Catalogos por categoria**: tabs dedicados de Inicio, Peliculas, Series y Anime,
  generados dinamicamente a partir de los catalogos que cada addon declara en su
  manifest (sin IDs de catalogo hardcodeados).
- **Busqueda**: busqueda cruzada entre addons, solo en catalogos que declaran soporte
  de `search`.
- **Detalle**: backdrop con gradiente, poster, genero, sinopsis, rating; para series,
  selector de temporada y episodios agrupados.
- **Reproductor**: expo-video con seleccion de fuente (varios addons), controles
  personalizados (play/pausa, barra de progreso con seek, tiempos), orientacion forzada
  a landscape, y manejo de streams torrent (`infoHash`) como no reproducibles sin
  servidor de streaming.
- **Ajustes**: gestion de addons instalados (activar/desactivar/eliminar), version y
  tipos de cada uno, y advertencias visibles si el addon requiere configuracion, usa
  P2P/torrents o contiene contenido para adultos.
- **Soporte TV**: navegacion por D-pad en catalogos, tarjetas y controles del
  reproductor, con estilos de foco visibles en Android TV / Apple TV.

## Como funciona el consumo de addons

FreeView consume addons siguiendo el manifiesto de Stremio como fuente de verdad:

- Al instalar un addon se descarga su `manifest.json` completo y se guarda tal cual
  (resources, types, catalogs con sus `extra`, idPrefixes y behaviorHints).
- Antes de cada request, se filtra por compatibilidad real del addon (`src/lib/addons/filter.ts`):
	- `supportsResource`: valida si el addon declara `catalog`, `meta`, `stream` o `subtitles`.
	- `supportsType`: valida si el addon acepta el `type` solicitado (movie, series, anime, etc.).
	- `supportsId`: valida `idPrefixes` del manifiesto o del resource para evitar requests imposibles.
- Los tabs de Inicio/Peliculas/Series/Anime solo consultan catalogos compatibles y
  respetan los `extra` requeridos (por ejemplo `genre`) antes de hacer fetch.
- Busqueda no usa IDs hardcodeados: solo consulta catalogs que declaran `extra: search`.
- Detalle usa agregacion de `meta` (`useMeta`) filtrada por manifest para reducir
  errores y latencia.
- Reproductor consulta streams (`useStreams`) solo en addons compatibles y permite
  elegir fuente entre todas las respuestas.

Este enfoque evita errores 404/400 por supuestos incorrectos y aisla los fallos por
addon: si uno esta caido o es lento, los demas siguen respondiendo con normalidad.

## Requisitos previos

- Node.js 20+
- EAS CLI (`npm install -g eas-cli`)
- Java / Android Studio (para pruebas locales en emulador)

## Como correr en desarrollo

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar el servidor de desarrollo de Expo:
```bash
npx expo start
```
Desde ahi se puede presionar `a` para abrir Android, o `w` para la vista previa Web.

## Generar builds

### Android (APK movil)
Para generar un APK orientado a moviles:
```bash
eas build -p android --profile apk-dev
```

### Android TV (APK TV)
Para generar un APK orientado a Android TV (incluye el intent de Leanback launcher y
navegacion por D-pad):
```bash
eas build -p android --profile apk-tv
```

### Web (PWA)
Para exportar un build estatico de web, instalable como PWA, que se puede alojar en
cualquier lado (Vercel, Netlify, GitHub Pages):
```bash
npx expo export -p web
```

## Licencia
GPL-3.0

