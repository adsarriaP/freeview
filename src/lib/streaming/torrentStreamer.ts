/**
 * torrentStreamer.ts
 * Convierte un Stream (url directa o torrent infoHash) en una URL reproducible.
 * - HTTP: devuelve stream.url tal cual.
 * - Torrent en web: usa WebTorrent para montar el torrent y devuelve un blob URL.
 * - Torrent en nativo: devuelve null (requiere debrid u otro servidor).
 */

import { Platform } from 'react-native';
import { Stream } from '../addons/types';

// --- Tipos publicos ---

export type StreamKind = 'http' | 'torrent';

export interface ResolvedStream {
  url: string;
  kind: StreamKind;
}

export interface StreamResolutionError {
  kind: StreamKind;
  /** Mensaje descriptivo para mostrar al usuario */
  message: string;
  /** true si el problema es de plataforma (nativo sin debrid), no de red */
  isPlatformLimit: boolean;
}

// --- Helpers ---

/** Detecta si el Stream trae URL directa o infoHash (torrent). */
export function getStreamKind(stream: Stream): StreamKind {
  if (stream.url) return 'http';
  if (stream.infoHash) return 'torrent';
  return 'http';
}

/** Formatea el tamano en bytes a un string legible (GB / MB). */
export function formatSize(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// --- WebTorrent (solo web) ---

/** Mapa de infoHash > cleanup para liberar recursos al salir del reproductor. */
const activeTorrents = new Map<string, () => void>();

/**
 * Intenta resolver un stream de torrent via WebTorrent (solo disponible en web).
 * Devuelve una URL object/blob reproducible o lanza un error.
 */
async function resolveViaTorrent(stream: Stream): Promise<string> {
  if (!stream.infoHash) {
    throw new Error('Stream no tiene infoHash');
  }

  // Importar WebTorrent dinamicamente para evitar que falle en nativo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let WebTorrent: any;
  try {
    const mod = await import('webtorrent');
    WebTorrent = mod.default ?? mod;
  } catch {
    throw new Error(
      'WebTorrent no esta instalado. Ejecuta: npx expo install webtorrent'
    );
  }

  const magnetUri = buildMagnetUri(stream);

  return new Promise<string>((resolve, reject) => {
    const client = new WebTorrent();
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        client.destroy();
        reject(new Error('Tiempo de espera agotado: sin peers disponibles'));
      }
    }, 30_000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.add(magnetUri, (torrent: any) => {
      const fileIdx = stream.fileIdx ?? 0;
      const file = torrent.files[fileIdx];

      if (!file) {
        clearTimeout(timeout);
        settled = true;
        client.destroy();
        reject(new Error(`Archivo ${fileIdx} no encontrado en el torrent`));
        return;
      }

      file.getBlobURL((err: Error | null, url?: string) => {
        clearTimeout(timeout);
        if (settled) return;
        settled = true;

        if (err || !url) {
          client.destroy();
          reject(err ?? new Error('No se pudo crear blob URL'));
          return;
        }

        // Guardar funcion de limpieza asociada al infoHash
        activeTorrents.set(stream.infoHash!, () => {
          try { client.destroy(); } catch { /* ignorar */ }
        });

        resolve(url);
      });
    });

    client.on('error', (err: Error) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}

/** Construye un magnet URI desde un infoHash con trackers publicos. */
function buildMagnetUri(stream: Stream): string {
  const hash = stream.infoHash!;
  const trackers = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://open.demonii.com:1337/announce',
  ];
  const trs = trackers.map((t) => `&tr=${encodeURIComponent(t)}`).join('');
  return `magnet:?xt=urn:btih:${hash}${trs}`;
}

// --- API publica ---

/**
 * Resuelve un Stream a una URL reproducible.
 * - HTTP: resuelve inmediatamente.
 * - Torrent en web: usa WebTorrent (puede tardar 5-30s conectando peers).
 * - Torrent en nativo: rechaza con isPlatformLimit = true.
 *
 * @throws StreamResolutionError
 */
export async function resolveStreamUrl(stream: Stream): Promise<ResolvedStream> {
  // HTTP directo
  if (stream.url) {
    return { url: stream.url, kind: 'http' };
  }

  // Torrent
  if (stream.infoHash) {
    if (Platform.OS !== 'web') {
      const err: StreamResolutionError = {
        kind: 'torrent',
        message:
          'Los streams P2P/Torrent requieren un servicio de debrid (Real-Debrid, ' +
          'AllDebrid) en dispositivos nativos. Anade tu servicio en Settings.',
        isPlatformLimit: true,
      };
      throw err;
    }

    // Estamos en web: intentar WebTorrent
    try {
      const url = await resolveViaTorrent(stream);
      return { url, kind: 'torrent' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const err: StreamResolutionError = {
        kind: 'torrent',
        message: `Error al conectar al torrent: ${msg}`,
        isPlatformLimit: false,
      };
      throw err;
    }
  }

  const err: StreamResolutionError = {
    kind: 'http',
    message: 'El stream no tiene URL ni infoHash validos.',
    isPlatformLimit: false,
  };
  throw err;
}

/**
 * Libera los recursos de un torrent activo al salir del reproductor.
 * Llamar en el cleanup del useEffect del reproductor.
 */
export function releaseTorrent(infoHash: string): void {
  const cleanup = activeTorrents.get(infoHash);
  if (cleanup) {
    cleanup();
    activeTorrents.delete(infoHash);
  }
}
