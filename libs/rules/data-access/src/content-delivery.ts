import { inject, InjectionToken } from '@angular/core';
import { ContentContract } from '@pioneer/rules/sdk';
import type { BundleBody, BundleFile, ContentManifest, PackId } from '@pioneer/rules/sdk';
import { ApiClient } from '@pioneer/shared/web';

/** Port: where the browser asks for content it doesn't hold. The API serves it; tests serve packs from memory. */
export interface ContentDelivery {
  readonly manifest: () => Promise<ContentManifest>;
  readonly bundle: (pack: PackId, file: BundleFile) => Promise<BundleBody>;
}

function apiDelivery(api: ApiClient): ContentDelivery {
  return {
    manifest: async (): Promise<ContentManifest> => api.call(ContentContract.manifest, { params: {}, body: undefined }),
    bundle: async (pack: PackId, file: BundleFile): Promise<BundleBody> =>
      api.call(ContentContract.bundle, { params: { pack, file }, body: undefined }),
  };
}

/** How content is fetched: the content routes of the API. */
export const CONTENT_DELIVERY = new InjectionToken<ContentDelivery>('CONTENT_DELIVERY', {
  providedIn: 'root',
  factory: (): ContentDelivery => apiDelivery(inject(ApiClient)),
});
