import type { PickerSort, TableColumn } from '@pioneer/frontier/data';

import { DEITY_DOMAIN_MESSAGES, DIVINE_FONT_MESSAGES, sanctificationMessage } from '../deity/deity-messages';
import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { DeityTableSchema } from '../picker-cells/deity-table-schema';
import { DeityPickerMessage } from './deity-picker-messages';
import { DeityPickerColumn } from './deity-picker-row';
import type { DeityPickerRow } from './deity-picker-row';

/** Reads a message key in the active language. */
export type Say = (key: string) => string;

export const deityRowValue = (row: DeityPickerRow): string => row.id;
export const deityRowLabel = (row: DeityPickerRow): string => row.name;
export const deityRowDisabled = (row: DeityPickerRow): string | undefined => row.disabledReason;

const chips = (labels: ReadonlyArray<string>): ReadonlyArray<Chip> => labels.map((label): Chip => ({ label }));

/** What identifies the deity and what it grants a cleric: name, sanctification, divine font and domains. */
function grantColumns(schema: DeityTableSchema<DeityPickerRow>, say: Say): DeityTableSchema<DeityPickerRow> {
  return schema
    .addText({
      id: DeityPickerColumn.Name,
      header: DeityPickerMessage.Name,
      value: (row) => row.name,
      width: 'md',
    })
    .addFacts({
      id: 'sanctification',
      header: DeityPickerMessage.Sanctification,
      sortable: false,
      value: (row) => (row.sanctification === undefined ? [] : chips([say(sanctificationMessage(row.sanctification))])),
      width: 'sm',
    })
    .addFacts({
      id: 'font',
      header: DeityPickerMessage.Font,
      sortable: false,
      value: (row) => chips(row.fonts.map((font) => say(DIVINE_FONT_MESSAGES[font]))),
      width: 'sm',
    })
    .addFacts({
      id: 'domains',
      header: DeityPickerMessage.Domains,
      sortable: false,
      value: (row) => chips(row.domains.map((domain) => say(DEITY_DOMAIN_MESSAGES[domain]))),
      width: 'md',
    });
}

/** What a follower takes up and lives by: favoured weapon, divine skill, edicts and anathema, then the source. */
function followerColumns(schema: DeityTableSchema<DeityPickerRow>): DeityTableSchema<DeityPickerRow> {
  return schema
    .addFacts({
      id: 'favoredWeapon',
      header: DeityPickerMessage.FavoredWeapon,
      sortable: false,
      value: (row) => chips(row.favoredWeapons),
      width: 'sm',
    })
    .addFacts({
      id: 'skill',
      header: DeityPickerMessage.Skill,
      sortable: false,
      value: (row) => chips(row.skills),
      width: 'sm',
    })
    .addSummary({
      id: 'edictsAnathema',
      header: DeityPickerMessage.EdictsAnathema,
      value: (row) => row.description,
      width: 'lg',
    })
    .addSource({
      id: 'source',
      header: DeityPickerMessage.Source,
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    });
}

/** The columns of a deity picker, each fact to choose by a rich cell. */
export function deityPickerColumns(say: Say): ReadonlyArray<TableColumn<DeityPickerRow>> {
  return followerColumns(grantColumns(new DeityTableSchema<DeityPickerRow>(), say)).build();
}

/** The rows whose name holds `query`, by name when asked; unsorted, the row that picks no deity stays first. */
export function shownDeityRows(
  rows: ReadonlyArray<DeityPickerRow>,
  query: string,
  sort: PickerSort | undefined,
): ReadonlyArray<DeityPickerRow> {
  const needle = query.trim().toLocaleLowerCase();
  const matching = rows.filter((row) => row.name.toLocaleLowerCase().includes(needle));

  if (sort === undefined) {
    return matching;
  }

  return matching.toSorted((left, right) => {
    const order = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

    return sort.descending ? -order : order;
  });
}
