import { describe, expect, test } from 'bun:test';

import { BaseTermKind, RuleId, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticInputs, StatisticResult, StatisticValue } from '@pioneer/rules/engine';
import { ContentId, ContentLicense, ContentPack, ContentRegistry, OriginHopKind, Selector } from '@pioneer/rules/sdk';
import type { OriginHop, VariantRuleEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { characterStatistics, rollSetup } from './character-statistics';
import type { StatisticSources } from './character-statistics';
import { slotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

const PERCEPTION = Selector.parse('perception');

const WITHOUT_LEVEL = { untrained: '-2', trained: '2', expert: '4', master: '6', legendary: '8' };
const BOOK = { kind: 'book', book: 'gm-core', page: 1 } as const;

/** Level 3, Wisdom +1, trained in Perception. */
const inputs: StatisticInputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 1, cha: 0 },
  ranks: { perception: 'trained' },
});

function variantPack(): ContentPack {
  return ContentPack.define({
    manifest: { id: 'variants', title: 'Variants', publisher: 'Pioneer', license: ContentLicense.Homebrew },
    ancestries: [],
    creatures: [],
    variantRules: [
      {
        slug: 'variant-rule:without-level',
        name: 'Without level',
        sources: [BOOK],
        rules: [{ key: 'ProficiencyBonus', table: WITHOUT_LEVEL }],
      },
      {
        slug: 'variant-rule:keen',
        name: 'Keen',
        sources: [BOOK],
        rules: [
          {
            key: 'FlatModifier',
            type: 'circumstance',
            value: 1,
            selectors: ['perception'],
            predicate: ['target:trait:undead'],
          },
        ],
      },
    ],
  });
}

const registry = new ContentRegistry();
registry.register(
  new ContentPackBuilder()
    .withId('player-core')
    .withStatistic('perception', { base: '@attr.wis + @prof.perception' })
    .withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS)
    .build(),
);
registry.register(variantPack());

function variant(slug: string): VariantRuleEntry {
  const found = registry.variantRules().find(({ definition }) => definition.slug === `variant-rule:${slug}`);
  if (found === undefined) {
    throw new Error(`No variant rule ${slug}`);
  }
  return found;
}

const { document } = new CharacterBuilder().build();

function sources(...variants: readonly VariantRuleEntry[]): StatisticSources {
  return { registry, slots: slotContent(registry), inputs, variants };
}

/** Perception as derived, which must be a value. */
function perception(result: ReadonlyMap<Selector, StatisticResult>): StatisticValue {
  const found = result.get(PERCEPTION);
  if (found?.ok !== true) {
    throw new Error('Perception was not derived');
  }
  return found;
}

/** The origin hops of the last term of a statistic's base, which reads `@prof`. */
function lastTermHops({ base }: StatisticValue): readonly OriginHop[] | undefined {
  return base.findLast((term) => term.kind === BaseTermKind.Term)?.origin?.hops;
}

describe('characterStatistics with variant rules', () => {
  test('without a variant the proficiency bonus is the registry table, level included', () => {
    const result = perception(characterStatistics(document, sources()));
    expect(Number(result.total)).toBe(1 + 2 + 3);
    expect(lastTermHops(result)).toBeUndefined();
  });

  test('Proficiency Without Level drops the level, and the @prof term names the variant', () => {
    const without = variant('without-level');
    const result = perception(characterStatistics(document, sources(without)));
    expect(Number(result.total)).toBe(1 + 2);
    expect(lastTermHops(result)).toStrictEqual([{ kind: OriginHopKind.Variant, rule: ContentId.parse(without.id) }]);
  });
});

describe('rollSetup with variant rules', () => {
  const keen = variant('keen');
  const ruleId = RuleId.parse(`${keen.id}#0`);

  test('a conditional line of an enabled variant is offered, and counts once claimed', () => {
    const setup = rollSetup(document, sources(keen), { selector: PERCEPTION, chosen: new Set([ruleId]) });
    expect(setup?.conditional.map(({ modifier }) => modifier.id)).toStrictEqual([ruleId]);
    expect(Number(setup?.statistic.total)).toBe(1 + 2 + 3 + 1);
  });

  test('without the variant there is nothing to claim', () => {
    const setup = rollSetup(document, sources(), { selector: PERCEPTION, chosen: new Set([ruleId]) });
    expect(setup?.conditional).toStrictEqual([]);
    expect(Number(setup?.statistic.total)).toBe(1 + 2 + 3);
  });
});
