import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { reportRoutes as reports } from '../routes/reports.js';
import { ModerationService } from '../services/moderation-service.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { closeAuthenticationDependencies } from '../middlewares/auth.js';
import { closeRateLimitRedis } from '../middlewares/rate-limit.js';

after(async () => {
  await Promise.all([closeAuthenticationDependencies(), closeRateLimitRedis()]);
  await pool.end();
});

const ticket = {
  id: 'private-database-row-id', ticketId: 'YT-GRV-0123456789', category: 'privacy_violation' as const,
  reportedUrl: 'https://private.example.invalid/account', reporterName: 'Private reporter',
  reporterEmail: 'reporter@example.invalid', description: 'Private complaint description',
  status: 'under_review' as const, slaDeadline: '2026-10-22T12:00:00.000Z',
  createdAt: '2026-10-07T12:00:00.000Z', officerNote: 'Private investigation notes',
  futureInternalField: 'Must never become public when storage evolves',
};
const expectedReceipt = {
  ticketId: ticket.ticketId, status: ticket.status, createdAt: ticket.createdAt,
  reviewTargetAt: ticket.slaDeadline,
};

test('public grievance submission and tracking disclose only receipt fields through both API mounts', async t => {
  t.mock.method(ModerationService.prototype, 'fileGrievance', async () => ticket);
  t.mock.method(ModerationService.prototype, 'getGrievanceStatus', async () => ticket);
  const app = express(); app.use(express.json());
  app.use('/api/reports', reports); app.use('/api/v1/reports', reports);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  for (const prefix of ['/api', '/api/v1']) {
    const submit = await fetch(`${base}${prefix}/reports/grievance`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: ticket.category, reportedUrl: ticket.reportedUrl,
        reporterName: ticket.reporterName, reporterEmail: ticket.reporterEmail, description: ticket.description }),
    });
    assert.equal(submit.status, 201);
    assert.deepEqual((await submit.json() as { data: unknown }).data, expectedReceipt);
    const status = await fetch(`${base}${prefix}/reports/grievance/${ticket.ticketId}`);
    assert.equal(status.status, 200);
    assert.deepEqual((await status.json() as { data: unknown }).data, expectedReceipt);
    const absent = await fetch(`${base}${prefix}/reports/grievance/not-a-valid-ticket`);
    assert.equal(absent.status, 400);
  }
});

test('staff grievance details remain protected and available to authorized reviewers', async t => {
  const previousBeta = env.PUBLIC_BETA; env.PUBLIC_BETA = false; t.after(() => { env.PUBLIC_BETA = previousBeta; });
  t.mock.method(RedisRepository.prototype, 'getStrict', async () => 'synthetic-session');
  t.mock.method(UserRepository.prototype, 'findById', async (id: string) => ({ id, role: id === 'reviewer' ? 'moderator' : 'user',
    permissions: [], accountStatus: 'active', authVersion: 0 }));
  t.mock.method(ModerationService.prototype, 'listGrievances', async () => [ticket]);
  const app = express(); app.use('/api/reports', reports);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/reports/grievances`;
  assert.equal((await fetch(url)).status, 401);
  const headers = (sub: string) => ({ Authorization: `Bearer ${jwt.sign({ sub, deviceId: 'synthetic-device', type: 'access', authVersion: 0 }, env.JWT_SECRET, { expiresIn: 60 })}` });
  assert.equal((await fetch(url, { headers: headers('ordinary-user') })).status, 403);
  const response = await fetch(url, { headers: headers('reviewer') });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { data: Array<{ officerNote: string }> }).data[0].officerNote, ticket.officerNote);
});
