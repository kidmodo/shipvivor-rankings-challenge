export function buildApiUrl(action, params = {}) {
  const url = new URL('/api/', window.location.origin);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}
