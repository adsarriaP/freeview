# FreeView

FreeView is a multi-platform React Native streaming aggregator app built with Expo.
It runs on a single codebase across Android (Mobile), Android TV, and Web (PWA).

## Features (MVP)
- **Stremio Addon Protocol**: Full integration with community HTTP/JSON addons.
- **Aggregated Catalogs**: Unified home screen merging content from all active addons.
- **Search**: Cross-addon search functionality.
- **Dynamic Meta Details**: Posters, backdrops, genres, descriptions, and episode selection.
- **Video Player**: Native Expo Video player for MP4 and HLS streams.
- **TV Support**: Fully D-pad navigable and optimized layout for Android TV / Apple TV.

## Como funciona el consumo de addons

FreeView consume addons siguiendo el manifiesto de Stremio como fuente de verdad:

- Primero descarga `manifest.json` y guarda el manifiesto completo del addon (resources, types, catalogs, idPrefixes y behaviorHints).
- Antes de cada request, filtra por compatibilidad real del addon:
	- `supportsResource`: valida si el addon declara `catalog`, `meta`, `stream` o `subtitles`.
	- `supportsType`: valida si el addon acepta el `type` solicitado (movie, series, etc.).
	- `supportsId`: valida `idPrefixes` del manifiesto o del resource para evitar requests imposibles.
- Home solo consulta catalogs compatibles y maneja `extra` requeridos del catalog (por ejemplo `genre`) antes de hacer fetch.
- Search no usa IDs hardcodeados: solo consulta catalogs que declaran `extra: search`.
- Detail usa agregacion de `meta` filtrada por manifest para reducir errores y latencia.
- Player consulta streams solo en addons compatibles y permite elegir fuente. Los streams torrent (`infoHash`) se muestran como no reproducibles sin servidor.

Este enfoque evita 404/400 por supuestos incorrectos y mantiene aislados los fallos por addon (si uno falla, los demas siguen respondiendo).

## Prerequisites

- Node.js 20+
- EAS CLI (`npm install -g eas-cli`)
- Java / Android Studio (for local emulator testing)

## Getting Started

1. Clone and install dependencies:
```bash
npm install
```

2. Start the Expo development server:
```bash
npx expo start
```
From here you can press `a` to open Android, or `w` to open the Web preview.

## Building for Production

### Android (Mobile APK)
To build an APK tailored for mobile devices:
```bash
eas build -p android --profile apk-dev
```

### Android TV (TV APK)
To build an APK tailored for Android TV (includes Leanback launcher intent and TV focus features):
```bash
eas build -p android --profile apk-tv
```

### Web (PWA)
To export a static web build that can be hosted anywhere (Vercel, Netlify, GitHub Pages):
```bash
npx expo export -p web
```

## License
GPL-3.0
