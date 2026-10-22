// Read-only checks: no account, key or message is created or retrieved.
export async function verifyPrivateChat({ baseUrl, timeoutMs = 5000 }) {
  const origin = new URL(baseUrl);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error('Private-chat smoke requires an HTTP(S) endpoint without credentials');
  }
  const paths = ['/api', '/api/v1'].flatMap(prefix =>
    ['identity', 'threads'].map(route => `${prefix}/private-messages/${route}`));
  for (const path of paths) {
    const response = await fetch(new URL(path, origin), {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status !== 401 || !/^application\/json\b/i.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel();
      throw new Error(`${path}: expected an API authentication rejection (401 JSON), received ${response.status}`);
    }
    if (!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(response.headers.get('cache-control') ?? '')) {
      await response.body?.cancel();
      throw new Error(`${path}: private-chat responses must use Cache-Control: no-store`);
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body ?? []) {
      bytes += chunk.length;
      if (bytes > 8192) throw new Error(`${path}: authentication response exceeds the smoke-test limit`);
      chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* Fail without logging the response. */ }
    if (body?.success !== false || body?.data !== null || body?.message !== 'Authentication required') {
      throw new Error(`${path}: response is not the private API authentication rejection`);
    }
  }
  return { protectedRoutes: paths.length, noStore: true };
}
