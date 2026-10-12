import { isIP } from 'node:net';

/** An explicit network policy supports multiple ingress hops without trusting
 * an arbitrary hop count. Empty keeps the established single-proxy default. */
export function trustedProxySetting(value: string): 1 | string[] {
  if (!value.trim()) return 1;
  const entries = value.split(',').map(entry => entry.trim());
  if (entries.length > 32 || entries.some(entry => !entry)) throw new Error('Invalid trusted proxy network list');
  for (const entry of entries) {
    const parts = entry.split('/');
    const family = isIP(parts[0]!);
    if (!family || parts.length > 2) throw new Error('Trusted proxies must be explicit IP addresses or CIDRs');
    if (parts.length === 2) {
      const mask = parts[1]!;
      if (!/^\d{1,3}$/.test(mask) || Number(mask) < 1 || Number(mask) > (family === 4 ? 32 : 128)) {
        throw new Error('Trusted proxy CIDR masks must exclude universal networks');
      }
    }
  }
  return [...new Set(entries)];
}
