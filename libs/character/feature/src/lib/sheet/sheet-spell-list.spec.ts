import { signal } from '@angular/core';
import { MagicTradition, SpellPreparation, TargetValue } from '@pioneer/rules/sdk';
import type { SpellDetailLine, SpellRowLine } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { spellLine } from '../testing/spell-line-testing';
import { NO_SPELL_FILTER, SpellFilterGroupId } from './sheet-spell-filter';
import { sheetSpellList } from './sheet-spell-list';
import type { SpellOrigins } from './sheet-spell-list';

interface Spell {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly targetValues?: readonly TargetValue[];
}

function detail({ id, name, source, targetValues }: Spell): SpellDetailLine {
  return spellLine({ slug: id, name, source, targets: targetValues });
}

function focusOf(...spells: readonly SpellDetailLine[]): SpellOrigins['focus'] {
  return { entries: [{ key: 'focus', spells: spells.map((each) => ({ key: each.name, detail: each })) }] };
}

function innateOf(...spells: readonly SpellDetailLine[]): SpellOrigins['innate'] {
  return { entries: [{ key: 'innate', spells: spells.map((each) => ({ key: each.name, detail: each })) }] };
}

/** A prepared entry with a slot per spell; `undefined` is an empty slot. */
function preparedOf(...slots: readonly (SpellDetailLine | undefined)[]): SpellOrigins['prepared'] {
  return [
    {
      preparation: SpellPreparation.Prepared,
      tradition: MagicTradition.Divine,
      ranks: [
        {
          fields: slots.map((each, index) => ({
            key: `slot-${index}`,
            detail: signal(each),
            use: signal(undefined),
          })),
        },
      ],
    },
  ];
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
      NO_SPELL_FILTER,
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
      NO_SPELL_FILTER,
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
      NO_SPELL_FILTER,
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
      NO_SPELL_FILTER,
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
      new Map([[SpellFilterGroupId.Target, new Set([TargetValue.Multiple])]]),
    );

    expect(namesOf(lines)).toStrictEqual(['Burst (Cleric)']);
  });
});
