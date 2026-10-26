import { inject, Injectable } from '@angular/core';
import { ContentContract } from '@pioneer/rules/sdk';
import type { ContentManifest } from '@pioneer/rules/sdk';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';

/** The official packs' bundles, from the public manifest (ADR-0007): no account needed. Provided per page. */
@Injectable()
export class ContentCacheStore {
  readonly #api = inject(ApiClient);

  public readonly manifest = injectQuery(() => ({
    queryKey: ['legal', 'content-caches'],
    queryFn: async (): Promise<ContentManifest> =>
      this.#api.call(ContentContract.manifest, { params: {}, body: undefined }),
  }));
}
