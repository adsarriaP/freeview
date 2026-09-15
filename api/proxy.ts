/**
 * /api/proxy.ts
 * Vercel Serverless Function (Node runtime)
 *
 * Proxy para retransmitir peticiones HLS (.m3u8 y segmentos .ts) con los headers
 * requeridos (Referer, Origin, User-Agent). Si la respuesta es una playlist .m3u8,
 * reescribe recursivamente las URLs de los segmentos y sub-playlists para que
 * continúen pasando por el proxy.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';

interface ExtendedRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

interface ExtendedResponse extends ServerResponse {
  status?: (statusCode: number) => ExtendedResponse;
  json?: (data: unknown) => void;
}

/**
 * Reescribe las líneas de una playlist HLS (.m3u8) para que los segmentos,
 * sub-playlists y llaves criptográficas pasen a través del proxy.
 */
export function rewriteM3u8Playlist(
  playlistText: string,
  baseUrl: string,
  referer: string
): string {
  const lines = playlistText.split(/\r?\n/);
  const rewrittenLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // 1. Tags que contienen URI="..." (como #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA)
    if (trimmed.startsWith('#')) {
      if (trimmed.includes('URI=')) {
        return line.replace(/URI\s*=\s*["']([^"']+)["']/g, (_, rawUri) => {
          try {
            const absoluteUri = new URL(rawUri, baseUrl).href;
            const proxied = `/api/proxy?url=${encodeURIComponent(absoluteUri)}&referer=${encodeURIComponent(referer)}`;
            return `URI="${proxied}"`;
          } catch {
            return `URI="${rawUri}"`;
          }
        });
      }
      return line;
    }

    // 2. Líneas que no empiezan con '#' son URLs de segmentos (.ts) o sub-playlists (.m3u8)
    try {
      const absoluteUrl = new URL(trimmed, baseUrl).href;
      return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`;
    } catch {
      return line;
    }
  });

  return rewrittenLines.join('\n');
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  // Encabezados de CORS para permitir consumo desde cualquier origen en el navegador
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Parsear query parameters
  let targetUrl: string | undefined;
  let refererParam: string | undefined;

  if (req.query) {
    targetUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    refererParam = Array.isArray(req.query.referer) ? req.query.referer[0] : req.query.referer;
  }

  if (!targetUrl && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      targetUrl = parsedUrl.searchParams.get('url') ?? undefined;
      refererParam = parsedUrl.searchParams.get('referer') ?? undefined;
    } catch {
      targetUrl = undefined;
    }
  }

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Parámetro "url" requerido y debe ser una URL HTTP/HTTPS válida.' }));
    return;
  }

  try {
    const upstreamUrl = new URL(targetUrl);
    const referer = refererParam || upstreamUrl.origin;
    const origin = referer.startsWith('http') ? new URL(referer).origin : upstreamUrl.origin;

    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer.endsWith('/') ? referer : referer + '/',
      'Origin': origin,
      'Accept': '*/*',
    };

    // Reenviar Range si el reproductor de video lo solicita (necesario para seeking en segmentos)
    const clientRange = req.headers['range'];
    if (clientRange) {
      fetchHeaders['Range'] = Array.isArray(clientRange) ? clientRange[0] : clientRange;
    }

    const upstreamResponse = await fetch(targetUrl, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(15000),
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      res.statusCode = upstreamResponse.status >= 500 ? 502 : upstreamResponse.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: `El origen respondió con estado HTTP ${upstreamResponse.status}.` }));
      return;
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    const isM3u8 =
      targetUrl.toLowerCase().includes('.m3u8') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('vnd.apple.mpegurl');

    // Reenviar código de estado (200 o 206 Partial Content)
    res.statusCode = upstreamResponse.status;

    if (isM3u8) {
      const playlistBody = await upstreamResponse.text();

      // Verificar si realmente es una playlist m3u8 o HTML de error
      if (playlistBody.trim().startsWith('#EXTM3U')) {
        const rewritten = rewriteM3u8Playlist(playlistBody, targetUrl, referer);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.end(rewritten);
        return;
      }
      // Si no empieza con #EXTM3U, puede ser un archivo directo o error
      res.setHeader('Content-Type', contentType || 'text/plain');
      res.end(playlistBody);
      return;
    }

    // Es un segmento de video (.ts, .m4s) o archivo binario (ej. clave de cifrado)
    const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    for (const headerName of forwardHeaders) {
      const val = upstreamResponse.headers.get(headerName);
      if (val) {
        res.setHeader(headerName, val);
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (!upstreamResponse.body) {
      res.end();
      return;
    }

    // Transmitir chunks directamente al cliente
    if (typeof Readable.fromWeb === 'function') {
      Readable.fromWeb(upstreamResponse.body as any).pipe(res);
    } else {
      const arrayBuf = await upstreamResponse.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
    }
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');
    const msg = isTimeout
      ? 'Tiempo de espera agotado al solicitar el segmento (timeout).'
      : error instanceof Error
      ? error.message
      : 'Error de red en el proxy';

    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: msg }));
    }
  }
}
