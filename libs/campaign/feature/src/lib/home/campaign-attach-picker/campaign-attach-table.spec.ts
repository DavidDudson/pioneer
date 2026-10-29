import { describe, expect, it } from 'vitest';

import { shownAttachRows } from './campaign-attach-table';
import type { AttachRow } from './campaign-attach-table';

const rows: readonly AttachRow[] = [
  { characterId: 'c1', name: 'Merisiel', ancestry: 'Elf', class: 'Rogue', level: 3 },
  { characterId: 'c2', name: 'Amiri', ancestry: 'Human', class: 'Barbarian', level: 10 },
  { characterId: 'c3', name: 'Kyra', ancestry: 'Human', class: 'Cleric', level: 3 },
];

const ids = (shown: readonly AttachRow[]): readonly string[] => shown.map((row) => row.characterId);

describe(shownAttachRows, () => {
  it('keeps the given order when no sort is asked for', () => {
    expect(ids(shownAttachRows(rows, '', undefined))).toStrictEqual(['c1', 'c2', 'c3']);
  });

  it('matches the name, ancestry or class, ignoring case', () => {
    expect(ids(shownAttachRows(rows, 'human', undefined))).toStrictEqual(['c2', 'c3']);
    expect(ids(shownAttachRows(rows, ' ROGUE', undefined))).toStrictEqual(['c1']);
  });

  it('is empty when nothing matches', () => {
    expect(shownAttachRows(rows, 'wizard', undefined)).toStrictEqual([]);
  });

  it('orders levels as numbers, not text, with the name settling ties', () => {
    expect(ids(shownAttachRows(rows, '', { column: 'level', descending: false }))).toStrictEqual(['c3', 'c1', 'c2']);
    expect(ids(shownAttachRows(rows, '', { column: 'level', descending: true }))).toStrictEqual(['c2', 'c1', 'c3']);
  });

  it('ignores a column it does not know', () => {
    expect(ids(shownAttachRows(rows, '', { column: 'nope', descending: false }))).toStrictEqual(['c1', 'c2', 'c3']);
  });
});
