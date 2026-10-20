import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderNginxSecurityHeaders, renderBrowserContentSecurityPolicy } from '../social/scripts/render-nginx-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = fs.readFileSync(path.join(root, 'social/security-headers.conf'), 'utf8');

test('self-hosted font policy allows no remote font or font-stylesheet provider', () => {
  assert.match(template, /style-src 'self' 'unsafe-inline';/);
  assert.match(template, /font-src 'self' data:;/);
  assert.doesNotMatch(template, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});

test('Nginx CSP allows only configured production API, realtime and LiveKit origins', () => {
  const rendered = renderNginxSecurityHeaders(template, {
    VITE_PUBLIC_BETA: 'true',
    VITE_PUBLIC_ORIGIN: 'https://app.yor.test',
    VITE_API_BASE_URL: 'https://api.yor.test/api',
    VITE_REALTIME_URL: 'https://realtime.yor.test',
    VITE_REALTIME_ENABLED: 'true',
    VITE_LIVE_ROOMS_ENABLED: 'true',
    CSP_LIVEKIT_URL: 'wss://rtc.yor.test',
  });

  assert.match(rendered, /connect-src 'self'/);
  for (const source of [
    'https://api.yor.test',
    'https://realtime.yor.test',
    'wss://realtime.yor.test',
    'https://rtc.yor.test',
    'wss://rtc.yor.test',
    'https://accounts.google.com',
    'https://api.cloudinary.com',
    'https://api.razorpay.com',
  ]) assert.ok(rendered.includes(source), `Expected CSP source ${source}`);
  assert.doesNotMatch(rendered, /connect-src[^;]*\s(?:https?|wss?):\s/);
  assert.doesNotMatch(rendered, /__CSP_/);
  assert.match(rendered, /img-src 'self'[^;]*https:\/\/res\.cloudinary\.com/);
  assert.match(rendered, /media-src 'self'[^;]*https:\/\/s3\.amazonaws\.com/);
});

test('public Nginx CSP rejects cleartext and unconfigured live-service origins', () => {
  const base = {
    VITE_PUBLIC_BETA: 'true',
    VITE_PUBLIC_ORIGIN: 'https://app.yor.test',
    VITE_API_BASE_URL: '/api',
    VITE_REALTIME_ENABLED: 'true',
  };
  assert.throws(() => renderNginxSecurityHeaders(template, { ...base, VITE_REALTIME_URL: 'http://api.yor.test' }), /must use HTTPS/);
  assert.throws(() => renderNginxSecurityHeaders(template, { ...base, VITE_LIVE_ROOMS_ENABLED: 'true' }), /require CSP_LIVEKIT_URL/);
  assert.throws(() => renderNginxSecurityHeaders(template, { ...base, VITE_PUBLIC_ORIGIN: 'http://app.yor.test' }), /requires an HTTPS/);
});

test('same-origin API paths resolve to the public origin and protocol-relative URLs fail closed', () => {
  const base = {
    VITE_PUBLIC_BETA: 'true',
    VITE_PUBLIC_ORIGIN: 'https://app.yor.test',
    VITE_API_BASE_URL: '/api',
    VITE_REALTIME_ENABLED: 'false',
  };
  const rendered = renderNginxSecurityHeaders(template, base);
  assert.match(rendered, /connect-src 'self'[^;]*https:\/\/app\.yor\.test/);
  assert.throws(() => renderNginxSecurityHeaders(template, { ...base, VITE_API_BASE_URL: '//api.evil.test' }), /protocol-relative/);
  assert.throws(() => renderNginxSecurityHeaders(template, { ...base, VITE_REALTIME_URL: '//socket.evil.test' }), /protocol-relative/);
});

test('built HTML CSP shares exact configured origins while Vercel supplies header-only framing controls', () => {
  const policy = renderBrowserContentSecurityPolicy(template, {
    VITE_PUBLIC_BETA: 'true',
    VITE_PUBLIC_ORIGIN: 'https://app.yor.test',
    VITE_API_BASE_URL: 'https://api.yor.test/api',
    VITE_REALTIME_URL: 'https://realtime.yor.test',
    VITE_REALTIME_ENABLED: 'true',
  });
  assert.match(policy, /connect-src 'self'[^;]*https:\/\/api\.yor\.test/);
  assert.ok(policy.includes('wss://realtime.yor.test'));
  assert.doesNotMatch(policy, /frame-ancestors/);
  assert.doesNotMatch(policy, /connect-src[^;]*\s(?:https?|wss?):\s/);
  for (const file of ['vercel.json', 'social/vercel.json']) {
    const config = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    const headers = config.headers.find(rule => rule.source === '/(.*)').headers;
    const header = headers.find(item => item.key === 'Content-Security-Policy').value;
    assert.match(header, /frame-ancestors 'self'/);
    if (file === 'vercel.json') {
      // Production root Vercel configuration provides the complete static CSP.
      assert.match(header, /default-src 'self'/);
      assert.match(header, /object-src 'none'/);
    } else {
      // The standalone social preview has a framing-only edge policy.
      assert.doesNotMatch(header, /default-src|connect-src|script-src/);
    }
    assert.match(config.headers.find(rule => rule.source === '/sw.js').headers
      .find(item => item.key === 'Cache-Control').value, /no-store/);
  }
});
