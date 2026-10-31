import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePackageSearch } from '@lucide/angular';
import { Button, ButtonVariant, EmptyState, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { Table } from '@pioneer/frontier/data';
import type { TableColumn, TableViewSort } from '@pioneer/frontier/data';

import type { BrowseRow } from '../browse-row';
import type { ContentBrowserList } from '../browser-list';
import type { ContentEntryRef } from '../browser-state';
import { LegacyBadge } from '../legacy-badge/legacy-badge.component';

const RowsMessage = {
  Caption: 'contentBrowser.list.caption',
  Count: 'contentBrowser.list.count',
  More: 'contentBrowser.list.more',
  EmptyTitle: 'contentBrowser.list.emptyTitle',
  EmptyDescription: 'contentBrowser.list.emptyDescription',
  SearchEmptyDescription: 'contentBrowser.list.searchEmptyDescription',
} as const;

const rowId = (row: BrowseRow): string => row.id;

/**
 * The entries a list holds: a table with sorting and a column chooser where there is room, a compact list of names that
 * pick the entry in place where there is not. Either way the count, the empty note and "Show more" are the same.
 */
@Component({
  selector: 'pio-browser-rows',
  imports: [Button, EmptyState, LegacyBadge, List, ListItem, Stack, Table, Text, TranslocoPipe],
  templateUrl: './browser-rows.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowserRows {
  public readonly list = input.required<ContentBrowserList>();
  public readonly columns = input.required<readonly TableColumn<BrowseRow>[]>();
  /** A table with its column chooser, rather than the compact list. */
  public readonly table = input.required<boolean>();
  public readonly sorting = model<readonly TableViewSort[]>([]);
  /** The hidden column ids; `undefined` is each column's default. */
  public readonly hidden = model<readonly string[] | undefined>(undefined);
  /** More of the entries were asked for. */
  public readonly more = output();
  /** A name in the compact list was pressed. */
  public readonly picked = output<ContentEntryRef>();

  protected readonly Message = RowsMessage;
  protected readonly Variant = ButtonVariant;
  protected readonly emptyIcon = LucidePackageSearch;
  protected readonly rowId = rowId;
  protected readonly hasMore = computed(() => this.list().rows.length < this.list().total);
}
