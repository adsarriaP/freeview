import { Stream } from '../addons/types';

/** Mapa de infoHash > cleanup para liberar recursos al salir del reproductor en web. */
const activeTorrents = new Map<string, () => void>();

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

/**
 * Intenta resolver un stream de torrent via WebTorrent (solo disponible en web).
 * Devuelve una URL object/blob reproducible o lanza un error.
 */
export async function resolveViaTorrent(stream: Stream): Promise<string> {
  if (!stream.infoHash) {
    throw new Error('Stream no tiene infoHash');
  }

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

export function releaseActiveTorrent(infoHash: string): void {
  const cleanup = activeTorrents.get(infoHash);
  if (cleanup) {
    cleanup();
    activeTorrents.delete(infoHash);
  }
}
