process.env.CORS_ORIGINS = 'https://app.yor-talks.example';
process.env.CLIENT_ORIGIN = 'https://app.yor-talks.example';

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import { io as connectClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const { configureProxyTrust, parseTrustedProxyCidrs } = await import('../config/trusted-proxies.js');
const { credentialedCors } = await import('../middlewares/browser-origin.js');
const { requireTrustedOrigin } = await import('../middlewares/trusted-origin.js');

const JWT_SECRET = 'a'.repeat(64);
const APPROVED_ORIGIN = 'https://app.yor-talks.example';

test('Public routing verification suite', async (t) => {
  // 1. Set up Express API Server with configured proxy trust
  const apiApp = express();
  configureProxyTrust(apiApp, parseTrustedProxyCidrs('127.0.0.1/32,::1/128,127.0.0.2/32'));
  apiApp.use(credentialedCors);
  apiApp.use(express.json());
  apiApp.use(cookieParser());

  const rateCounts = new Map<string, number>();
  const testLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'unknown';
    const current = (rateCounts.get(ip) || 0) + 1;
    rateCounts.set(ip, current);
    if (current > 2) {
      return res.status(429).json({ success: false, message: 'Too many requests' });
    }
    next();
  };

  apiApp.get('/api/identity', testLimiter, (req, res) => {
    res.json({
      ip: req.ip,
      secure: req.secure,
      protocol: req.protocol,
      host: req.get('host'),
      forwardedHost: req.get('x-forwarded-host'),
    });
  });

  apiApp.post('/api/auth/refresh', requireTrustedOrigin, (_req, res) => {
    res.cookie('refreshToken', 'new-refresh-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, data: { accessToken: 'new-access-token' } });
  });

  apiApp.get('/api/readyz', (_req, res) => {
    res.json({ status: 'healthy', services: { database: 'up', redis: 'up' } });
  });

  apiApp.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found', data: null, errors: ['Not found'] });
  });

  const apiHttpServer = createServer(apiApp);

  const io = new SocketIOServer(apiHttpServer, {
    cors: { origin: [APPROVED_ORIGIN], methods: ['GET', 'POST'] },
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      callback(null, !origin || origin === APPROVED_ORIGIN);
    },
  });

  const activeSessions = new Map<string, { active: boolean }>();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
      const session = activeSessions.get(decoded.sub);
      if (!session || !session.active) {
        return next(new Error('Session revoked'));
      }
      socket.data.userId = decoded.sub;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('ping:custom', (data: unknown, ack: (resp: unknown) => void) => {
      const session = activeSessions.get(socket.data.userId);
      if (!session || !session.active) {
        socket.disconnect(true);
        return;
      }
      ack({ pong: true, data });
    });
  });

  await new Promise<void>((resolve) => apiHttpServer.listen(0, '127.0.0.1', () => resolve()));
  const apiAddress = apiHttpServer.address();
  assert.ok(apiAddress && typeof apiAddress !== 'string');
  const apiPort = apiAddress.port;

  // 2. Set up Mock Web / Nginx edge server
  const webApp = express();
  webApp.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' https: wss:; media-src 'self' data: blob: https:;");
    next();
  });

  webApp.get('/index.html', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send('<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>');
  });

  webApp.get('/sw.js', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.type('application/javascript').send('// sw');
  });

  webApp.get('/assets/:file', (req, res) => {
    if (req.params.file === 'index-BHke-62f.css') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.type('text/css').send('body { margin: 0; }');
    }
    res.status(404).send('Not found');
  });

  webApp.use('/api', (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
    const fullPath = '/api' + req.url;
    fetch(`http://127.0.0.1:${apiPort}${fullPath}`, {
      method: req.method,
      headers: {
        'host': req.headers.host || '',
        'x-forwarded-for': clientIp,
        'x-forwarded-proto': proto,
        'x-forwarded-host': req.headers.host || '',
        'origin': (req.headers.origin as string) || '',
        'cookie': (req.headers.cookie as string) || '',
        'content-type': (req.headers['content-type'] as string) || '',
      },
    }).then(async (upRes) => {
      res.status(upRes.status);
      upRes.headers.forEach((v, k) => {
        if (k.toLowerCase() !== 'content-encoding') res.setHeader(k, v);
      });
      const body = await upRes.text();
      res.send(body);
    });
  });

  webApp.use((_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send('<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>');
  });

  const webHttpServer = createServer(webApp);
  await new Promise<void>((resolve) => webHttpServer.listen(0, '127.0.0.1', () => resolve()));
  const webAddress = webHttpServer.address();
  assert.ok(webAddress && typeof webAddress !== 'string');
  const webPort = webAddress.port;

  // 3. Set up Mock Caddy host reverse proxy with HTTP -> HTTPS redirect
  const caddyHttpServer = createServer((req, res) => {
    const hostHeader = (req.headers['x-mock-host'] as string) || req.headers.host || 'app.yor-talks.example';
    const host = hostHeader.split(':')[0];

    if (req.headers['x-mock-port'] === '80') {
      res.writeHead(308, { Location: `https://${host}${req.url}` });
      return res.end();
    }

    const remoteClient = (req.headers['x-mock-client-ip'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const targetPort = host === 'api.yor-talks.example' ? apiPort : webPort;

    const forwardHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') forwardHeaders[k] = v;
    }
    forwardHeaders['host'] = req.headers.host || '';
    forwardHeaders['x-forwarded-for'] = remoteClient;
    forwardHeaders['x-forwarded-proto'] = 'https';
    forwardHeaders['x-forwarded-host'] = host;
    delete forwardHeaders['forwarded'];
    delete forwardHeaders['x-mock-port'];
    delete forwardHeaders['x-mock-client-ip'];

    fetch(`http://127.0.0.1:${targetPort}${req.url}`, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
      duplex: 'half',
    } as RequestInit).then(async (upRes) => {
      res.writeHead(upRes.status, Object.fromEntries(upRes.headers.entries()));
      const buf = Buffer.from(await upRes.arrayBuffer());
      res.end(buf);
    }).catch(() => {
      res.writeHead(502);
      res.end('Bad Gateway');
    });
  });

  await new Promise<void>((resolve) => caddyHttpServer.listen(0, '127.0.0.1', () => resolve()));
  const caddyAddress = caddyHttpServer.address();
  assert.ok(caddyAddress && typeof caddyAddress !== 'string');
  const caddyPort = caddyAddress.port;

  t.after(() => {
    io.close();
    apiHttpServer.close();
    webHttpServer.close();
    caddyHttpServer.close();
  });

  await t.test('1. HTTP redirects to HTTPS as intended', async () => {
    const res = await fetch(`http://127.0.0.1:${caddyPort}/`, {
      headers: { host: 'app.yor-talks.example', 'x-mock-host': 'app.yor-talks.example', 'x-mock-port': '80' },
      redirect: 'manual',
    });
    assert.equal(res.status, 308);
    assert.equal(res.headers.get('location'), 'https://app.yor-talks.example/');
  });

  await t.test('2. Independent clients retain independent IP-based limits', async () => {
    const resA1 = await fetch(`http://127.0.0.1:${caddyPort}/api/identity`, {
      headers: { host: 'api.yor-talks.example', 'x-mock-host': 'api.yor-talks.example', 'x-mock-client-ip': '203.0.113.10' },
    });
    assert.equal(resA1.status, 200);
    const bodyA1 = (await resA1.json()) as { ip: string };
    assert.equal(bodyA1.ip, '203.0.113.10');

    const resA2 = await fetch(`http://127.0.0.1:${caddyPort}/api/identity`, {
      headers: { host: 'api.yor-talks.example', 'x-mock-host': 'api.yor-talks.example', 'x-mock-client-ip': '203.0.113.10' },
    });
    assert.equal(resA2.status, 200);

    const resA3 = await fetch(`http://127.0.0.1:${caddyPort}/api/identity`, {
      headers: { host: 'api.yor-talks.example', 'x-mock-host': 'api.yor-talks.example', 'x-mock-client-ip': '203.0.113.10' },
    });
    assert.equal(resA3.status, 429);

    const resB1 = await fetch(`http://127.0.0.1:${caddyPort}/api/identity`, {
      headers: { host: 'api.yor-talks.example', 'x-mock-host': 'api.yor-talks.example', 'x-mock-client-ip': '203.0.113.20' },
    });
    assert.equal(resB1.status, 200);
    const bodyB1 = (await resB1.json()) as { ip: string };
    assert.equal(bodyB1.ip, '203.0.113.20');
  });

  await t.test('3. Forged forwarded headers cannot select an arbitrary client identity', async () => {
    const res = await fetch(`http://127.0.0.1:${caddyPort}/api/identity`, {
      headers: {
        host: 'api.yor-talks.example',
        'x-mock-host': 'api.yor-talks.example',
        'x-mock-client-ip': '198.51.100.77',
        'x-forwarded-for': '1.2.3.4',
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ip: string };
    assert.equal(body.ip, '198.51.100.77');
    assert.notEqual(body.ip, '1.2.3.4');
  });

  await t.test('4. Shorter path connecting directly to API rejects comma chains', async () => {
    const commaRes = await fetch(`http://127.0.0.1:${apiPort}/api/identity`, {
      headers: {
        'x-forwarded-for': '1.2.3.4, 203.0.113.5',
        'x-forwarded-proto': 'https',
      },
    });
    assert.equal(commaRes.status, 400);
  });

  await t.test('5. Cookies behave correctly with Secure and SameSite=Lax', async () => {
    const res = await fetch(`http://127.0.0.1:${caddyPort}/api/auth/refresh`, {
      method: 'POST',
      headers: { host: 'api.yor-talks.example', 'x-mock-host': 'api.yor-talks.example', origin: APPROVED_ORIGIN },
    });
    assert.equal(res.status, 200);
    const cookie = res.headers.get('set-cookie');
    assert.ok(cookie);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=Lax/i);
  });

  await t.test('6. Unapproved origins are rejected by CORS and trusted-origin check', async () => {
    const res = await fetch(`http://127.0.0.1:${caddyPort}/api/auth/refresh`, {
      method: 'POST',
      headers: { host: 'api.yor-talks.example', 'x-mock-host': 'api.yor-talks.example', origin: 'https://attacker.invalid' },
    });
    assert.equal(res.status, 403);

    const approvedRes = await fetch(`http://127.0.0.1:${caddyPort}/api/auth/refresh`, {
      method: 'POST',
      headers: { host: 'api.yor-talks.example', 'x-mock-host': 'api.yor-talks.example', origin: APPROVED_ORIGIN },
    });
    assert.equal(approvedRes.status, 200);
    assert.equal(approvedRes.headers.get('access-control-allow-origin'), APPROVED_ORIGIN);
    assert.equal(approvedRes.headers.get('access-control-allow-credentials'), 'true');
  });

  await t.test('7. API paths return API JSON responses rather than SPA fallback HTML', async () => {
    const res = await fetch(`http://127.0.0.1:${caddyPort}/api/unknown-endpoint`, {
      headers: { host: 'app.yor-talks.example', 'x-mock-host': 'app.yor-talks.example' },
    });
    assert.equal(res.status, 404);
    const contentType = res.headers.get('content-type') || '';
    assert.match(contentType, /application\/json/i);
    const body = (await res.json()) as { success: boolean; message: string };
    assert.equal(body.success, false);
    assert.equal(body.message, 'Route not found');
  });

  await t.test('8. Missing static assets return 404 rather than SPA fallback HTML', async () => {
    const res = await fetch(`http://127.0.0.1:${caddyPort}/assets/nonexistent-bundle.js`, {
      headers: { host: 'app.yor-talks.example', 'x-mock-host': 'app.yor-talks.example' },
    });
    assert.equal(res.status, 404);
    const text = await res.text();
    assert.doesNotMatch(text, /<div id="root">/);
  });

  await t.test('9. Security headers and cache policies apply to correct resources', async () => {
    const indexRes = await fetch(`http://127.0.0.1:${caddyPort}/index.html`, {
      headers: { host: 'app.yor-talks.example', 'x-mock-host': 'app.yor-talks.example' },
    });
    assert.equal(indexRes.status, 200);
    assert.match(indexRes.headers.get('cache-control') || '', /no-cache/i);
    assert.match(indexRes.headers.get('cache-control') || '', /no-store/i);
    assert.equal(indexRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(indexRes.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.ok(indexRes.headers.get('content-security-policy'));

    const assetRes = await fetch(`http://127.0.0.1:${caddyPort}/assets/index-BHke-62f.css`, {
      headers: { host: 'app.yor-talks.example', 'x-mock-host': 'app.yor-talks.example' },
    });
    assert.equal(assetRes.status, 200);
    assert.match(assetRes.headers.get('cache-control') || '', /immutable/i);
    assert.match(assetRes.headers.get('cache-control') || '', /max-age=31536000/i);
  });

  await t.test('10. Socket connections authenticate, reconnect and honor account revocation', async () => {
    const userId = 'user-test-uuid-1234';
    activeSessions.set(userId, { active: true });

    const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });

    const socket = connectClientSocket(`http://127.0.0.1:${apiPort}`, {
      transports: ['websocket'],
      auth: { token },
      extraHeaders: { Origin: APPROVED_ORIGIN },
      reconnection: false,
      timeout: 5000,
    });

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });
    assert.equal(socket.connected, true);

    const ack = await new Promise((resolve) => {
      socket.emit('ping:custom', 'hello', resolve);
    });
    assert.deepEqual(ack, { pong: true, data: 'hello' });

    activeSessions.set(userId, { active: false });

    await new Promise<void>((resolve) => {
      socket.once('disconnect', () => resolve());
      socket.emit('ping:custom', 'after-revocation');
    });
    assert.equal(socket.connected, false);

    const reconnectAttempt = connectClientSocket(`http://127.0.0.1:${apiPort}`, {
      transports: ['websocket'],
      auth: { token },
      extraHeaders: { Origin: APPROVED_ORIGIN },
      reconnection: false,
      timeout: 5000,
    });

    await assert.rejects(
      new Promise<void>((resolve, reject) => {
        reconnectAttempt.once('connect', () => resolve());
        reconnectAttempt.once('connect_error', reject);
      }),
      /Session revoked/i
    );

    socket.disconnect();
    reconnectAttempt.disconnect();
  });
});
