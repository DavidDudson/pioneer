import { EngineMessage } from '@pioneer/rules/engine';
import { PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { checkStatistics, EXAMPLE_STATISTIC_INPUTS, StatisticsStatus } from './statistics-check';

/** A statistic derived once per `per`, with no domains. */
const perSource = (selector: string, per: string, base: string): object => ({
  slug: selector,
  name: selector,
  selector,
  domains: [],
  base,
  kind: 'check',
  per,
});

describe('checkStatistics per source', () => {
  it('shows each weapon’s and entry’s instance under its family, with a caret into the family’s base', () => {
    const result = checkStatistics(
      {
        definitions: JSON.stringify([
          perSource('strike', 'weapon', '@weapon.attr + @weapon.prof + @weapon.potency'),
          perSource('spell-dc', 'spellcasting', '10 + @stat.spell-attack'),
        ]),
        inputs: EXAMPLE_STATISTIC_INPUTS,
        rules: '[]',
        overrides: '[]',
        facts: '',
      },
      { table: PLAYER_CORE_PROFICIENCY_BONUS, variant: undefined },
    );
    expect(result).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        {
          ok: true,
          selector: 'strike:dagger',
          total: 11,
          terms: [{ code: '@weapon.attr' }, { code: '+ @weapon.prof' }, { code: '+ @weapon.potency' }],
        },
        { ok: true, selector: 'strike:longsword', total: 12 },
        {
          ok: false,
          selector: 'spell-dc:arcane',
          error: { key: EngineMessage.MissingStatistic },
          pointer: '10 + @stat.spell-attack\n     ^',
        },
      ],
    });
  });
});
