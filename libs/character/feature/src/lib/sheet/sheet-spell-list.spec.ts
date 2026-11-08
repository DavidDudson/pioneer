import { signal } from '@angular/core';
import { TargetValue } from '@pioneer/rules/sdk';
import type { FocusLine, InnateLine, SpellDetailLine, SpellRowLine } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { sheetSpellList } from './sheet-spell-list';
import type { PreparedEntryFields } from './sheet-spell-picks';
import { SpellTargetFilter } from './sheet-spell-targets';

interface Spell {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly targetValues?: readonly TargetValue[];
}

function detail({ id, name, source, targetValues = [] }: Spell): SpellDetailLine {
  return { id, name, rank: 1, source, targetValues } as unknown as SpellDetailLine;
}

function focusOf(...spells: readonly SpellDetailLine[]): FocusLine {
  return {
    entries: [{ key: 'focus', spells: spells.map((each) => ({ key: each.id, detail: each })) }],
  } as unknown as FocusLine;
}

function innateOf(...spells: readonly SpellDetailLine[]): InnateLine {
  return {
    entries: [{ key: 'innate', spells: spells.map((each) => ({ key: each.id, detail: each })) }],
  } as unknown as InnateLine;
}

/** A prepared entry with a slot per spell; `undefined` is an empty slot. */
function preparedOf(...slots: readonly (SpellDetailLine | undefined)[]): readonly PreparedEntryFields[] {
  return [
    {
      key: 'prepared',
      ranks: [
        {
          key: 'rank',
          fields: slots.map((each, index) => ({
            key: `slot-${index}`,
            detail: signal(each),
            use: signal(undefined),
          })),
        },
      ],
    },
  ] as unknown as readonly PreparedEntryFields[];
}

function namesOf(lines: readonly SpellRowLine[]): string[] {
  return lines.map(({ detail: line }) => `${line.name} (${line.source})`);
}

describe(sheetSpellList, () => {
  it('lists the spells of every origin in one list, alphabetical by name', () => {
    const lines = sheetSpellList(
      {
        focus: focusOf(detail({ id: 'inspire', name: 'Inspire Courage', source: 'Composition' })),
        innate: innateOf(detail({ id: 'light', name: 'Light', source: 'Ancestry' })),
        prepared: preparedOf(detail({ id: 'daze', name: 'Daze', source: 'Cleric' })),
      },
      SpellTargetFilter.All,
    );

    expect(namesOf(lines)).toStrictEqual(['Daze (Cleric)', 'Inspire Courage (Composition)', 'Light (Ancestry)']);
  });

  it('lists a spell known from two sources once per source, ordered by source', () => {
    const lines = sheetSpellList(
      {
        focus: undefined,
        innate: innateOf(detail({ id: 'heal', name: 'Heal', source: 'Ancestry' })),
        prepared: preparedOf(detail({ id: 'heal', name: 'Heal', source: 'Cleric' })),
      },
      SpellTargetFilter.All,
    );

    expect(namesOf(lines)).toStrictEqual(['Heal (Ancestry)', 'Heal (Cleric)']);
  });

  it('lists a spell prepared twice from one source once', () => {
    const lines = sheetSpellList(
      {
        focus: undefined,
        innate: undefined,
        prepared: preparedOf(
          detail({ id: 'heal', name: 'Heal', source: 'Cleric' }),
          detail({ id: 'heal', name: 'Heal', source: 'Cleric' }),
        ),
      },
      SpellTargetFilter.All,
    );

    expect(namesOf(lines)).toStrictEqual(['Heal (Cleric)']);
  });

  it('leaves out a prepared slot with no spell yet', () => {
    const lines = sheetSpellList(
      {
        focus: undefined,
        innate: undefined,
        prepared: preparedOf(undefined, detail({ id: 'daze', name: 'Daze', source: 'Cleric' })),
      },
      SpellTargetFilter.All,
    );

    expect(namesOf(lines)).toStrictEqual(['Daze (Cleric)']);
  });

  it('keeps only the spells that pass the target filter', () => {
    const lines = sheetSpellList(
      {
        focus: undefined,
        innate: undefined,
        prepared: preparedOf(
          detail({ id: 'daze', name: 'Daze', source: 'Cleric', targetValues: [TargetValue.Single] }),
          detail({ id: 'burst', name: 'Burst', source: 'Cleric', targetValues: [TargetValue.Multiple] }),
        ),
      },
      SpellTargetFilter.Multiple,
    );

    expect(namesOf(lines)).toStrictEqual(['Burst (Cleric)']);
  });
});
