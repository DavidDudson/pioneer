import { ContentContract } from '@pioneer/rules/sdk';
import { ContractRouter } from '@pioneer/shared/server';

import type { StoredContentBundles } from './stored-content-bundles';

/**
 * A burst of page loads shares one manifest, and a re-seed reaches browsers in seconds. After that a browser asks again
 * with its `ETag`, so an unchanged manifest costs a 304, not 585 KB; it may show the old one for a minute while it asks.
 */
export const MANIFEST_CACHE_CONTROL = 'public, max-age=10, stale-while-revalidate=60';
/** A bundle's name changes with its contents, so a fetched bundle never needs asking for again. */
export const BUNDLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const NOT_MODIFIED = 304;

/** Whether an `If-None-Match` header names `etag`, or `*`. */
function matches(header: string | null, etag: string): boolean {
  if (header === null) {
    return false;
  }
  return header
    .split(',')
    .map((candidate) => candidate.trim().replace(/^W\//u, ''))
    .some((candidate) => candidate === '*' || candidate === etag);
}

/**
 * HTTP adapter for official content. No route needs a sign-in (ADR-0007), and every response is public, so the edge
 * Worker caches it: the manifest briefly, a bundle for good.
 */
export function contentRoutes(bundles: StoredContentBundles): ContractRouter['app'] {
  const router = new ContractRouter('content-routes');
  router.app.onBeforeHandle(async ({ request }) => {
    if (request.method !== 'GET' || !new URL(request.url).pathname.endsWith(ContentContract.manifest.path)) {
      return undefined;
    }
    const etag = await bundles.manifestEtag();
    if (!matches(request.headers.get('if-none-match'), etag)) {
      return undefined;
    }
    return new Response(undefined, {
      status: NOT_MODIFIED,
      headers: { etag, 'cache-control': MANIFEST_CACHE_CONTROL },
    });
  });
  return router
    .handle(ContentContract.manifest, async ({ responseHeaders }) => {
      const [manifest, etag] = await Promise.all([bundles.manifest(), bundles.manifestEtag()]);
      responseHeaders['cache-control'] = MANIFEST_CACHE_CONTROL;
      responseHeaders.etag = etag;
      return manifest;
    })
    .handle(ContentContract.bundle, async ({ params, responseHeaders }) => {
      const body = await bundles.bundle(params.pack, params.file);
      responseHeaders['cache-control'] = BUNDLE_CACHE_CONTROL;
      return body;
    }).app;
}
