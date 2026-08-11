/**
 * Normalize a /uploads URL for use in <img src> / <a href>.
 *
 * This used to append the JWT as a ?token= query param, because img/link
 * navigations can't carry an Authorization header the way axios requests
 * can. That's no longer necessary: auth now rides on an httpOnly session
 * cookie (see middleware/auth.ts on the backend), and the browser attaches
 * cookies automatically to any same-origin request — including plain <img>
 * and <a> navigations — with no help from JS. The backend's
 * allowQueryToken middleware still accepts a ?token= if one is ever passed,
 * so this remains compatible with any link built the old way.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
}
