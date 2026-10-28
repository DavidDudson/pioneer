import { describe, expect, test } from 'bun:test';

import { StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticInputs } from '@pioneer/rules/engine';
import { ContentLicense, ContentPack, ContentRegistry } from '@pioneer/rules/sdk';
import type { VariantRuleEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { characterDefences } from './character-defences';
import type { StatisticSources } from './character-statistics';
import { slotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

const BOOK = { kind: 'book', book: 'gm-core', page: 1 } as const;
const FIRE_RESISTANCE = 5;

const inputs: StatisticInputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

const registry = new ContentRegistry();
registry.register(
  new ContentPackBuilder().withId('player-core').withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS).build(),
);
registry.register(
  ContentPack.define({
    manifest: { id: 'warded', title: 'Warded', publisher: 'Pioneer', license: ContentLicense.Homebrew },
    ancestries: [],
    creatures: [],
    variantRules: [
      {
        slug: 'variant-rule:warded',
        name: 'Warded',
        sources: [BOOK],
        rules: [{ key: 'Resistance', type: ['fire'], value: FIRE_RESISTANCE }],
      },
    ],
  }),
);

const { document } = new CharacterBuilder().build();

function sources(variants: readonly VariantRuleEntry[]): StatisticSources {
  return { registry, slots: slotContent(registry), inputs, variants };
}

describe('characterDefences', () => {
  test('has the resistances of the rules in play', () => {
    const defences = characterDefences(document, sources(registry.variantRules()));

    expect(defences.resistances.map(({ type, value }) => ({ type, value }))).toMatchObject([
      { type: 'fire', value: FIRE_RESISTANCE },
    ]);
  });

  test('has none while no rule gives one', () => {
    expect(characterDefences(document, sources([])).resistances).toEqual([]);
  });
});
