const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 4001;
const outFile = process.env.OUT_FILE || 'telemetry-received.log';

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Only POST allowed');
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const entry = { ts: new Date().toISOString(), url: req.url, payload: parsed };
      fs.appendFileSync(outFile, JSON.stringify(entry) + '\n');
      console.log('Received:', JSON.stringify(entry));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      console.error('Bad payload', e.message);
      res.writeHead(400);
      res.end('invalid json');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Telemetry test server listening on http://localhost:${PORT}/api/events`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
