import { describe, expect, test } from 'bun:test';

import { EffectChange, EffectMode, EffectStatusKind, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticInputs, SummarisedEntry } from '@pioneer/rules/engine';
import { ContentId, ContentLicense, ContentPack, ContentRegistry } from '@pioneer/rules/sdk';
import type { VariantRuleEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { characterEffects } from './character-effects';
import type { StatisticSources } from './character-statistics';
import { slotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

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
    manifest: { id: 'variants', title: 'Variants', publisher: 'Pioneer', license: ContentLicense.Homebrew },
    ancestries: [],
    creatures: [],
    variantRules: [
      {
        slug: 'variant-rule:keen',
        name: 'Keen',
        sources: [BOOK],
        rules: [
          { key: 'FlatModifier', type: 'item', value: 2, selectors: ['perception'] },
          { key: 'Resistance', type: ['fire'], value: 5 },
        ],
      },
    ],
  }),
);

const keen = ((): VariantRuleEntry => {
  const [found] = registry.variantRules();
  if (found === undefined) {
    throw new Error('No variant rule');
  }
  return found;
})();

/** The variant rule as an entry whose effects are asked for. */
const entry: SummarisedEntry = {
  id: ContentId.parse(keen.id),
  rules: keen.definition.rules,
  sources: keen.definition.sources,
};

const { document } = new CharacterBuilder().build();

function sources(variants: readonly VariantRuleEntry[]): StatisticSources {
  return { registry, slots: slotContent(registry), inputs, variants };
}

describe('characterEffects', () => {
  test('an entry in play shows the lines the sheet applies', () => {
    const lines = characterEffects(document, sources([keen]), { entry, mode: EffectMode.Applying });
    expect(lines).toMatchObject([
      { change: EffectChange.Bonus, type: 'item', value: 2, status: { kind: EffectStatusKind.Applied } },
      { change: EffectChange.Resistance, damage: 'fire', value: 5 },
    ]);
  });

  test('an entry not in play has none applying, and its lines when it would apply', () => {
    expect(characterEffects(document, sources([]), { entry, mode: EffectMode.Applying })).toStrictEqual([]);
    const lines = characterEffects(document, sources([]), { entry, mode: EffectMode.WouldApply });
    // How it would get there is not known, so the origins differ by their hops.
    expect(lines).toMatchObject([
      { change: EffectChange.Bonus, type: 'item', value: 2, status: { kind: EffectStatusKind.Applied } },
      { change: EffectChange.Resistance, damage: 'fire', value: 5 },
    ]);
  });

  test('there are none without a proficiency bonus table', () => {
    const bare = new ContentRegistry();
    const lines = characterEffects(
      document,
      { ...sources([]), registry: bare },
      { entry, mode: EffectMode.WouldApply },
    );
    expect(lines).toStrictEqual([]);
  });
});
