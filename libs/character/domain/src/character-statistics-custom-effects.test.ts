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
import { CustomEffectId, CustomEffectInput } from './custom-effect-schema';
import { OverrideId, OverrideInput, OverrideReason } from './override-schema';
import { slotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

const PERCEPTION = Selector.parse('perception');
const AUTHOR = UserId.parse('00000000-0000-4000-8000-0000000000a1');
const EFFECT = CustomEffectId.parse('00000000-0000-4000-8000-0000000000c1');
const OVERRIDE = OverrideId.parse('00000000-0000-4000-8000-0000000000b1');
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

const BLESSING = CustomEffectInput.parse({
  name: 'Blessing of the Hearth',
  reason: 'Festival boon',
  lines: [{ target: 'perception', value: 2, type: 'circumstance' }],
});
const PINNING = CustomEffectInput.parse({
  name: 'Eagle eyes',
  reason: 'GM ruling: the character sees as a hawk',
  lines: [{ target: 'perception', mode: 'set', value: 20 }],
});
const ADJUST = OverrideInput.parse({
  target: 'perception',
  mode: 'adjust',
  value: 1,
  type: 'status',
  reason: 'Inspired',
});

const blank = new CharacterBuilder().build();

function withEffect(character: Character): Character {
  return character.apply({ field: CharacterPatchField.AddCustomEffect, effect: BLESSING }, NOW, {
    actor: AUTHOR,
    newCustomEffectId: EFFECT,
  });
}

function withPinning(character: Character): Character {
  return character.apply({ field: CharacterPatchField.AddCustomEffect, effect: PINNING }, NOW, {
    actor: AUTHOR,
    newCustomEffectId: EFFECT,
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

describe('characterStatistics with custom effects', () => {
  test('a switched-on effect adds its line, grouped under the effect name', () => {
    const result = perception(withEffect(blank));

    expect(Number(result.total)).toBe(6 + 2);
    expect(JSON.stringify(result.lines)).toContain('Blessing of the Hearth');
  });

  test('switching the effect off takes its line out of the total', () => {
    const off = withEffect(blank).apply(
      { field: CharacterPatchField.ToggleCustomEffect, id: EFFECT, enabled: false },
      NOW,
      { actor: AUTHOR },
    );

    expect(Number(perception(off).total)).toBe(6);
    expect(JSON.stringify(perception(off).lines)).not.toContain('Blessing of the Hearth');
  });

  test('removing the effect takes its line out of the total', () => {
    const removed = withEffect(blank).apply(
      { field: CharacterPatchField.RemoveCustomEffect, id: EFFECT, reason: OverrideReason.parse('Festival over') },
      NOW,
      { actor: AUTHOR },
    );

    expect(Number(perception(removed).total)).toBe(6);
  });

  test('a line that sets a statistic pins it and keeps the computed value', () => {
    const result = perception(withPinning(blank));

    expect(Number(result.total)).toBe(20);
    expect(Number(result.computed)).toBe(6);
    expect(result.pinnedBy).toBeDefined();
  });

  test("switching a setting effect off gives the rules' total back", () => {
    const off = withPinning(blank).apply(
      { field: CharacterPatchField.ToggleCustomEffect, id: EFFECT, enabled: false },
      NOW,
      { actor: AUTHOR },
    );

    expect(Number(perception(off).total)).toBe(6);
  });

  test('an effect and an override on one statistic both count', () => {
    const both = withEffect(blank).apply({ field: CharacterPatchField.AddOverride, override: ADJUST }, NOW, {
      actor: AUTHOR,
      newOverrideId: OVERRIDE,
    });

    expect(Number(perception(both).total)).toBe(6 + 2 + 1);
  });
});
