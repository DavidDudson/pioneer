import type { PickerSort, TableColumn } from '@pioneer/frontier/data';
import { AreaValue, CastActions, DefenseValue, Rarity, TargetValue } from '@pioneer/rules/sdk';

import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { RARITY_TONES } from '../picker-cells/chip-list/chip-list.component';
import { ActionKind } from '../picker-cells/picker-cell-messages';
import { SpellTableSchema } from '../picker-cells/spell-table-schema';
import { TRADITION_MESSAGES } from '../spellcasting/spellcasting-messages';
import {
  AREA_MESSAGES,
  DEFENSE_MESSAGES,
  DURATION_MESSAGES,
  RANGE_MESSAGES,
  SPELL_RARITY_MESSAGES,
  SpellPickerMessage,
  TARGET_MESSAGES,
} from './spell-picker-messages';
import { SpellPickerColumn } from './spell-picker-row';
import type { SpellPickerRow } from './spell-picker-row';

/** Reads a message key in the active language. */
export type Say = (key: string) => string;

export const spellRowValue = (row: SpellPickerRow): string => row.id;
export const spellRowLabel = (row: SpellPickerRow): string => row.name;
export const spellRowDisabled = (row: SpellPickerRow): string | undefined => row.disabledReason;

/** What casting costs: one cost, a variable one when the caster picks, or a time counted in minutes or more. */
function castKind(cast: readonly CastActions[]): ActionKind {
  const [only] = cast;
  if (cast.length !== 1 || only === undefined) {
    return cast.length === 0 ? ActionKind.Passive : ActionKind.Variable;
  }
  return only === CastActions.Time ? ActionKind.Time : only;
}

/** The traits as chips, a spell above common rarity first and toned by it. */
function traitChips(row: SpellPickerRow, say: Say): readonly Chip[] {
  const traits = row.traits.map((label): Chip => ({ label }));
  if (row.rarity === Rarity.Common) {
    return traits;
  }
  return [{ label: say(SPELL_RARITY_MESSAGES[row.rarity]), tone: RARITY_TONES[row.rarity] }, ...traits];
}

/** The area when the spell has one, else who it targets. */
function areaOrTargets(row: SpellPickerRow, say: Say): readonly Chip[] {
  const labels =
    row.area === AreaValue.None
      ? row.targets.filter((target) => target !== TargetValue.None).map((target) => TARGET_MESSAGES[target])
      : [AREA_MESSAGES[row.area]];
  return labels.map((key): Chip => ({ label: say(key) }));
}

/** What it is rolled against; nothing when it is not. */
function defenseChips(row: SpellPickerRow, say: Say): readonly Chip[] {
  return row.defense
    .filter((defense) => defense !== DefenseValue.None)
    .map((defense): Chip => ({ label: say(DEFENSE_MESSAGES[defense]) }));
}

/** What identifies the spell and how it is cast: name, rank, traditions and cast cost. */
function castingColumns(schema: SpellTableSchema<SpellPickerRow>, say: Say): SpellTableSchema<SpellPickerRow> {
  return schema
    .addText({
      id: SpellPickerColumn.Name,
      header: say(SpellPickerMessage.Name),
      value: (row) => row.name,
      width: 'md',
    })
    .addRank({
      id: SpellPickerColumn.Rank,
      header: say(SpellPickerMessage.Rank),
      value: (row) => row.rank,
      cantrip: (row) => row.cantrip,
      heightenedTo: (row) => row.heightenedTo,
      width: 'sm',
    })
    .addTraditions({
      id: 'traditions',
      header: say(SpellPickerMessage.Traditions),
      sortable: false,
      value: (row) => row.traditions.map((tradition): Chip => ({ label: say(TRADITION_MESSAGES[tradition]) })),
      width: 'sm',
    })
    .addActions({
      id: 'cast',
      header: say(SpellPickerMessage.Cast),
      sortable: false,
      value: (row) => castKind(row.cast),
      width: 'sm',
    });
}

/** What the spell reaches and does: range, area or targets, duration and save; then traits and source. */
function effectColumns(schema: SpellTableSchema<SpellPickerRow>, say: Say): SpellTableSchema<SpellPickerRow> {
  return schema
    .addFacts({
      id: 'range',
      header: say(SpellPickerMessage.Range),
      sortable: false,
      value: (row) => row.range.map((band): Chip => ({ label: say(RANGE_MESSAGES[band]) })),
      width: 'sm',
    })
    .addFacts({
      id: 'areaTargets',
      header: say(SpellPickerMessage.AreaTargets),
      sortable: false,
      value: (row) => areaOrTargets(row, say),
      width: 'sm',
    })
    .addFacts({
      id: 'duration',
      header: say(SpellPickerMessage.Duration),
      sortable: false,
      value: (row) => row.duration.map((duration): Chip => ({ label: say(DURATION_MESSAGES[duration]) })),
      width: 'sm',
    })
    .addFacts({
      id: 'save',
      header: say(SpellPickerMessage.Save),
      sortable: false,
      value: (row) => defenseChips(row, say),
      width: 'sm',
    })
    .addTraits({
      id: 'traits',
      header: say(SpellPickerMessage.Traits),
      sortable: false,
      value: (row) => traitChips(row, say),
      width: 'md',
    })
    .addSource({
      id: 'source',
      header: say(SpellPickerMessage.Source),
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    });
}

/** The columns of a spell picker, each fact to choose by a rich cell. */
export function spellPickerColumns(say: Say): readonly TableColumn<SpellPickerRow>[] {
  return effectColumns(castingColumns(new SpellTableSchema<SpellPickerRow>(), say), say).build();
}

/** Cantrips sort before rank 1. */
const sortRank = (row: SpellPickerRow): number => (row.cantrip ? 0 : row.rank);

function compare(left: SpellPickerRow, right: SpellPickerRow, sort: PickerSort): number {
  const order =
    sort.column === SpellPickerColumn.Rank
      ? sortRank(left) - sortRank(right)
      : left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  return sort.descending ? -order : order;
}

/** The rows whose name holds `query`, in the order asked for: by name or rank. */
export function shownSpellRows(
  rows: readonly SpellPickerRow[],
  query: string,
  sort: PickerSort | undefined,
): readonly SpellPickerRow[] {
  const needle = query.trim().toLocaleLowerCase();
  const matching = rows.filter((row) => row.name.toLocaleLowerCase().includes(needle));
  return sort === undefined ? matching : matching.toSorted((left, right) => compare(left, right, sort));
}
