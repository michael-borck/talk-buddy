// Shared HTTP behaviour for AI Brain requests.

export async function fetchWithRetry(
  input: string,
  init: RequestInit & { signal?: AbortSignal },
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 60000;
  const retries = opts.retries ?? 1;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeoutCtrl = new AbortController();
    const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
    const signals = init.signal ? [init.signal, timeoutCtrl.signal] : [timeoutCtrl.signal];
    const combined = AbortSignal.any(signals);

    try {
      const response = await fetch(input, { ...init, signal: combined });
      clearTimeout(timer);
      return response;
    } catch (e) {
      clearTimeout(timer);
      if (init.signal?.aborted) throw e;
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}
