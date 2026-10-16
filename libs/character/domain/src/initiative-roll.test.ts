import { describe, expect, test } from 'bun:test';

import { StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticInputs } from '@pioneer/rules/engine';
import { ContentLicense, ContentPack, ContentRegistry, RollOption, Selector } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { rollSetup } from './character-statistics';
import type { StatisticSources } from './character-statistics';
import { initiativeRoll } from './initiative-roll';
import type { RollAs } from './initiative-roll';
import { slotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

const PERCEPTION = Selector.parse('perception');
const STEALTH = Selector.parse('skill:stealth');
const BOOK = { kind: 'book', book: 'gm-core', page: 1 } as const;

/** Level 3, Wisdom +1, trained in Perception. */
const inputs: StatisticInputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 1, cha: 0 },
  ranks: { perception: 'trained' },
});

const registry = new ContentRegistry();
registry.register(
  new ContentPackBuilder()
    .withId('player-core')
    .withStatistic('perception', { base: '@attr.wis + @prof.perception' })
    .withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS)
    .build(),
);
registry.register(
  ContentPack.define({
    manifest: { id: 'initiatives', title: 'Initiatives', publisher: 'Pioneer', license: ContentLicense.Homebrew },
    ancestries: [],
    creatures: [],
    variantRules: [
      {
        slug: 'variant-rule:incredible',
        name: 'Incredible',
        sources: [BOOK],
        rules: [{ key: 'FlatModifier', type: 'circumstance', value: 2, selectors: ['initiative'] }],
      },
      {
        slug: 'variant-rule:vigilant',
        name: 'Vigilant',
        sources: [BOOK],
        rules: [
          {
            key: 'FlatModifier',
            type: 'status',
            value: 1,
            selectors: ['perception'],
            predicate: ['check:statistic:initiative'],
          },
        ],
      },
    ],
  }),
);

const { document } = new CharacterBuilder().build();
const variants = registry.variantRules();
const sources: StatisticSources = { registry, slots: slotContent(registry), inputs, variants };
const PLAIN = 1 + 2 + 3;

function total(as: RollAs | undefined): number {
  const setup = rollSetup(document, sources, { selector: PERCEPTION, chosen: new Set(), as });
  return Number(setup?.statistic.total);
}

describe('initiativeRoll', () => {
  test('names the roll as a check of the initiative type with the statistic rolled', () => {
    expect(initiativeRoll(STEALTH).options).toContain(RollOption.parse('check:statistic:stealth'));
    expect(initiativeRoll(STEALTH).options).toContain(RollOption.parse('check:type:initiative'));
    expect(initiativeRoll(PERCEPTION).options).toContain(
      RollOption.parse('self:participant:initiative:stat:perception'),
    );
  });
});

describe('rollSetup as initiative', () => {
  test('a modifier aimed at initiative does not reach a plain check', () => {
    expect(total(undefined)).toBe(PLAIN);
  });

  test('a modifier aimed at initiative reaches the statistic rolled for initiative, and one that reads the roll holds', () => {
    expect(total(initiativeRoll(PERCEPTION))).toBe(PLAIN + 2 + 1);
  });
});
