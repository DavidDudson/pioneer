import type { TableColumn } from '@pioneer/frontier/data';
import { RulesTableSchema } from '@pioneer/rules/ui';

import { BrowseColumn, BrowseColumnCode } from './browse-row';
import type { BrowseRow } from './browse-row';

/** The message key of each column's header, spelled out in full so the key check sees them. */
const ColumnMessage = {
  Name: 'content.column.name',
  Kind: 'content.column.kind',
  Level: 'content.column.level',
  Traits: 'content.column.traits',
  Source: 'content.column.source',
} as const;

/**
 * The list's table columns. Every column but the name can be hidden; the kind starts hidden when the list holds one
 * kind, where it says the same on every row.
 */
export function browseColumns(say: (key: string) => string, kindHidden: boolean): readonly TableColumn<BrowseRow>[] {
  return new RulesTableSchema<BrowseRow>()
    .addEntryName({
      id: BrowseColumn.Name,
      code: BrowseColumnCode.Name,
      header: say(ColumnMessage.Name),
      value: (row) => row.name,
      to: (row) => row.to,
      entry: (row) => row.entry,
    })
    .addText({
      id: BrowseColumn.Kind,
      code: BrowseColumnCode.Kind,
      header: say(ColumnMessage.Kind),
      value: (row) => row.kind,
      hideable: true,
      defaultHidden: kindHidden,
    })
    .addText({
      id: BrowseColumn.Level,
      code: BrowseColumnCode.Level,
      header: say(ColumnMessage.Level),
      value: (row) => row.level,
      sortable: false,
      hideable: true,
    })
    .addTraits({
      id: BrowseColumn.Traits,
      code: BrowseColumnCode.Traits,
      header: say(ColumnMessage.Traits),
      value: (row) => row.traits,
      hideable: true,
    })
    .addSource({
      id: BrowseColumn.Source,
      code: BrowseColumnCode.Source,
      header: say(ColumnMessage.Source),
      value: (row) => row.sources,
      hideable: true,
    })
    .build();
}
