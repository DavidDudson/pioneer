import { ContentContract } from '@pioneer/rules/sdk';
import { ContractRouter } from '@pioneer/shared/server';

import type { StoredContentBundles } from './stored-content-bundles';

/** Long enough that a burst of page loads shares one manifest, short enough that a re-seed reaches browsers in seconds. */
export const MANIFEST_CACHE_CONTROL = 'public, max-age=10';
/** A bundle's name changes with its contents, so a fetched bundle never needs asking for again. */
export const BUNDLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * HTTP adapter for official content. No route needs a sign-in (ADR-0007), and every response is public, so the edge
 * Worker caches it: the manifest briefly, a bundle for good.
 */
export function contentRoutes(bundles: StoredContentBundles): ContractRouter['app'] {
  return new ContractRouter('content-routes')
    .handle(ContentContract.manifest, async ({ responseHeaders }) => {
      const manifest = await bundles.manifest();
      responseHeaders['cache-control'] = MANIFEST_CACHE_CONTROL;
      return manifest;
    })
    .handle(ContentContract.bundle, async ({ params, responseHeaders }) => {
      const body = await bundles.bundle(params.pack, params.file);
      responseHeaders['cache-control'] = BUNDLE_CACHE_CONTROL;
      return body;
    }).app;
}
