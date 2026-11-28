import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FlexRender } from '@tanstack/angular-table';
import type { RowData } from '@tanstack/angular-table';
import { cva } from 'class-variance-authority';
import { ChevronDown, ChevronUp } from 'lucide';

import { Button } from '../../../actions/button/button.component';
import { Icon } from '../../../icon/icon.component';
import { injectTranslate } from '../../../locale/inject-translate';
import { HEADER_KEY } from '../table-features';
import type { TableHeader } from '../table-features';

const rankClasses = cva('text-caption text-fg-muted')();
const hiddenClasses = cva('sr-only')();

const SORT_ICON = { asc: ChevronUp, desc: ChevronDown } as const;

/** One column header's content: its label, and a sort toggle when the column sorts. */
@Component({
  selector: 'fr-table-header-cell',
  imports: [Button, FlexRender, Icon, NgTemplateOutlet],
  templateUrl: './header-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TableHeaderCell<TData extends RowData> {
  public readonly header = input.required<TableHeader<TData>>();
  /** How many columns the table sorts by. */
  public readonly sortCount = input(0);

  readonly #translate = injectTranslate();

  /** A string header is a message key, translated so a language switch re-renders it. */
  protected readonly label = computed(() => {
    const { header } = this.header().column.columnDef;

    const parsed = HEADER_KEY.safeParse(header);

    return parsed.success ? this.#translate()(parsed.data) : undefined;
  });

  protected readonly sortIcon = computed(() => {
    const sorted = this.header().column.getIsSorted();

    return sorted === false ? undefined : SORT_ICON[sorted];
  });

  /** This column's place in the sort, from 1, shown only while more than one column sorts. */
  protected readonly rank = computed(() => {
    const { column } = this.header();

    return this.sortCount() > 1 && column.getIsSorted() !== false ? column.getSortIndex() + 1 : undefined;
  });

  protected readonly rankClasses = rankClasses;
  protected readonly hiddenClasses = hiddenClasses;
  /** Says what the rank digit means to a screen reader. */
  protected readonly rankLabel = computed(() => {
    const place = this.rank();

    return place === undefined ? '' : this.#translate()('frontier.table.sortRank', { rank: place });
  });

  /** Shift adds the column to the sort; a plain press sorts by it alone. */
  protected sort(press: MouseEvent): void {
    this.header().column.toggleSorting(undefined, press.shiftKey);
  }
}
