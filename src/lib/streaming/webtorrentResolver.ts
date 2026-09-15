import { Stream } from '../addons/types';

/**
 * En plataformas nativas (Android/iOS), WebTorrent no está soportado de forma directa en JS
 * debido a dependencias de Node.js y WebRTC nativo. Se utiliza Debrid en su lugar.
 */
export async function resolveViaTorrent(_stream: Stream): Promise<string> {
  throw new Error('WebTorrent no está disponible en plataformas nativas.');
}

export function releaseActiveTorrent(_infoHash: string): void {
  // No-op en plataformas nativas
}
