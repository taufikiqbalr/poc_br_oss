const RAW_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export function getApiBase() {
  if (typeof window === 'undefined') return RAW_API;
  try {
    const configured = new URL(RAW_API);
    const browserHost = window.location.hostname;
    if (
      ['localhost', '127.0.0.1'].includes(configured.hostname) &&
      !['localhost', '127.0.0.1'].includes(browserHost)
    ) {
      configured.hostname = browserHost;
    }
    return configured.toString().replace(/\/$/, '');
  } catch {
    return RAW_API;
  }
}

export async function api(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `HTTP ${response.status}`);
  return data;
}
