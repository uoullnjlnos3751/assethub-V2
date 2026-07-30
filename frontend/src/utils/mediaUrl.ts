/** Append JWT for protected /uploads URLs so img tags and links work in the browser. */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  const normalized = url.startsWith('/') ? url : `/${url}`;
  if (!normalized.startsWith('/uploads/')) {
    return url;
  }

  const token = localStorage.getItem('token');
  if (!token) return normalized;

  const separator = normalized.includes('?') ? '&' : '?';
  return `${normalized}${separator}token=${encodeURIComponent(token)}`;
}
