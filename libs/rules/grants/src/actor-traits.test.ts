import { describe, expect, test } from 'bun:test';

import { ContentKind, Trait } from '@pioneer/rules/sdk';

import type { GrantEntry, GrantRoot } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import { entry, inputsOf, picked } from './testing/builders';

/** A human ancestry, giving the human and humanoid traits. */
const HUMAN: GrantEntry = {
  ...entry('human'),
  kind: ContentKind.Ancestry,
  actorTraits: ['human', 'humanoid'].map((trait) => Trait.parse(trait)),
};

/** The character's `self:trait:` options, with `entries` and `roots` on it. */
function traitsOf(entries: readonly GrantEntry[], roots: readonly GrantRoot[]): readonly string[] {
  const { rollOptions } = resolveGrants(inputsOf({ entries, roots, level: 1 }));
  return rollOptions.map(String).filter((option: string) => option.startsWith('self:trait:'));
}

/** Deity (Cleric) adding the holy trait while the cleric is holy, with `option` set. */
function sanctified(option: string): GrantEntry {
  return entry('deity-cleric', [
    { key: 'RollOption', option },
    { key: 'ActorTraits', add: ['holy'], predicate: ['sanctification:holy'] },
  ]);
}

describe('the character traits', () => {
  test("are its ancestry's", () => {
    expect(traitsOf([HUMAN], [picked('human', 'ancestry')])).toEqual(['self:trait:human', 'self:trait:humanoid']);
  });

  test('gain what an ActorTraits element adds, and lose what one removes', () => {
    const leshy = entry('plant-heritage', [{ key: 'ActorTraits', add: ['plant'], remove: ['humanoid'] }]);
    const roots = [picked('human', 'ancestry'), picked('plant-heritage', 'heritage')];
    expect(traitsOf([HUMAN, leshy], roots)).toEqual(['self:trait:human', 'self:trait:plant']);
  });

  test('lose a trait one element removes though another adds it, in either order', () => {
    const adds = entry('holy-boon', [{ key: 'ActorTraits', add: ['holy'] }]);
    const removes = entry('unholy-curse', [{ key: 'ActorTraits', remove: ['holy'] }]);
    const roots = [picked('holy-boon', 'boon'), picked('unholy-curse', 'curse')];
    expect(traitsOf([adds, removes], roots)).toEqual([]);
    expect(traitsOf([adds, removes], roots.toReversed())).toEqual([]);
  });

  test("add a trait only while the element's predicate holds", () => {
    expect(traitsOf([sanctified('sanctification:holy')], [picked('deity-cleric')])).toEqual(['self:trait:holy']);
    expect(traitsOf([sanctified('sanctification:none')], [picked('deity-cleric')])).toEqual([]);
  });
});
