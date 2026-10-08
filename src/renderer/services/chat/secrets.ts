// Credential handling for AI Brain Providers.

// Credential-bearing headers must never reach the console — devtools is
// often open during support sessions and screenshots end up in issues.
const SENSITIVE_HEADERS = ['authorization', 'x-api-key'];
export function redactAuthHeaders(headers: HeadersInit): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) =>
      SENSITIVE_HEADERS.includes(key.toLowerCase()) ? [key, '***'] : [key, value]
    )
  );
}

// Resolves a stored API key. If the value is an `env:VAR_NAME`
// reference, hops through the main process to read the real shell
// environment variable — renderer's `process.env` is a sandboxed
// polyfill with no visibility into the environment Electron was
// launched from. Returns an empty string if the env var is unset so
// callers can still decide whether to send an Authorization header.
export async function resolveApiKey(storedValue: string | null | undefined): Promise<string> {
  if (!storedValue) return '';
  if (!storedValue.startsWith('env:')) return storedValue;
  const envVarName = storedValue.substring(4).trim();
  if (!envVarName) return '';
  try {
    const resolved = await window.electronAPI.app.getEnvVar(envVarName);
    return resolved || '';
  } catch (err) {
    console.warn(`resolveApiKey: failed to read env var ${envVarName}:`, err);
    return '';
  }
}
