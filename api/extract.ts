/**
 * /api/extract.ts
 * Vercel Serverless Function (Node runtime)
 *
 * Extrae la URL real del stream HLS (.m3u8) y el referer desde páginas de embed
 * de StreamWish y clones compatibles, desempaquetando código JavaScript ofuscado
 * con P.A.C.K.E.R. (Dean Edwards).
 */

import type { IncomingMessage, ServerResponse } from 'http';

interface ExtendedRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

interface ExtendedResponse extends ServerResponse {
  status?: (statusCode: number) => ExtendedResponse;
  json?: (data: unknown) => void;
}

function decodeBase(str: string, radix: number): number {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let res = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = chars.indexOf(str[i]);
    if (idx === -1 || idx >= radix) return -1;
    res = res * radix + idx;
  }
  return res;
}

/**
 * Desempaqueta scripts ofuscados con Dean Edwards P.A.C.K.E.R.
 * Busca patrones del tipo eval(function(p,a,c,k,e,d){...}(payload, a, c, words.split('|'), ...))
 */
export function unpackPackerString(htmlOrJs: string): string[] {
  const unpackedResults: string[] = [];
  const packerRegex =
    /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[rd]\s*\)[\s\S]+?return\s+p;?\s*\}\s*\(\s*(['"][\s\S]+?['"])\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"][\s\S]*?['"])\.split\(['"]\|['"]\)/g;

  let match: RegExpExecArray | null;
  while ((match = packerRegex.exec(htmlOrJs)) !== null) {
    try {
      const rawPayload = match[1];
      let payload: string;
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        payload = rawPayload
          .slice(1, -1)
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }

      const radix = parseInt(match[2], 10);
      const rawWords = match[4];
      let wordsString: string;
      try {
        wordsString = JSON.parse(rawWords);
      } catch {
        wordsString = rawWords.slice(1, -1);
      }
      const words = wordsString.split('|');

      const unpacked = payload.replace(/\b\w+\b/g, (token) => {
        let idx = -1;
        if (radix <= 36) {
          const parsed = parseInt(token, radix);
          if (!Number.isNaN(parsed)) idx = parsed;
        } else {
          idx = decodeBase(token, radix);
        }
        if (idx >= 0 && idx < words.length && words[idx]) {
          return words[idx];
        }
        return token;
      });

      unpackedResults.push(unpacked);
    } catch {
      // Ignorar bloque corrupto y continuar con el resto
    }
  }
  return unpackedResults;
}

/**
 * Busca URLs de listas de reproducción HLS (.m3u8) dentro de un texto.
 */
function findM3u8InText(text: string): string | null {
  const patterns: RegExp[] = [
    /sources\s*[:=]\s*\[\s*\{[^}]*file\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/i,
    /file\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/i,
    /["'](https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)["']/i,
    /["'](https?:\\\/\\\/[^"'\s]+\.m3u8[^"'\s]*)["']/i,
    /["'](\/[^"'\s]+\.m3u8[^"'\s]*)["']/i,
    /["']hls["']\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/i,
    /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1].replace(/\\\//g, '/');
    }
  }
  return null;
}

function sendJson(res: ExtendedResponse, statusCode: number, data: unknown) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    const statusFn = res.status;
    const jsonFn = res.json;
    statusFn.call(res, statusCode);
    jsonFn.call(res, data);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Obtener parámetro ?url=<embedUrl>
  let targetUrl: string | undefined;
  if (req.query?.url) {
    targetUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      targetUrl = parsedUrl.searchParams.get('url') ?? undefined;
    } catch {
      targetUrl = undefined;
    }
  }

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return sendJson(res, 400, {
      error: 'Parámetro "url" requerido y debe ser una URL HTTP/HTTPS válida.',
    });
  }

  try {
    const embedUrlObj = new URL(targetUrl);
    const referer = embedUrlObj.origin + '/';

    // Fetch server-side de la página de embed con headers simulando navegador
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': embedUrlObj.origin,
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Sec-Fetch-Dest': 'iframe',
        'Sec-Fetch-Mode': 'navigate',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      return sendJson(res, 502, {
        error: `El servidor de embed respondió con código HTTP ${response.status} (${response.statusText}).`,
      });
    }

    const html = await response.text();

    // 1. Intentar extraer de scripts desempaquetados con P.A.C.K.E.R.
    const unpackedScripts = unpackPackerString(html);
    let foundM3u8: string | null = null;

    for (const script of unpackedScripts) {
      foundM3u8 = findM3u8InText(script);
      if (foundM3u8) break;
    }

    // 2. Si no se encontró en scripts empaquetados, buscar directamente en el HTML
    if (!foundM3u8) {
      foundM3u8 = findM3u8InText(html);
    }

    if (!foundM3u8) {
      return sendJson(res, 502, {
        error: 'No se encontró la URL del flujo HLS (.m3u8) en el reproductor embed.',
      });
    }

    // Resolver URL absoluta si fuera relativa
    const resolvedM3u8 = new URL(foundM3u8, embedUrlObj.origin).href;

    return sendJson(res, 200, {
      m3u8: resolvedM3u8,
      referer: embedUrlObj.origin,
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');
    const msg = isTimeout
      ? 'Tiempo de espera agotado al conectar con el servidor de embed (timeout).'
      : error instanceof Error
      ? error.message
      : 'Error desconocido';

    return sendJson(res, 502, {
      error: `Error al extraer stream: ${msg}`,
    });
  }
}
