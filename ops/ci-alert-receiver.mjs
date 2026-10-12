import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';

const expected = Buffer.from(`Basic ${Buffer.from(`ci-alertmanager:${readFileSync('/run/secrets/alertmanager_webhook_password', 'utf8').trim()}`).toString('base64')}`);
const states = { firing: 0, resolved: 0, rejected: 0 };
createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/state') {
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(states)); return;
  }
  if (req.method !== 'POST' || req.url !== '/webhook') { res.writeHead(404).end(); return; }
  const actual = Buffer.from(req.headers.authorization ?? '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) { states.rejected++; res.writeHead(401).end(); return; }
  try {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 262144) throw new Error('oversized synthetic request'); }
    const report = JSON.parse(body);
    if (Array.isArray(report.alerts)) for (const alert of report.alerts) {
      if (alert.labels?.alertname === 'YorSyntheticDeliveryRehearsal' && ['firing', 'resolved'].includes(alert.status)) states[alert.status]++;
    }
    res.writeHead(200).end();
  } catch { res.writeHead(400).end(); }
}).listen(9099, '0.0.0.0');
