import { EngineMessage } from '@pioneer/rules/engine';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { checkStatistics, EXAMPLE_STATISTIC_INPUTS, StatisticsStatus } from './statistics-check';
import type { StatisticsCheck } from './statistics-check';

/** A statistic derived once per `per`, with no domains. */
const perSource = (selector: string, per: string, base: string): object => ({
  slug: `statistic:${selector.replaceAll(':', '-')}`,
  name: selector,
  selector,
  domains: [],
  base,
  kind: 'check',
  per,
});

/** The statistics tool on `definitions`, the example inputs and no rule elements. */
function check(definitions: readonly object[]): StatisticsCheck {
  const texts = { inputs: EXAMPLE_STATISTIC_INPUTS, rules: '[]', overrides: '[]', facts: '' };
  return checkStatistics(
    { definitions: JSON.stringify(definitions), ...texts },
    { table: PLAYER_CORE_PROFICIENCY_BONUS, variant: undefined },
    CORE_NAMESPACES,
  );
}

describe('checkStatistics per source', () => {
  it('shows an instance a later family wins under the family, with its base, not under the earlier plain one', () => {
    const plain = {
      ...perSource('strike:longsword', 'weapon', '@level'),
      slug: 'statistic:plain-strike',
      per: undefined,
    };
    const strike = perSource('strike', 'weapon', '@weapon.attr + @weapon.prof');
    expect(check([plain, strike])).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        { selector: 'strike:dagger' },
        { selector: 'strike:longsword', total: 12, statistic: { base: [{ formula: '@weapon.attr' }, {}] } },
      ],
    });
  });

  it('shows a plain statistic that shares the family’s prefix once, under its own definition', () => {
    const custom = {
      ...perSource('strike:custom', 'weapon', '@level'),
      slug: 'statistic:custom-strike',
      per: undefined,
    };
    const result = checkStatistics(
      {
        definitions: JSON.stringify([perSource('strike', 'weapon', '@weapon.attr'), custom]),
        inputs: EXAMPLE_STATISTIC_INPUTS,
        rules: '[]',
        overrides: '[]',
        facts: '',
      },
      { table: PLAYER_CORE_PROFICIENCY_BONUS, variant: undefined },
      CORE_NAMESPACES,
    );
    expect(result).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [{ selector: 'strike:dagger' }, { selector: 'strike:longsword' }, { selector: 'strike:custom', total: 3 }],
    });
  });

  it('shows each weapon’s and entry’s instance under its family, with a caret into the family’s base', () => {
    const result = checkStatistics(
      {
        definitions: JSON.stringify([
          perSource('strike', 'weapon', '@weapon.attr + @weapon.prof'),
          perSource('spell-dc', 'spellcasting', '10 + @stat.spell-attack'),
        ]),
        inputs: EXAMPLE_STATISTIC_INPUTS,
        rules: '[]',
        overrides: '[]',
        facts: '',
      },
      { table: PLAYER_CORE_PROFICIENCY_BONUS, variant: undefined },
      CORE_NAMESPACES,
    );
    expect(result).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        {
          ok: true,
          selector: 'strike:dagger',
          total: 11,
          statistic: { base: [{ formula: '@weapon.attr' }, { formula: '@weapon.prof', sign: '+' }] },
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

const POTENCY_LABEL = { message: { key: EngineMessage.WeaponPotency, params: { weapon: 'longsword' } } };
const POTENCY_ID = 'weapon:longsword#weapon-potency';
/** The made-up entry the playground puts typed rule elements on. */
const RULES_ENTRY = contentId(PackId.parse('playground'), EntrySlug.parse('effect:rule-elements'));

/** The example inputs with the longsword's potency set to `grade`. */
function withPotency(grade: number): string {
  const inputs = JSON.parse(EXAMPLE_STATISTIC_INPUTS) as { weapons: object[] };
  const [first, ...rest] = inputs.weapons;
  return JSON.stringify({ ...inputs, weapons: [{ ...first, potency: grade }, ...rest] });
}

/** A typed item bonus of `value` to the longsword's Strike. */
function itemBonus(value: number): object {
  return { key: 'FlatModifier', selectors: ['strike:longsword'], type: 'item', value };
}

/** The longsword's Strike row with `rules` in play. */
function longsword(rules: readonly object[], inputs = EXAMPLE_STATISTIC_INPUTS): unknown {
  const texts = { inputs, rules: JSON.stringify(rules), overrides: '[]', facts: '' };
  const strike = perSource('strike', 'weapon', '@weapon.attr + @weapon.prof');
  const result = checkStatistics(
    { definitions: JSON.stringify([strike]), ...texts },
    { table: PLAYER_CORE_PROFICIENCY_BONUS, variant: undefined },
    CORE_NAMESPACES,
  );
  return result.status === StatisticsStatus.Valid
    ? result.rows.find((row) => row.selector === 'strike:longsword')
    : undefined;
}

describe('checkStatistics weapon potency', () => {
  it('shows the potency as an item line named by its message', () => {
    expect(longsword([])).toMatchObject({
      total: 12,
      statistic: {
        lines: [{ modifier: { label: POTENCY_LABEL, type: 'item' }, value: 1, status: { kind: 'applied' } }],
      },
    });
  });

  it('names the potency line as what suppresses a lower item bonus', () => {
    expect(longsword([itemBonus(1)], withPotency(2))).toMatchObject({
      total: 13,
      statistic: {
        lines: [
          { modifier: { label: { entry: RULES_ENTRY } }, status: { kind: 'suppressed', by: POTENCY_ID } },
          { modifier: { id: POTENCY_ID, label: POTENCY_LABEL }, status: { kind: 'applied' } },
        ],
      },
    });
  });

  it('suppresses the potency line under a higher item bonus', () => {
    expect(longsword([itemBonus(2)])).toMatchObject({
      total: 13,
      statistic: {
        lines: [
          { status: { kind: 'applied' } },
          { modifier: { label: POTENCY_LABEL }, status: { kind: 'suppressed', by: `${RULES_ENTRY}#0` } },
        ],
      },
    });
  });
});
