const expression = process.argv.slice(2).join(' ');
const targets = await (await fetch('http://127.0.0.1:9228/json')).json();
const page = targets.find((target) => target.type === 'page' && target.url.includes('127.0.0.1:5174'));

if (!page) {
  throw new Error('No Yor Talks page is available in Chrome DevTools.');
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

const result = await new Promise((resolve) => {
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id === 1) resolve(message.result);
  };
  socket.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression, returnByValue: true, awaitPromise: true },
  }));
});

console.log(JSON.stringify(result, null, 2));
socket.close();
