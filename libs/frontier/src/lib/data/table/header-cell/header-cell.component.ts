import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FlexRender } from '@tanstack/angular-table';
import type { RowData } from '@tanstack/angular-table';
import { ChevronDown, ChevronUp } from 'lucide';

import { Button } from '../../../actions/button/button.component';
import { Icon } from '../../../icon/icon.component';
import { injectTranslate } from '../../../locale/inject-translate';
import { HEADER_KEY } from '../table-features';
import type { TableHeader } from '../table-features';

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
}
