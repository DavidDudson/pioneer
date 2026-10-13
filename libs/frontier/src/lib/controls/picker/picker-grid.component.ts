import { ComboboxWidget } from '@angular/aria/combobox';
import { Grid } from '@angular/aria/grid';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import type { Row } from '@tanstack/angular-table';

import { TableHeaderCell } from '../../data/table/header-cell/header-cell.component';
import type { TableFeatureSet, TableHeader } from '../../data/table/table-features';
import { Size } from '../../tokens';
import { ComboboxStatus } from '../combobox/combobox-status.component';
import { injectOptionVirtualizer, optionOffset } from '../option-virtualizer';
import { PickerRow } from './picker-row.component';
import {
  pickerBodyClasses,
  pickerGridClasses,
  pickerHeaderCellVariants,
  pickerHeaderRowClasses,
  pickerScrollerClasses,
} from './picker.variants';

/** Rows still to scroll past before the next ones are asked for, so they arrive before the end is reached. */
const LOAD_AHEAD = 8;
/** The header takes the first `aria-rowindex`. */
const HEADER_ROW_COUNT = 1;
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function headerClasses<TRow extends object>(header: TableHeader<TRow>): string {
  return pickerHeaderCellVariants({ width: header.column.columnDef.meta?.width ?? Size.Md });
}

function ariaSort<TRow extends object>(header: TableHeader<TRow>): string | undefined {
  const sorted = header.column.getIsSorted();
  return sorted === false ? undefined : ARIA_SORT[sorted];
}

/**
 * The open panel of an `fr-picker`: a sticky header and the rows, virtualised inside their own scroll container
 * so thousands stay cheap. A grid on `@angular/aria` that `fr-picker`'s search box drives by
 * `aria-activedescendant`; the header buttons are the only things in it that take focus.
 */
@Component({
  selector: 'fr-picker-grid',
  imports: [ComboboxStatus, ComboboxWidget, Grid, PickerRow, TableHeaderCell],
  templateUrl: './picker-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PickerGrid<TRow extends object> {
  public readonly headers = input.required<readonly TableHeader<TRow>[]>();
  public readonly rows = input.required<readonly Row<TableFeatureSet, TRow>[]>();
  /** The picked row's id. */
  public readonly value = input<string | undefined>(undefined);
  /** Why a row can't be picked; `undefined` when it can. */
  public readonly reasonOf = input.required<(row: TRow) => string | undefined>();
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly loadingMore = input(false, { transform: booleanAttribute });
  public readonly hasMore = input(false, { transform: booleanAttribute });
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly labelledBy = input<string | undefined>(undefined);
  /** Changes whenever the rows start over (a new query or order): the list scrolls back to the top. */
  public readonly generation = input(0);
  public readonly picked = output<Row<TableFeatureSet, TRow>>();
  /** The end of the loaded rows is near and `hasMore`. */
  public readonly loadMore = output();
  /** Escape pressed on a column header button, where the search input is not the focus. */
  public readonly dismissed = output();

  protected readonly scrollerClasses = pickerScrollerClasses;
  protected readonly gridClasses = pickerGridClasses;
  protected readonly headerRowClasses = pickerHeaderRowClasses;
  protected readonly bodyClasses = pickerBodyClasses;
  protected readonly headerClasses = headerClasses<TRow>;
  protected readonly ariaSort = ariaSort<TRow>;
  protected readonly translate = optionOffset;
  protected readonly headerRowCount = HEADER_ROW_COUNT;

  protected readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  protected readonly rowParts = viewChildren(PickerRow);

  readonly #pickedIndex = computed(() => {
    const value = this.value();
    const index = this.rows().findIndex((row) => row.id === value);
    return index === -1 ? undefined : index;
  });
  /** The row holding the keyboard's highlight. */
  readonly #activeIndex = computed(() => {
    const active = this.rowParts().find((part) => part.active());
    const id = active?.row().id;
    const index = this.rows().findIndex((row) => row.id === id);
    return index === -1 ? undefined : index;
  });

  protected readonly virtualizer = injectOptionVirtualizer({
    keys: computed(() => this.rows().map((row) => row.id)),
    scroller: this.scroller,
    pinned: computed(() => {
      const active = this.#activeIndex();
      // The highlight's neighbours too, so an arrow key always lands on the next row, even before the panel scrolls.
      const around = active === undefined ? [] : [active - 1, active, active + 1];
      return [...around, this.#pickedIndex()];
    }),
  });
  protected readonly visibleRows = computed(() => (this.loading() ? [] : this.virtualizer.getVirtualItems()));
  protected readonly totalSize = computed(() => (this.loading() ? 0 : this.virtualizer.getTotalSize()));
  protected readonly empty = computed(() => !this.loading() && this.rows().length === 0);
  protected readonly busy = computed(() => this.loading() || this.loadingMore());
  protected readonly rowCount = computed(() => (this.hasMore() ? -1 : this.rows().length + HEADER_ROW_COUNT));

  /** The row count `loadMore` last fired for, so one end of the list asks once. */
  #loadedFor: number | undefined;

  public constructor() {
    afterRenderEffect(() => {
      for (const part of this.rowParts()) {
        this.virtualizer.measureElement(part.element);
      }
    });
    // Arrow keys move the highlight; keep it in view inside the panel, never scrolling the page.
    afterRenderEffect(() => {
      const index = this.#activeIndex();
      if (index !== undefined) {
        untracked(() => {
          this.virtualizer.scrollToIndex(index, { align: 'auto' });
        });
      }
    });
    afterRenderEffect(() => {
      this.generation();
      untracked(() => {
        this.#loadedFor = undefined;
        this.virtualizer.scrollToOffset(0);
      });
    });
    // A finished load frees the end of the list to ask again, so a failed one is retried on the next scroll.
    afterRenderEffect(() => {
      if (!this.loadingMore()) {
        untracked(() => {
          this.#loadedFor = undefined;
        });
      }
    });
    afterRenderEffect(() => {
      const lastShown = this.virtualizer.range()?.endIndex;
      untracked(() => {
        this.#askForMore(lastShown);
      });
    });
  }

  protected rowAt(index: number): Row<TableFeatureSet, TRow> | undefined {
    return this.rows()[index];
  }

  protected reasonFor(row: Row<TableFeatureSet, TRow>): string | undefined {
    return this.reasonOf()(row.original);
  }

  #askForMore(lastShown: number | undefined): void {
    const count = this.rows().length;
    const near = lastShown !== undefined && lastShown >= count - 1 - LOAD_AHEAD;
    if (this.hasMore() && !this.busy() && near && this.#loadedFor !== count) {
      this.#loadedFor = count;
      this.loadMore.emit();
    }
  }
}
