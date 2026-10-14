import type { PickerSort, TableColumn } from '@pioneer/frontier/data';

import { chips, shownBy } from '../origin-picker/origin-picker-table';
import type { NamedRow, Say, ShownRows } from '../origin-picker/origin-picker-table';
import { OriginTableSchema } from '../picker-cells/origin-table-schema';
import { ClassPickerMessage } from './class-picker-messages';
import { ClassPickerColumn } from './class-picker-row';
import type { ClassPickerRow, KeyAttributePickerRow, SubclassPickerRow } from './class-picker-row';

/** A modifier with its sign, in the active language: +3, 0, -1. */
const SIGNED = new Intl.NumberFormat(undefined, { signDisplay: 'exceptZero' });

/** The name column every class picker starts with. */
function withName<TRow extends NamedRow>(schema: OriginTableSchema<TRow>, say: Say): OriginTableSchema<TRow> {
  return schema.addText({
    id: ClassPickerColumn.Name,
    header: say(ClassPickerMessage.Name),
    value: (row) => row.name,
    width: 'md',
  });
}

/** What a class is: its name, key attribute, hit points and skills. */
function bodyColumns(say: Say): OriginTableSchema<ClassPickerRow> {
  return withName(new OriginTableSchema<ClassPickerRow>(), say)
    .addBoosts({
      id: 'keyAttribute',
      header: say(ClassPickerMessage.KeyAttribute),
      sortable: false,
      value: (row) => [row.keyAttribute],
      width: 'md',
    })
    .addFacts({
      id: ClassPickerColumn.HitPoints,
      header: say(ClassPickerMessage.HitPoints),
      value: (row) => chips([say(ClassPickerMessage.HitPointsValue, { value: row.hitPoints })]),
      width: 'sm',
    })
    .addFacts({
      id: 'skills',
      header: say(ClassPickerMessage.Skills),
      sortable: false,
      value: (row) => chips([...row.skills, say(ClassPickerMessage.AdditionalSkills, { count: row.additionalSkills })]),
      width: 'md',
    });
}

/** The columns of a class picker: what it is, then its tradition and starting ranks, then where it comes from. */
export function classPickerColumns(say: Say): readonly TableColumn<ClassPickerRow>[] {
  return bodyColumns(say)
    .addFacts({
      id: 'tradition',
      header: say(ClassPickerMessage.Tradition),
      sortable: false,
      value: (row) => chips(row.traditions),
      width: 'sm',
    })
    .addFacts({
      id: 'proficiencies',
      header: say(ClassPickerMessage.Proficiencies),
      sortable: false,
      value: (row) => chips(row.proficiencies),
      width: 'lg',
    })
    .addFacts({
      id: 'notes',
      header: say(ClassPickerMessage.Notes),
      sortable: false,
      value: (row) => chips(row.note === undefined ? [] : [row.note]),
      width: 'md',
    })
    .addSource({
      id: 'source',
      header: say(ClassPickerMessage.Source),
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    })
    .build();
}

/** The columns of a subclass picker: what it grants. */
export function subclassPickerColumns(say: Say): readonly TableColumn<SubclassPickerRow>[] {
  return withName(new OriginTableSchema<SubclassPickerRow>(), say)
    .addSummary({
      id: 'summary',
      header: say(ClassPickerMessage.Summary),
      sortable: false,
      value: (row) => row.summary,
      width: 'lg',
    })
    .addFacts({
      id: 'notes',
      header: say(ClassPickerMessage.Notes),
      sortable: false,
      value: (row) => chips(row.note === undefined ? [] : [row.note]),
      width: 'md',
    })
    .addSource({
      id: 'source',
      header: say(ClassPickerMessage.Source),
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    })
    .build();
}

/** The columns of a key attribute picker: the attribute, then the character's modifier and score in it. */
export function keyAttributePickerColumns(say: Say): readonly TableColumn<KeyAttributePickerRow>[] {
  return withName(new OriginTableSchema<KeyAttributePickerRow>(), say)
    .addFacts({
      id: ClassPickerColumn.Modifier,
      header: say(ClassPickerMessage.Modifier),
      value: (row) => chips([SIGNED.format(row.modifier)]),
      width: 'sm',
    })
    .addFacts({
      id: 'score',
      header: say(ClassPickerMessage.Score),
      sortable: false,
      value: (row) => chips([String(row.score)]),
      width: 'sm',
    })
    .build();
}

/** How a class orders by a column: its hit points, then name. */
function classOrder(left: ClassPickerRow, right: ClassPickerRow, sort: PickerSort): number {
  return sort.column === ClassPickerColumn.HitPoints ? left.hitPoints - right.hitPoints : 0;
}

/** How a key attribute orders by a column: the character's modifier, then name. */
function keyAttributeOrder(left: KeyAttributePickerRow, right: KeyAttributePickerRow, sort: PickerSort): number {
  return sort.column === ClassPickerColumn.Modifier ? left.modifier - right.modifier : 0;
}

/** The classes whose name holds `query`, by name or hit points when asked. */
export const shownClassRows: ShownRows<ClassPickerRow> = shownBy(classOrder);

/** The subclasses whose name holds `query`, by name when asked. */
export const shownSubclassRows: ShownRows<SubclassPickerRow> = shownBy(() => 0);

/** The key attributes whose name holds `query`, by name or modifier when asked. */
export const shownKeyAttributeRows: ShownRows<KeyAttributePickerRow> = shownBy(keyAttributeOrder);
