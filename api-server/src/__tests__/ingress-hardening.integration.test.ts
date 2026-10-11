import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { createServer, request, type IncomingHttpHeaders, type Server } from 'node:http';
import { connect as connectTcp, isIP, type Socket as TcpSocket } from 'node:net';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import { io as connectSocket, type Socket } from 'socket.io-client';
import { pool } from '@workspace/db';
import { configureProxyTrust, parseTrustedProxyCidrs } from '../config/trusted-proxies.js';
import { env, corsOrigins } from '../config/env.js';
import { credentialedCors } from '../middlewares/browser-origin.js';
import { requireTrustedOrigin } from '../middlewares/trusted-origin.js';
import { createLimiter, closeRateLimitRedis } from '../middlewares/rate-limit.js';
import { AuthController } from '../controllers/auth-controller.js';
import { AuthService } from '../services/auth-service.js';
import type { EmailService } from '../services/email-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { createTestUser } from './test-helpers.js';
import { attachSocketServer } from '../socket/index.js';

const users = new UserRepository();
const redis = new RedisRepository();
after(async () => { await closeRateLimitRedis(); await redis.disconnect(); await pool.end(); });

type Reply = { status: number; headers: IncomingHttpHeaders; body: string };
async function listen(server: Server) {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  return address.port;
}

function send(port: number, path = '/identity', headers: Record<string, string> = {},
  options: { client?: string; method?: string; body?: string } = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, localAddress: options.client ?? '127.0.0.4',
      path, method: options.method ?? 'GET', headers }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode!, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.end(options.body);
  });
}

// Real HTTP/TCP proxy hops with distinct loopback peer addresses. This exercises
// Express/Redis/Socket.IO at their actual boundaries; native Caddy/Nginx and the
// selected public topology remain deployment acceptance gates.
async function proxy(t: TestContext, targetPort: number, outboundAddress: string, trustedEdge?: string) {
  const sockets = new Set<TcpSocket>();
  const canonical = (headers: IncomingHttpHeaders, remote: string): Record<string, string | string[] | undefined> => {
    const trusted = trustedEdge !== undefined && remote === trustedEdge;
    const suppliedIp = typeof headers['x-forwarded-for'] === 'string' ? headers['x-forwarded-for'] : '';
    const client = trusted && isIP(suppliedIp) ? suppliedIp : remote;
    const proto = trustedEdge === undefined ? 'https'
      : trusted && headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const result = { ...headers, host: `127.0.0.1:${targetPort}`, 'x-forwarded-for': client,
      'x-forwarded-proto': proto, 'x-forwarded-host': 'synthetic-ingress.invalid' };
    delete result.forwarded;
    return result;
  };
  const server = createServer((req, res) => {
    const upstream = request({ host: '127.0.0.1', port: targetPort, localAddress: outboundAddress,
      method: req.method, path: req.url, headers: canonical(req.headers, req.socket.remoteAddress!) }, response => {
      res.writeHead(response.statusCode!, response.headers); response.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  server.on('upgrade', (req, socket, head) => {
    const upstream = connectTcp({ host: '127.0.0.1', port: targetPort, localAddress: outboundAddress }, () => {
      const headers = canonical(req.headers, req.socket.remoteAddress!);
      upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${Object.entries(headers)
        .filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\r\n')}\r\n\r\n`);
      if (head.length) upstream.write(head);
      socket.pipe(upstream); upstream.pipe(socket);
    });
    upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
  });
  const port = await listen(server);
  t.after(() => new Promise<void>((resolve, reject) => {
    sockets.forEach(socket => socket.destroy()); server.close(error => error ? reject(error) : resolve());
  }));
  return port;
}

async function fixture(t: TestContext, socketEnabled = false) {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.ok(process.env.DATABASE_URL && process.env.REDIS_URL, 'Explicit isolated infrastructure required');
  const app = express(); configureProxyTrust(app, parseTrustedProxyCidrs('127.0.0.2/32,127.0.0.3/32'));
  app.use(credentialedCors); app.use(express.json()); app.use(cookieParser());
  app.get('/identity', (req, res) => res.json({ ip: req.ip, secure: req.secure, protocol: req.protocol, hostname: req.hostname }));
  const prefix = `ingress-test:${randomUUID()}:`;
  const previousEnvironment = env.NODE_ENV;
  env.NODE_ENV = 'production';
  try { app.use('/limited', createLimiter(prefix, 60_000, 2)); }
  finally { env.NODE_ENV = previousEnvironment; }
  app.get('/limited', (_req, res) => res.json({ ok: true }));
  const user = await createTestUser(users, { email: `ingress-${randomUUID()}@kiit.ac.in`, emailVerified: true,
    termsVersion: env.TERMS_VERSION, termsAcceptedAt: new Date().toISOString(), ageConfirmedAt: new Date().toISOString() });
  let code = '';
  const email = { sendEmailLoginCode: async (_address: string, value: string) => { code = value; } } as unknown as EmailService;
  const auth = new AuthService(users, redis, undefined, email); const controller = new AuthController(auth);
  await auth.requestEmailOtp(user.email);
  app.post('/api/auth/email-otp/verify', controller.verifyEmailOtp);
  app.post('/api/auth/refresh', requireTrustedOrigin, controller.refresh);
  const server = createServer(app);
  const io = socketEnabled ? await attachSocketServer(server) : null;
  const api = await listen(server);
  const nginx = await proxy(t, api, '127.0.0.3', '127.0.0.2');
  const sameOrigin = await proxy(t, nginx, '127.0.0.2');
  const separateApi = await proxy(t, api, '127.0.0.2');
  t.after(async () => {
    if (io) await new Promise<void>(resolve => io.close(() => resolve()));
    else await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    for (const key of await redis.scanStrict(`session:${user.id}:*`)) await redis.delStrict(key);
    for (const key of await redis.scanStrict(`${prefix}*`)) await redis.delStrict(key);
    await redis.delStrict(`email-login-otp:${await redis.hashToken(user.email)}`);
    await redis.delStrict(`socket:connect:${user.id}`);
    await users.deleteById(user.id);
  });
  return { api, nginx, sameOrigin, separateApi, user, code, auth };
}

test('proxy configuration rejects aliases, blanket networks, malformed masks and hostnames', () => {
  assert.deepEqual(parseTrustedProxyCidrs(''), []);
  assert.deepEqual(parseTrustedProxyCidrs('127.0.0.2/32, 2001:db8::2/128,127.0.0.2/32'), ['127.0.0.2/32', '2001:db8::2/128']);
  for (const value of ['true', '1', 'loopback', 'linklocal', 'uniquelocal', 'proxy.internal', '0.0.0.0/0', '::/0',
    '127.0.0.1/33', '::1/129', '127.0.0.1/-1', '127.0.0.1/garbage', '::ffff:0.0.0.0/96']) {
    assert.throws(() => parseTrustedProxyCidrs(value), /TRUSTED_PROXY_CIDRS/);
  }
});

test('one-hop and two-hop edges preserve actual client identity and HTTPS; shorter paths reject spoofing', async t => {
  const f = await fixture(t);
  const spoof = { 'X-Forwarded-For': '198.51.100.99', 'X-Forwarded-Proto': 'https',
    'X-Forwarded-Host': 'attacker.invalid', Forwarded: 'for=198.51.100.99;proto=https' };
  for (const port of [f.sameOrigin, f.separateApi]) {
    const response = await send(port, '/identity', spoof);
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), { ip: '127.0.0.4', secure: true, protocol: 'https', hostname: 'synthetic-ingress.invalid' });
  }
  for (const port of [f.nginx, f.api]) {
    const response = await send(port, '/identity', spoof);
    const identity = JSON.parse(response.body);
    assert.equal(response.status, 200); assert.equal(identity.ip, '127.0.0.4');
    assert.equal(identity.secure, false); assert.equal(identity.protocol, 'http');
    assert.notEqual(identity.hostname, 'attacker.invalid');
  }
  const malformed = await send(f.api, '/identity', { 'X-Forwarded-For': '198.51.100.99, 127.0.0.4', 'X-Forwarded-Proto': 'https' }, { client: '127.0.0.2' });
  assert.equal(malformed.status, 400);
});

test('production Redis IP limits separate clients and cannot be reset by spoofed forwarded headers', async t => {
  const f = await fixture(t);
  for (const port of [f.sameOrigin, f.separateApi]) {
    const client = port === f.sameOrigin ? '127.0.0.4' : '127.0.0.6';
    assert.equal((await send(port, '/limited', {}, { client })).status, 200);
    assert.equal((await send(port, '/limited', {}, { client })).status, 200);
    assert.equal((await send(port, '/limited', { 'X-Forwarded-For': '203.0.113.222' }, { client })).status, 429);
    assert.equal((await send(port, '/limited', {}, { client: client === '127.0.0.4' ? '127.0.0.5' : '127.0.0.7' })).status, 200);
  }
});

test('credentialed CORS and refresh accept exact approved origins; production refresh cookies remain Secure', async t => {
  const f = await fixture(t); const approved = corsOrigins[0]; assert.ok(approved);
  const response = await send(f.sameOrigin, '/identity', { Origin: approved });
  assert.equal(response.headers['access-control-allow-origin'], approved);
  assert.equal(response.headers['access-control-allow-credentials'], 'true');
  for (const origin of ['https://attacker.invalid', `${approved}/path`, `${approved}/`, 'null']) {
    assert.equal((await send(f.sameOrigin, '/identity', { Origin: origin })).headers['access-control-allow-origin'], undefined);
    assert.equal((await send(f.sameOrigin, '/api/auth/refresh', { Origin: origin }, { method: 'POST' })).status, 403);
  }
  const previous = env.NODE_ENV; env.NODE_ENV = 'production';
  try {
    const login = await send(f.sameOrigin, '/api/auth/email-otp/verify', { Origin: approved, 'Content-Type': 'application/json' },
      { method: 'POST', body: JSON.stringify({ email: f.user.email, code: f.code }) });
    assert.equal(login.status, 200);
    const cookie = login.headers['set-cookie']?.[0]; assert.ok(cookie);
    assert.match(cookie, /; HttpOnly/); assert.match(cookie, /; Secure/); assert.match(cookie, /; SameSite=Lax/);
    const refresh = await send(f.sameOrigin, '/api/auth/refresh', { Origin: approved, Cookie: cookie.split(';')[0] }, { method: 'POST' });
    assert.equal(refresh.status, 200); assert.match(refresh.headers['set-cookie']?.[0] ?? '', /; Secure/);
  } finally { env.NODE_ENV = previous; }
});

test('real authenticated Socket.IO upgrades and reconnect work through both proxy paths and reject hostile origins', async t => {
  const f = await fixture(t, true);
  const login = await f.auth.loginWithEmailOtp({ email: f.user.email, code: f.code });
  const clients: Socket[] = [];
  t.after(() => clients.forEach(client => client.disconnect()));
  const connect = (port: number, origin: string) => new Promise<Socket>((resolve, reject) => {
    const client = connectSocket(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false,
      auth: { token: login.tokens.accessToken }, extraHeaders: { Origin: origin } });
    clients.push(client); client.once('connect', () => resolve(client)); client.once('connect_error', reject);
  });
  for (const port of [f.sameOrigin, f.separateApi]) {
    const client = await connect(port, corsOrigins[0]); assert.equal(client.connected, true);
    client.disconnect();
    assert.equal((await connect(port, corsOrigins[0])).connected, true);
    await assert.rejects(connect(port, 'https://attacker.invalid'), /websocket error/i);
  }
});
