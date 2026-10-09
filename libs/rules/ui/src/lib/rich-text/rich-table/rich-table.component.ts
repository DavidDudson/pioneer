import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Table, tableColumns, tableComponent } from '@pioneer/frontier/data';
import type { TableColumn } from '@pioneer/frontier/data';
import type { InlineContent, TableNode } from '@pioneer/rules/sdk';

import { RichInline } from '../rich-inline/rich-inline.component';
import { RichTextMessage } from '../rich-text-messages';

/** One row of a rich text table: its cells in column order. */
interface Row {
  readonly id: string;
  readonly cells: readonly InlineContent[];
}

function rowId(row: Row): string {
  return row.id;
}

const column = tableColumns<Row>();
const EMPTY: InlineContent = [];

function columnsFor(table: TableNode): readonly TableColumn<Row>[] {
  const width = Math.max(table.header?.length ?? 0, ...table.rows.map((cells) => cells.length));
  return Array.from({ length: width }, (_slot, index) =>
    column.display({
      id: String(index),
      header: () => tableComponent(RichInline, { inputs: { content: table.header?.[index] ?? EMPTY } }),
      cell: ({ row }) => tableComponent(RichInline, { inputs: { content: row.original.cells[index] ?? EMPTY } }),
    }),
  );
}

/** A table from content text. Unnamed tables get a generic accessible name, kept off the page. */
@Component({
  selector: 'pio-rich-table',
  imports: [Table],
  templateUrl: './rich-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTable {
  public readonly table = input.required<TableNode>();

  readonly #i18n = inject(TranslocoService);
  readonly #generic = toSignal(this.#i18n.selectTranslate<string>(RichTextMessage.Table), { initialValue: '' });
  protected readonly caption = computed((): string => this.table().caption ?? this.#generic());
  protected readonly hideCaption = computed((): boolean => this.table().caption === undefined);
  protected readonly columns = computed((): readonly TableColumn<Row>[] => columnsFor(this.table()));
  protected readonly rows = computed((): readonly Row[] =>
    this.table().rows.map((cells, index) => ({ id: String(index), cells })),
  );
  protected readonly rowId = rowId;
}
