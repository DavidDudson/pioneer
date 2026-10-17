import type { LinkTarget } from '@pioneer/frontier';
import type { SourceRef } from '@pioneer/rules/sdk';
import type { Chip } from '@pioneer/rules/ui';

/** An entry as the list's table shows it: the level and kind already in the UI locale. */
export interface BrowseRow {
  readonly id: string;
  readonly name: string;
  /** Where the entry opens. */
  readonly to: LinkTarget;
  readonly kind: string;
  readonly level: string;
  readonly traits: readonly Chip[];
  readonly sources: readonly SourceRef[];
}

/** The ids of the table's columns. */
export const BrowseColumn = {
  Name: 'name',
  Kind: 'kind',
  Level: 'level',
  Traits: 'traits',
  Source: 'source',
} as const;

/** The short code each column has in a shared view's `s` and `c` params (ADR-0068). Fixed: links name them. */
export const BrowseColumnCode = {
  Name: 'name',
  Kind: 'kind',
  Level: 'lvl',
  Traits: 'trt',
  Source: 'src',
} as const;
