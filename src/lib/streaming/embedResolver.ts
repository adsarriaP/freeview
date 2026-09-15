/**
 * embedResolver.ts
 * Resuelve streams de tipo embed (como StreamWish) usando las funciones serverless
 * /api/extract y /api/proxy para obtener un stream HLS (.m3u8) directo y reproducible.
 */

import { Stream } from '../addons/types';
import type { ResolvedStream, StreamResolutionError } from './torrentStreamer';

/**
 * Resuelve un stream embed llamando a la API de extracción del backend.
 * Devuelve la URL ya enrutada a través de /api/proxy.
 *
 * @throws StreamResolutionError con kind: 'embed'
 */
export async function resolveEmbedStream(stream: Stream): Promise<ResolvedStream> {
  if (!stream.url) {
    const err: StreamResolutionError = {
      kind: 'embed',
      message: 'La fuente embed no cuenta con una URL válida.',
      isPlatformLimit: false,
    };
    throw err;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const extractUrl = `/api/extract?url=${encodeURIComponent(stream.url)}`;
    const response = await fetch(extractUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `Error ${response.status} al extraer el stream.`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error) {
          errorMsg = errorJson.error;
        }
      } catch {
        // Mantener mensaje por defecto
      }

      const err: StreamResolutionError = {
        kind: 'embed',
        message: errorMsg,
        isPlatformLimit: false,
      };
      throw err;
    }

    const data = await response.json();
    if (!data?.m3u8) {
      const err: StreamResolutionError = {
        kind: 'embed',
        message: 'No se encontró la URL del video en la respuesta del servidor.',
        isPlatformLimit: false,
      };
      throw err;
    }

    // Construir la URL enrutada a través de /api/proxy
    const refererParam = encodeURIComponent(data.referer || '');
    const m3u8Param = encodeURIComponent(data.m3u8);
    const proxiedUrl = `/api/proxy?url=${m3u8Param}&referer=${refererParam}`;

    return {
      url: proxiedUrl,
      kind: 'embed',
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Si ya es un StreamResolutionError, propagarlo
    if (typeof error === 'object' && error !== null && 'kind' in error && 'message' in error) {
      throw error as StreamResolutionError;
    }

    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError');

    const err: StreamResolutionError = {
      kind: 'embed',
      message: isTimeout
        ? 'Tiempo de espera agotado al conectar con el servidor embed (10 segundos).'
        : `Error al conectar con la fuente embed: ${error instanceof Error ? error.message : String(error)}`,
      isPlatformLimit: false,
    };
    throw err;
  }
}
