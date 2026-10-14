import type { HomebrewBundleService } from '@pioneer/homebrew/application';
import { HomebrewContentContract } from '@pioneer/rules/sdk';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** A manifest is read for one signed-in user, so only that browser may keep it, and only briefly. */
export const HOMEBREW_MANIFEST_CACHE_CONTROL = 'private, max-age=10';
/** A bundle's name changes with its contents, so the browser that fetched it never needs asking again. Never shared. */
export const HOMEBREW_BUNDLE_CACHE_CONTROL = 'private, max-age=31536000, immutable';

/**
 * HTTP adapter for homebrew content. Every route needs a signed-in user (401 otherwise); which packs that user may
 * read is `HomebrewBundleService`'s policy. Responses are `private`, so the edge Worker, which keeps only `public`
 * ones, never caches content that is not public.
 */
export function homebrewBundleRoutes(
  service: HomebrewBundleService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('homebrew-bundle-routes')
    .handleSignedIn(HomebrewContentContract.manifest, auth, async ({ actor, body, responseHeaders }) => {
      const manifest = await service.manifest(actor, body);
      responseHeaders['cache-control'] = HOMEBREW_MANIFEST_CACHE_CONTROL;
      return manifest;
    })
    .handleSignedIn(HomebrewContentContract.bundle, auth, async ({ actor, params, responseHeaders }) => {
      const body = await service.bundle(actor, params.pack, params.file);
      responseHeaders['cache-control'] = HOMEBREW_BUNDLE_CACHE_CONTROL;
      return body;
    }).app;
}
