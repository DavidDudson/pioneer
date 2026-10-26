import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
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
import type { AsyncQuery } from '@pioneer/frontier';

import type { CachePack } from '../cache-pack';

const BYTES_PER_KILOBYTE = 1000;
const BYTES_PER_MEGABYTE = 1_000_000;
const FRACTION_DIGITS = 1;
/** The smallest size whose kilobytes, to one fraction digit, round up to a full megabyte. */
const MEGABYTE_ROUNDS_FROM = 999_950;
/** Skeleton rows shown while the caches load. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

/**
 * The official content caches: every pack's bundles, each downloadable without an account. It shows the packs it is
 * given, with their sizes and download links; a container loads them (ADR-0028).
 */
@Component({
  selector: 'pio-content-caches-view',
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
  templateUrl: './content-caches-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentCachesView {
  public readonly caches = input.required<AsyncQuery<readonly CachePack[]>>();
  protected readonly placeholders = PLACEHOLDERS;
  readonly #format = inject(LocaleFormat);

  /** A size in kilobytes, or megabytes from a million bytes, in the viewer's locale. */
  protected size(bytes: number): string {
    const large = bytes >= MEGABYTE_ROUNDS_FROM;
    return this.#format.number(bytes / (large ? BYTES_PER_MEGABYTE : BYTES_PER_KILOBYTE), {
      style: 'unit',
      unit: large ? 'megabyte' : 'kilobyte',
      maximumFractionDigits: FRACTION_DIGITS,
    });
  }
}
