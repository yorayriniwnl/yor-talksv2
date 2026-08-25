import { writeFile } from 'node:fs/promises';

const outputPath = process.argv[2];
const width = Number(process.argv[3] || 1440);
const height = Number(process.argv[4] || 1400);
const targets = await (await fetch('http://127.0.0.1:9228/json')).json();
const page = targets.find((target) => target.type === 'page' && target.url.includes('127.0.0.1:5174'));

if (!page || !outputPath) {
  throw new Error('Usage: node scripts/cdp-screenshot.mjs <output-path> [width] [height]');
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let id = 0;
function send(method, params = {}) {
  const requestId = ++id;
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== requestId) return;
      socket.removeEventListener('message', handler);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    socket.addEventListener('message', handler);
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
}

await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: false,
});
await new Promise((resolve) => setTimeout(resolve, 500));
const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
await writeFile(outputPath, screenshot.data, 'base64');
socket.close();
