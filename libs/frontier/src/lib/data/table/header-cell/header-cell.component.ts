import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import { FlexRender } from '@tanstack/angular-table';
import type { RowData } from '@tanstack/angular-table';

import { Button } from '../../../actions/button/button.component';
import { Icon } from '../../../icon/icon.component';
import type { TableHeader } from '../table-features';

const SORT_ICON = { asc: LucideChevronUp, desc: LucideChevronDown } as const;

/** One column header's content: its label, and a sort toggle when the column sorts. */
@Component({
  selector: 'fr-table-header-cell',
  imports: [Button, FlexRender, Icon],
  templateUrl: './header-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TableHeaderCell<TData extends RowData> {
  public readonly header = input.required<TableHeader<TData>>();

  protected readonly sortIcon = computed(() => {
    const sorted = this.header().column.getIsSorted();
    return sorted === false ? undefined : SORT_ICON[sorted];
  });
}
