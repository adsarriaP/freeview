/**
 * streamWishDomains.ts
 * Lista centralizada de dominios y clones de StreamWish.
 * Estos servidores rotan de dominio frecuentemente por bloqueos de DMCA o ISP.
 */

export const STREAMWISH_DOMAINS: readonly string[] = [
  'streamwish.to',
  'streamwish.com',
  'streamwish.site',
  'swdyu.com',
  'swhoi.com',
  'wishonly.site',
  'embedwish.com',
  'swplay.org',
  'swstream.site',
  'wishfast.top',
  'flaswish.com',
  'mwish.pro',
  'strmwsh.com',
  'sfastwish.com',
  'ajcontent.site',
  'eghigh.com',
  'strwish.com',
  'autoembed.cc',
];

/**
 * Verifica si un hostname o dominio pertenece a la red de StreamWish o sus clones.
 */
export function isStreamWishDomain(hostname: string): boolean {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return STREAMWISH_DOMAINS.some(
    (d) => lower === d || lower.endsWith('.' + d)
  );
}

/**
 * Verifica si una URL dada corresponde a un reproductor o embed de StreamWish.
 */
export function isStreamWishUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return isStreamWishDomain(parsed.hostname);
  } catch {
    const lower = url.toLowerCase();
    return STREAMWISH_DOMAINS.some((d) => lower.includes(d));
  }
}
