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
