import { describe, expect, test } from 'bun:test';

import { StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticResult, StatisticValue } from '@pioneer/rules/engine';
import { ContentRegistry, Selector } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, UserId } from '@pioneer/shared/kernel';

import type { Character } from './character';
import { CharacterPatchField } from './character-patch';
import { characterStatistics } from './character-statistics';
import type { StatisticSources } from './character-statistics';
import { OverrideId, OverrideInput, OverrideReason } from './override-schema';
import { slotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

const PERCEPTION = Selector.parse('perception');
const AUTHOR = UserId.parse('00000000-0000-4000-8000-0000000000a1');
const FIRST = OverrideId.parse('00000000-0000-4000-8000-0000000000b1');
const SECOND = OverrideId.parse('00000000-0000-4000-8000-0000000000b2');
const NOW = fixedClock('2026-02-01T00:00:00Z').now();

/** Level 3, Wisdom +1, trained in Perception: 1 + 2 + 3 = 6. */
const inputs = StatisticInputsJson.parse({
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

const sources: StatisticSources = { registry, slots: slotContent(registry), inputs, variants: [] };

function overridden(character: Character, override: OverrideInput, id: OverrideId): Character {
  return character.apply({ field: CharacterPatchField.AddOverride, override }, NOW, {
    actor: AUTHOR,
    newOverrideId: id,
  });
}

function perception(character: Character): StatisticValue {
  const results: ReadonlyMap<Selector, StatisticResult> = characterStatistics(character.document, sources);
  const found = results.get(PERCEPTION);
  if (found?.ok !== true) {
    throw new Error('Perception was not derived');
  }
  return found;
}

const blank = new CharacterBuilder().build();
const ADJUST = OverrideInput.parse({
  target: 'perception',
  mode: 'adjust',
  value: 2,
  type: 'circumstance',
  reason: 'Blessed',
});
const SET = OverrideInput.parse({ target: 'perception', mode: 'set', value: 12, reason: 'GM ruling' });

describe('characterStatistics with overrides', () => {
  test('an adjust adds its typed modifier to the total', () => {
    const result = perception(overridden(blank, ADJUST, FIRST));

    expect(Number(result.total)).toBe(6 + 2);
  });

  test('a set pins the total and keeps the computed value', () => {
    const result = perception(overridden(blank, SET, FIRST));

    expect(Number(result.total)).toBe(12);
    expect(Number(result.computed)).toBe(6);
    expect(result.pinnedBy).toBeDefined();
  });

  test('a set pins the total after an adjust has run', () => {
    const result = perception(overridden(overridden(blank, ADJUST, FIRST), SET, SECOND));

    expect(Number(result.total)).toBe(12);
    expect(Number(result.computed)).toBe(6 + 2);
  });

  test('removing an override restores the total without it', () => {
    const removed = overridden(blank, SET, FIRST).apply(
      { field: CharacterPatchField.RemoveOverride, id: FIRST, reason: OverrideReason.parse('Not needed') },
      NOW,
      { actor: AUTHOR, newOverrideId: SECOND },
    );

    expect(Number(perception(removed).total)).toBe(6);
  });
});
