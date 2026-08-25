const handlePattern = /^@[A-Za-z0-9._]{2,40}$/;

export function normalizePublicAttribution(value: string) {
  const trimmed = value.trim();
  if (handlePattern.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function publicAttributionHref(value: string | null) {
  if (!value || value.startsWith('@')) return null;
  return normalizePublicAttribution(value);
}
