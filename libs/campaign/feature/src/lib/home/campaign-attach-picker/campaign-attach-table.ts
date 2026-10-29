import type { OwnedCharacter } from '@pioneer/campaign/domain';
import type { PickerSort, TableColumn } from '@pioneer/frontier/data';
import { RulesTableSchema } from '@pioneer/rules/ui';

/** What a column header says, in the active language. */
export interface AttachHeaders {
  readonly name: string;
  readonly ancestry: string;
  readonly class: string;
  readonly level: string;
}

/** One character to attach, with its ancestry and class named; empty while the content loads or the slot is unpicked. */
export interface AttachRow {
  readonly characterId: string;
  readonly name: string;
  readonly ancestry: string;
  readonly class: string;
  readonly level: number;
}

/** The rows of `characters`, their ancestry and class named by `nameOf`. */
export function attachRows(
  characters: readonly OwnedCharacter[],
  nameOf: (id: string | undefined) => string,
): readonly AttachRow[] {
  return characters.map((character) => ({
    characterId: character.characterId,
    name: character.name,
    ancestry: nameOf(character.ancestry),
    class: nameOf(character.class),
    level: character.level,
  }));
}

const columnValue: Readonly<Record<string, (row: AttachRow) => number | string>> = {
  name: (row) => row.name,
  ancestry: (row) => row.ancestry,
  class: (row) => row.class,
  level: (row) => row.level,
};

/** The rows whose name, ancestry or class hold `query`, in the order asked for, then by name. */
export function shownAttachRows(
  rows: readonly AttachRow[],
  query: string,
  sort: PickerSort | undefined,
): readonly AttachRow[] {
  const needle = query.trim().toLocaleLowerCase();
  const matching = rows.filter((row) =>
    `${row.name} ${row.ancestry} ${row.class}`.toLocaleLowerCase().includes(needle),
  );
  const value = columnValue[sort?.column ?? ''];
  if (sort === undefined || value === undefined) {
    return matching;
  }
  return matching.toSorted((left, right) => {
    const leftValue = value(left);
    const rightValue = value(right);
    const order =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));
    return (order || left.name.localeCompare(right.name)) * (sort.descending ? -1 : 1);
  });
}

/** The columns of the attach picker: the character, its ancestry and class as chips, and its level. */
export function attachColumns(headers: AttachHeaders): readonly TableColumn<AttachRow>[] {
  return new RulesTableSchema<AttachRow>()
    .addText({ id: 'name', header: headers.name, value: (row) => row.name, width: 'md' })
    .addTag({ id: 'ancestry', header: headers.ancestry, value: (row) => ({ label: row.ancestry }), width: 'sm' })
    .addTag({ id: 'class', header: headers.class, value: (row) => ({ label: row.class }), width: 'sm' })
    .addLevel({ id: 'level', header: headers.level, value: (row) => row.level, width: 'sm' })
    .build();
}

export const attachValue = (row: AttachRow): string => row.characterId;
export const attachLabel = (row: AttachRow): string => row.name;
