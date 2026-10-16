/**
 * Path of a `file:` URL for Node, without `node:url` so browser bundles stay clean.
 * On Windows `URL.pathname` is `/C:/dir`, which Node resolves to `C:\C:\dir`.
 */
export function fileUrlPath(url: string | URL): string {
  const pathname = decodeURIComponent(new URL(url).pathname)
  return /^\/[A-Za-z]:/.test(pathname) ? pathname.slice(1) : pathname
}
