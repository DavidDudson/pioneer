/** Hosts the dev server may serve: this machine only. */
const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The interface the dev server listens on, so nothing else on the network can reach its sign-in. */
export const DEV_HOSTNAME = 'localhost';

/**
 * Dev sign-in skips every provider, so the dev server only starts for a local origin: PUBLIC_ORIGIN set (the dev
 * shell sets it) to plain http on localhost. Anything else looks like a real deployment and is refused.
 */
export function assertLocalOrigin(publicOrigin: string | undefined): void {
  const origin = publicOrigin === undefined ? undefined : new URL(publicOrigin);
  if (origin?.protocol !== 'http:' || !LOCAL_HOSTNAMES.has(origin.hostname)) {
    throw new Error(
      `Refusing to start dev sign-in: PUBLIC_ORIGIN must be http on localhost, got ${publicOrigin ?? 'nothing'}`,
    );
  }
}

/**
 * True when a browser says the request came from another site. The dev user ids are public, so without this any
 * page could navigate here and swap the developer's session (login CSRF). Fetch metadata is set by the browser and
 * cannot be forged by a page; `same-origin` is the sign-in page, `none` a typed URL. Requests without it are not
 * from a browser and carry no victim's cookies.
 */
export function isCrossSiteRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite !== null && fetchSite !== 'same-origin' && fetchSite !== 'none';
}
