import { inject, InjectionToken } from '@angular/core';
import { ContentContract, ContentSearchContract, HomebrewContentContract } from '@pioneer/rules/sdk';
import type {
  BundleBody,
  BundleFile,
  ContentManifest,
  ContentPackId,
  ContentSearchQuery,
  ContentSearchResult,
  PackId,
} from '@pioneer/rules/sdk';
import { ApiClient } from '@pioneer/shared/web';

/** Port: where the browser asks for content it doesn't hold. The API serves it; tests serve packs from memory. */
export interface ContentDelivery {
  readonly manifest: () => Promise<ContentManifest>;
  readonly bundle: (pack: PackId, file: BundleFile) => Promise<BundleBody>;
  /** The bundles of the homebrew `packs` (and what they extend) the signed-in user may read. */
  readonly homebrewManifest: (packs: readonly ContentPackId[]) => Promise<ContentManifest>;
  readonly homebrewBundle: (pack: PackId, file: BundleFile) => Promise<BundleBody>;
  /** Full-text search on the server: the ids of the entries that match, best first. */
  readonly search: (query: ContentSearchQuery) => Promise<ContentSearchResult>;
}

function apiDelivery(api: ApiClient): ContentDelivery {
  return {
    manifest: async (): Promise<ContentManifest> => api.call(ContentContract.manifest, { params: {}, body: undefined }),
    bundle: async (pack: PackId, file: BundleFile): Promise<BundleBody> =>
      api.call(ContentContract.bundle, { params: { pack, file }, body: undefined }),
    homebrewManifest: async (packs: readonly ContentPackId[]): Promise<ContentManifest> =>
      api.call(HomebrewContentContract.manifest, { params: {}, body: { packs } }),
    homebrewBundle: async (pack: PackId, file: BundleFile): Promise<BundleBody> =>
      api.call(HomebrewContentContract.bundle, { params: { pack, file }, body: undefined }),
    search: async (query: ContentSearchQuery): Promise<ContentSearchResult> =>
      api.call(ContentSearchContract.search, { params: {}, query, body: undefined }),
  };
}

/** How content is fetched: the content routes of the API. */
export const CONTENT_DELIVERY = new InjectionToken<ContentDelivery>('CONTENT_DELIVERY', {
  providedIn: 'root',
  factory: (): ContentDelivery => apiDelivery(inject(ApiClient)),
});
