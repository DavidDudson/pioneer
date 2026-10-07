import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { GAP, Space } from '../../tokens';

/** Fixed column counts collapse to one column on narrow screens. */
export const GridColumns = { One: 1, Two: 2, Three: 3, Four: 4, Six: 6 } as const;
export type GridColumns = ValueOf<typeof GridColumns>;

/** Fluid alternative: as many columns as fit at this minimum item width. */
export const GridMinItem = { Sm: 'sm', Md: 'md', Lg: 'lg' } as const;
export type GridMinItem = ValueOf<typeof GridMinItem>;

const COLUMNS: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};
const MIN_ITEM: Record<GridMinItem, string> = {
  sm: 'grid-cols-[repeat(auto-fill,minmax(min(10rem,100%),1fr))]',
  md: 'grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))]',
  lg: 'grid-cols-[repeat(auto-fill,minmax(min(24rem,100%),1fr))]',
};

@Component({
  selector: 'fr-grid',
  templateUrl: './grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Grid {
  public readonly columns = input<GridColumns>(GridColumns.Two);
  public readonly minItem = input<GridMinItem | undefined>(undefined);
  public readonly gap = input<Space>(Space.Md);

  protected readonly classes = computed(() => {
    const minItem = this.minItem();
    return ['grid', minItem === undefined ? COLUMNS[this.columns()] : MIN_ITEM[minItem], GAP[this.gap()]].join(' ');
  });
}
