import { describe, expect, test } from 'bun:test';

import { RollOption } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { idOf, inputsOf, picked, picksOf } from './testing/builders';
import { classFeatSlotAt, FIGHTER_CONTENT, LEVEL_20_PICKS, SKILL_SLOT } from './testing/fighter';

function fighterAt(level: number, picks: readonly (readonly [SlotKey, string])[] = []): GrantResolution {
  const roots = [picked('fighter', 'class')];
  return resolveGrants(inputsOf({ entries: FIGHTER_CONTENT, roots, level, picks: picksOf(picks) }));
}

const names = (result: GrantResolution): string[] => result.items.map((item) => item.entry.name);
const options = (result: GrantResolution): string[] => result.rollOptions.map(String);

describe('Level 1 Fighter (golden)', () => {
  test('resolves the class, its 1st-level features and Shield Block, with the class feat and skill open', () => {
    const result = fighterAt(1);
    expect(names(result)).toEqual(['fighter', 'shield-block', 'reactive-strike']);
    expect(result.open.map((slot) => slot.key)).toEqual([SKILL_SLOT, classFeatSlotAt(1)]);
    expect(result.open[0]?.options.map((option) => String(option.value))).toEqual(['acrobatics', 'athletics']);
    expect(result.open[1]?.options.map((option) => String(option.label))).toEqual([
      'double-slice',
      'reactive-shield',
      'sudden-charge',
    ]);
    expect(result.answered).toEqual([]);
    expect(result.conditional).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(options(result)).toEqual(['class:fighter', 'feat:shield-block', 'feature:reactive-strike', 'self:level:1']);
  });

  test('grants the picked class feat and records the skill', () => {
    const result = fighterAt(1, [
      [SKILL_SLOT, 'athletics'],
      [classFeatSlotAt(1), idOf('sudden-charge')],
    ]);
    expect(names(result)).toEqual(['fighter', 'shield-block', 'reactive-strike', 'sudden-charge']);
    expect(result.open).toEqual([]);
    expect(result.answered.map((slot) => slot.key)).toEqual([SKILL_SLOT, classFeatSlotAt(1)]);
    expect(options(result)).toEqual([
      'class:fighter',
      'feat:shield-block',
      'feat:sudden-charge',
      'feature:reactive-strike',
      'fighter-skill:athletics',
      'self:level:1',
    ]);
    expect(result.facts.has(RollOption.parse('fighter-skill:athletics'))).toBe(true);
  });
});

describe('Level 20 Fighter (golden)', () => {
  test('resolves every feature, feat and the grants that read what the set derives', () => {
    const result = fighterAt(20, LEVEL_20_PICKS);
    expect(result.errors).toEqual([]);
    expect(result.open).toEqual([]);
    expect(result.answered).toHaveLength(LEVEL_20_PICKS.length);
    const onCharacter = names(result);
    // Each needs a fact only an earlier round's set provides.
    expect(onCharacter).toContain('greater-weapon-specialization');
    expect(onCharacter).toContain('leaping-charge');
    expect(onCharacter).toContain('warden-stance');
    expect(new Set(onCharacter).size).toBe(onCharacter.length);
  });

  test('features drop out again at a lower level', () => {
    const result = fighterAt(7, LEVEL_20_PICKS);
    const onCharacter = names(result);
    expect(onCharacter).toContain('weapon-specialization');
    expect(onCharacter).not.toContain('greater-weapon-specialization');
    expect(onCharacter).not.toContain('combat-flexibility');
    expect(onCharacter).toContain('warden-stance');
    expect(onCharacter).not.toContain('leaping-charge');
    expect(onCharacter).not.toContain('brutal-finish');
  });
});
