import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import type { Container } from '../../tokens';
import { gapVariants, Space } from '../../tokens';

/**
 * Column count once the grid is wide enough. Columns respond to the grid's
 * own width (container queries), not the viewport: one column when narrow
 * (two for six-up stat blocks), more at the `md` and `lg` container sizes.
 */
export const GridColumns = { One: 1, Two: 2, Three: 3, Four: 4, Six: 6 } as const;
export type GridColumns = ValueOf<typeof GridColumns>;

/** Fluid alternative: as many columns as fit at this minimum item width. */
export const GridMinItem = { Sm: 'sm', Md: 'md', Lg: 'lg' } as const;
export type GridMinItem = ValueOf<typeof GridMinItem>;

/** Whose width the columns respond to. */
export const GridQuery = {
  /** The grid's own: the host is the query container. */
  Self: 'self',
  /**
   * The nearest container around it (an `fr-box`). The host takes no box of its own, so the inner grid is the
   * only element between the parent and the items: for rows that follow an outer container's width, such as
   * `fr-description-item`'s term and value.
   */
  Parent: 'parent',
} as const;
export type GridQuery = ValueOf<typeof GridQuery>;

export const GridAlign = { Stretch: 'stretch', Baseline: 'baseline' } as const;
export type GridAlign = ValueOf<typeof GridAlign>;

const hostVariants = cva('', {
  variants: {
    query: { self: '@container block min-w-none', parent: 'contents' } satisfies Record<GridQuery, string>,
  },
});

const gridVariants = cva('grid', {
  variants: {
    columns: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 @md:grid-cols-2',
      3: 'grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3',
      4: 'grid-cols-1 @md:grid-cols-2 @lg:grid-cols-4',
      6: 'grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-6',
    } satisfies Record<GridColumns, string>,
    minItem: {
      sm: 'grid-cols-fill-sm',
      md: 'grid-cols-fill-md',
      lg: 'grid-cols-fill-lg',
    } satisfies Record<GridMinItem, string>,
    termFrom: {
      sm: 'grid-cols-1 @sm:grid-cols-term',
      md: 'grid-cols-1 @md:grid-cols-term',
      lg: 'grid-cols-1 @lg:grid-cols-term',
    } satisfies Record<Container, string>,
    gap: gapVariants,
    align: { stretch: 'items-stretch', baseline: 'items-baseline' } satisfies Record<GridAlign, string>,
  },
});

/**
 * Two-dimensional layout primitive. The host is the query container and an
 * inner element is the grid, because an element can't query its own size.
 * Fills its parent's width. With `query="parent"` the columns follow the
 * nearest container around the grid instead, and the host takes no box.
 *
 * `termFrom` is the term/value layout: one column when narrow, then a fixed
 * term column (so terms line up across rows) and a value column taking the
 * rest from that container size. It takes precedence over `columns` and
 * `minItem`.
 */
@Component({
  selector: 'fr-grid',
  templateUrl: './grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClasses()' },
})
export class Grid {
  public readonly columns = input<GridColumns>(GridColumns.Two);
  public readonly minItem = input<GridMinItem | undefined>(undefined);
  public readonly termFrom = input<Container | undefined>(undefined);
  public readonly gap = input<Space>(Space.Md);
  public readonly align = input<GridAlign>(GridAlign.Stretch);
  public readonly query = input<GridQuery>(GridQuery.Self);

  protected readonly hostClasses = computed(() => hostVariants({ query: this.query() }));
  protected readonly classes = computed(() => {
    const shared = { gap: this.gap(), align: this.align() };
    const termFrom = this.termFrom();
    if (termFrom !== undefined) {
      return gridVariants({ termFrom, ...shared });
    }
    const minItem = this.minItem();
    return gridVariants(minItem === undefined ? { columns: this.columns(), ...shared } : { minItem, ...shared });
  });
}
