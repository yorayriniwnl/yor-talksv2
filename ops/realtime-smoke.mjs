// Exercise the deployed polling proxy and namespace authentication without
// creating an account, authenticating a user or sending a message.
export async function verifyRealtime({ baseUrl, browserOrigin, timeoutMs = 5000 }) {
  const endpoint = new URL('/socket.io/', baseUrl);
  const origin = new URL(browserOrigin);
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password
    || !['http:', 'https:'].includes(origin.protocol) || origin.origin !== browserOrigin) {
    throw new Error('Realtime smoke requires HTTP(S) endpoints and an exact browser origin');
  }
  const request = async (originValue, sid, body) => {
    const url = new URL(endpoint);
    url.searchParams.set('EIO', '4');
    url.searchParams.set('transport', 'polling');
    if (sid) url.searchParams.set('sid', sid);
    const response = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: originValue, ...(body === undefined ? {} : { 'Content-Type': 'text/plain;charset=UTF-8' }) },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    let text = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    for await (const chunk of response.body ?? []) {
      bytes += chunk.length;
      if (bytes > 65536) throw new Error('Realtime smoke response exceeds the transport limit');
      text += decoder.decode(chunk, { stream: true });
    }
    text += decoder.decode();
    return { response, text };
  };

  const rejected = await request('https://untrusted-origin.invalid');
  if (rejected.response.status !== 403) throw new Error('Realtime proxy must reject an untrusted browser origin');

  const opened = await request(browserOrigin);
  let handshake;
  try { handshake = opened.text.startsWith('0') && JSON.parse(opened.text.slice(1)); } catch { /* Reject an HTML shell or malformed packet. */ }
  if (opened.response.status !== 200 || !handshake || typeof handshake.sid !== 'string'
    || !/^[A-Za-z0-9_-]{1,128}$/.test(handshake.sid) || !Array.isArray(handshake.upgrades)
    || opened.response.headers.get('access-control-allow-origin') !== browserOrigin) {
    throw new Error('Realtime proxy did not return an allowed-origin Engine.IO open packet');
  }
  try {
    const connect = await request(browserOrigin, handshake.sid, '40');
    if (connect.response.status !== 200) throw new Error('Realtime proxy rejected the polling connection packet');
    const result = await request(browserOrigin, handshake.sid);
    if (result.response.status !== 200 || !result.text.split('\x1e').some(packet => {
      if (!packet.startsWith('44')) return false;
      try { return JSON.parse(packet.slice(2)).message === 'Authentication error'; } catch { return false; }
    })) throw new Error('Realtime namespace must reject an unauthenticated connection');
  } finally {
    // Release the unauthenticated transport even when a proxy assertion fails.
    await request(browserOrigin, handshake.sid, '1').catch(() => {});
  }
  return { polling: true, originRejection: true, unauthenticatedRejection: true };
}
