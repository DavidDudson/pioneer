import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Disclosure,
  Heading,
  Link,
  List,
  ListItem,
  LocaleFormat,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import { ContentContract } from '@pioneer/rules/sdk';
import type { BundleFile } from '@pioneer/rules/sdk';
import { API_BASE_URL } from '@pioneer/shared/web';

import { LEGAL_IMPORTS } from '../legal-imports';
import { ContentCacheStore } from './content-cache-store';
import { cachePacks } from './content-caches';
import type { CachePack } from './content-caches';

const BYTES_PER_KILOBYTE = 1000;
const BYTES_PER_MEGABYTE = 1_000_000;
const FRACTION_DIGITS = 1;
/** The smallest size whose kilobytes, to one fraction digit, round up to a full megabyte. */
const MEGABYTE_ROUNDS_FROM = 999_950;
/** Skeleton rows shown while the manifest loads. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

/**
 * The official content caches: every pack's bundles, each downloadable without an account. The files are the ones the
 * browser loads, named by kind and content hash, so a download is exactly what the app uses.
 */
@Component({
  selector: 'pio-content-caches',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Disclosure,
    Heading,
    Link,
    List,
    ListItem,
    Skeleton,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './content-caches.component.html',
  providers: [ContentCacheStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentCaches {
  protected readonly caches = inject(ContentCacheStore);
  protected readonly placeholders = PLACEHOLDERS;
  readonly #format = inject(LocaleFormat);
  readonly #origin = inject(DOCUMENT).location.origin;
  readonly #apiBase = inject(API_BASE_URL);

  /** Packs as the manifest lists them, ready to render. */
  protected readonly packs = computed((): readonly CachePack[] => {
    const manifest = this.caches.manifest.data();
    return manifest === undefined ? [] : cachePacks(manifest, LEGAL_IMPORTS);
  });

  /** A size in kilobytes, or megabytes from a million bytes, in the viewer's locale. */
  protected size(bytes: number): string {
    const large = bytes >= MEGABYTE_ROUNDS_FROM;
    return this.#format.number(bytes / (large ? BYTES_PER_MEGABYTE : BYTES_PER_KILOBYTE), {
      style: 'unit',
      unit: large ? 'megabyte' : 'kilobyte',
      maximumFractionDigits: FRACTION_DIGITS,
    });
  }

  /** Where `file` of `pack` downloads from, absolute so it links as a plain document. */
  protected url(pack: CachePack, file: BundleFile): string {
    return new URL(`${this.#apiBase}${ContentContract.bundle.url({ pack: pack.id, file })}`, this.#origin).href;
  }
}
