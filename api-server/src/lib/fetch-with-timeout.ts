export async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  // These callers consume small provider JSON responses. Bound both headers and
  // body: fetch itself resolves as soon as the headers arrive.
  const maxResponseBytes = 2 * 1024 * 1024;
  const controller = new AbortController();
  const upstreamSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const signal = upstreamSignal ? AbortSignal.any([controller.signal, upstreamSignal]) : controller.signal;
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Request timed out after ${timeoutMs}ms`);
      reject(error);
      controller.abort(error);
    }, timeoutMs);
  });
  const request = async () => {
    const response = await fetch(input, { ...init, signal });
    if (!response.body) return response;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxResponseBytes) throw new Error('Provider response exceeds 2 MiB limit');
        chunks.push(value);
      }
    } catch (error) {
      controller.abort(error);
      void reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
    const headers = new Headers(response.headers);
    // Fetch may already have decompressed the stream.
    headers.delete('content-encoding');
    headers.delete('content-length');
    return new Response(Buffer.concat(chunks, bytes), { status: response.status, statusText: response.statusText, headers });
  };
  try {
    return await Promise.race([request(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
    controller.abort();
  }
}
