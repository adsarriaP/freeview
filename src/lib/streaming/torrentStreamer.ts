/**
 * torrentStreamer.ts
 * Convierte un Stream (url directa o torrent infoHash) en una URL reproducible.
 * - HTTP: devuelve stream.url tal cual.
 * - Torrent en web: usa WebTorrent para montar el torrent y devuelve un blob URL.
 * - Torrent en nativo: devuelve null (requiere debrid u otro servidor).
 */

import { Platform } from 'react-native';
import { Stream } from '../addons/types';
import { releaseActiveTorrent, resolveViaTorrent } from './webtorrentResolver';

// --- Tipos publicos ---

export type StreamKind = 'http' | 'torrent' | 'embed';

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

/** Detecta si una URL corresponde a un servicio de video embed (Streamwish, Filemoon, etc.) */
export function isEmbedStreamUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('streamwish.') ||
    lower.includes('filemoon.') ||
    lower.includes('vidhide.') ||
    lower.includes('streamtape.') ||
    lower.includes('doodstream.') ||
    lower.includes('dood.') ||
    lower.includes('voe.sx') ||
    lower.includes('uqload.') ||
    lower.includes('mixdrop.') ||
    lower.includes('luluvdo.') ||
    lower.includes('lulustream.') ||
    lower.includes('wolfstream.') ||
    lower.includes('waaw.') ||
    lower.includes('netu.') ||
    lower.includes('/e/') ||
    lower.includes('/embed')
  );
}

/** Detecta si el Stream trae URL directa, embed o infoHash (torrent). */
export function getStreamKind(stream: Stream): StreamKind {
  if (stream.url && isEmbedStreamUrl(stream.url)) return 'embed';
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

// --- API publica ---

/**
 * Resuelve un Stream a una URL reproducible.
 * - HTTP directo o Embed: resuelve inmediatamente.
 * - Torrent en web: usa WebTorrent (puede tardar 5-30s conectando peers).
 * - Torrent en nativo: rechaza con isPlatformLimit = true.
 *
 * @throws StreamResolutionError
 */
export async function resolveStreamUrl(stream: Stream): Promise<ResolvedStream> {
  // HTTP directo o Embed
  if (stream.url) {
    const kind = isEmbedStreamUrl(stream.url) ? 'embed' : 'http';
    return { url: stream.url, kind };
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
  releaseActiveTorrent(infoHash);
}
