import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { AsyncQuery } from '@pioneer/frontier';
import { ContentCachesView } from '@pioneer/legal/ui';
import type { CachePack } from '@pioneer/legal/ui';
import { ContentContract } from '@pioneer/rules/sdk';
import type { BundleFile, PackId } from '@pioneer/rules/sdk';
import { API_BASE_URL } from '@pioneer/shared/web';

import { LEGAL_IMPORTS } from '../legal-imports';
import { ContentCacheStore } from './content-cache-store';
import { cachePacks } from './content-caches';

/**
 * The official content caches (ADR-0028 container): loads the public manifest and hands the packs, with their download
 * links, to the view. The files are the ones the browser loads, named by kind and content hash.
 */
@Component({
  selector: 'pio-content-caches',
  imports: [ContentCachesView],
  templateUrl: './content-caches.component.html',
  providers: [ContentCacheStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentCaches {
  readonly #manifest = inject(ContentCacheStore).manifest;
  readonly #origin = inject(DOCUMENT).location.origin;
  readonly #apiBase = inject(API_BASE_URL);

  /** Packs as the manifest lists them, ready to render. */
  protected readonly caches: AsyncQuery<readonly CachePack[]> = {
    data: computed((): readonly CachePack[] | undefined => {
      const manifest = this.#manifest.data();
      return manifest === undefined ? undefined : cachePacks(manifest, LEGAL_IMPORTS, this.#downloadUrl);
    }),
    error: this.#manifest.error,
    isPending: () => this.#manifest.isPending(),
    isError: () => this.#manifest.isError(),
  };

  /** Where `file` of `pack` downloads from, absolute so it links as a plain document. */
  readonly #downloadUrl = (pack: PackId, file: BundleFile): string =>
    new URL(`${this.#apiBase}${ContentContract.bundle.url({ pack, file })}`, this.#origin).href;
}
