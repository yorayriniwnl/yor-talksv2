import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function boolean(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

function parseURL(value, name, baseURL, { pathAllowed = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('//')) {
    throw new Error(`${name} must not be a protocol-relative URL`);
  }
  if (raw.startsWith('/') && !pathAllowed) return null;

  let parsed;
  try {
    parsed = new URL(raw, baseURL);
  } catch {
    throw new Error(`${name} must be an HTTPS URL or a same-origin path`);
  }
  if (pathAllowed && raw.startsWith('/')) {
    const baseOrigin = new URL(baseURL).origin;
    if (parsed.origin !== baseOrigin || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error(`${name} must be a same-origin path without credentials, query, or fragment`);
    }
    return new URL(baseOrigin);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash
    || (!pathAllowed && parsed.pathname !== '/')) {
    throw new Error(`${name} must be an origin without credentials, query, fragment, or path`);
  }
  return parsed;
}

function originSource(url) {
  return `${url.protocol}//${url.host}`;
}

export function renderNginxSecurityHeaders(template, environment) {
  const isPublicBeta = boolean(environment.VITE_PUBLIC_BETA);
  const publicURL = parseURL(environment.VITE_PUBLIC_ORIGIN, 'VITE_PUBLIC_ORIGIN', undefined);
  if (isPublicBeta && (!publicURL || publicURL.protocol !== 'https:')) {
    throw new Error('Public beta Nginx configuration requires an HTTPS VITE_PUBLIC_ORIGIN');
  }
  if (publicURL && !['https:', 'http:'].includes(publicURL.protocol)) {
    throw new Error('VITE_PUBLIC_ORIGIN must use HTTP or HTTPS');
  }

  const baseURL = publicURL ?? new URL('https://yor.invalid');
  const connect = new Set([
    "'self'",
    'https://accounts.google.com',
    // Direct signed uploads use this exact provider origin. Delivery still
    // returns through the authenticated API; no broad CDN connection is needed.
    'https://api.cloudinary.com',
    'https://api.razorpay.com',
    'https://checkout.razorpay.com',
    'https://*.razorpay.com',
  ]);

  const apiURL = parseURL(environment.VITE_API_BASE_URL, 'VITE_API_BASE_URL', baseURL, { pathAllowed: true });
  if (apiURL) {
    if (isPublicBeta && apiURL.protocol !== 'https:') throw new Error('Public beta VITE_API_BASE_URL must use HTTPS');
    connect.add(originSource(apiURL));
  }

  const realtimeURL = parseURL(environment.VITE_REALTIME_URL, 'VITE_REALTIME_URL', baseURL)
    ?? (publicURL && boolean(environment.VITE_REALTIME_ENABLED) ? publicURL : null);
  if (realtimeURL) {
    if (isPublicBeta && realtimeURL.protocol !== 'https:') throw new Error('Public beta VITE_REALTIME_URL must use HTTPS');
    connect.add(originSource(realtimeURL));
    connect.add(`${realtimeURL.protocol === 'https:' ? 'wss:' : 'ws:'}//${realtimeURL.host}`);
  }

  const liveEnabled = boolean(environment.VITE_LIVE_ROOMS_ENABLED) || boolean(environment.VITE_RTC_CALLS_ENABLED);
  const liveKitRaw = String(environment.CSP_LIVEKIT_URL ?? '').trim();
  if (liveEnabled && !liveKitRaw) throw new Error('Enabled LiveKit features require CSP_LIVEKIT_URL at web build time');
  if (liveKitRaw && liveEnabled) {
    const liveKitURL = parseURL(liveKitRaw, 'CSP_LIVEKIT_URL', undefined);
    if (!liveKitURL || !['wss:', 'https:'].includes(liveKitURL.protocol)) {
      throw new Error('CSP_LIVEKIT_URL must be a secure LiveKit websocket or HTTPS origin');
    }
    connect.add(`https://${liveKitURL.host}`);
    connect.add(`wss://${liveKitURL.host}`);
  }

  let result = template.replaceAll('__CSP_CONNECT_ORIGINS__', [...connect].slice(1).join(' '));
  if (result.includes('__CSP_')) throw new Error('Nginx configuration contains an unresolved CSP placeholder');
  if (/connect-src[^;]*\s(?:https?|wss?):\s/.test(result)) {
    throw new Error('Nginx connect-src must use explicit origins rather than an open URL scheme');
  }
  return result;
}

export function renderBrowserContentSecurityPolicy(template, environment) {
  const headers = renderNginxSecurityHeaders(template, environment);
  const policy = headers.match(/^add_header Content-Security-Policy "([^"]+)" always;$/m)?.[1];
  if (!policy) throw new Error('Security header template must declare a Content-Security-Policy');
  // frame-ancestors is only supported in an HTTP header. Vercel and Nginx
  // enforce it there; omitting it here avoids an ignored-directive warning.
  return policy.split(';').map(directive => directive.trim())
    .filter(directive => !directive.startsWith('frame-ancestors ')).join('; ');
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const root = path.resolve(path.dirname(scriptPath), '../..');
  const template = fs.readFileSync(path.join(root, 'social/security-headers.conf'), 'utf8');
  const rendered = renderNginxSecurityHeaders(template, process.env);
  const output = path.join(root, 'social/dist/security-headers.conf');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, rendered, 'utf8');
  console.log('[nginx config] Rendered security headers with explicit API, realtime and configured LiveKit origins.');
}
