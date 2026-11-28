import { GridCell, GridRow } from '@angular/aria/grid';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { FlexRender } from '@tanstack/angular-table';
import type { Cell, Row } from '@tanstack/angular-table';

import type { TableFeatureSet } from '../../data/table/table-features';
import { uniqueId } from '../../ids';
import { Size } from '../../tokens';
import { pickerCellVariants, pickerDisabledReasonClasses } from './picker.variants';

function cellClasses<TRow extends object>(cell: Cell<TableFeatureSet, TRow>): string {
  return pickerCellVariants({ width: cell.column.columnDef.meta?.width ?? Size.Md });
}

/**
 * One row of an open `fr-picker`: a grid row of the schema's cells, placed by the virtualizer. Pressing a cell, or
 * Enter on the highlight, picks the row, unless `reason` says why it can't be: the row is still reached by the
 * arrow keys, and the reason is read out with every cell.
 */
@Component({
  selector: 'fr-picker-row',
  imports: [FlexRender, GridCell],
  templateUrl: './picker-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'absolute top-none start-none flex w-max min-w-full border-b border-line-subtle cursor-pointer',
  },
  hostDirectives: [{ directive: GridRow, inputs: ['rowIndex'] }],
})
export class PickerRow<TRow extends object> {
  public readonly row = input.required<Row<TableFeatureSet, TRow>>();
  /** The row is the picked one. */
  public readonly picked = input(false, { transform: booleanAttribute });
  /** Why the row can't be picked, already translated. */
  public readonly reason = input<string | undefined>(undefined);
  /** The row was pressed, or chosen with Enter. */
  public readonly chosen = output();

  protected readonly cellClasses = cellClasses<TRow>;
  protected readonly reasonClasses = pickerDisabledReasonClasses;
  protected readonly pickable = computed(() => this.reason() === undefined);
  protected readonly reasonId = uniqueId('fr-picker-reason');
  protected readonly describedBy = computed(() => (this.pickable() ? undefined : this.reasonId));

  private readonly cells = viewChildren(GridCell);
  /** A cell of the row is the keyboard's highlight. */
  public readonly active = computed(() => this.cells().some((cell) => cell.active()));
}
