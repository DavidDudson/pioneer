import { describe, expect, test } from 'bun:test';

import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';
import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** Deity (Cleric)'s holy trait and fist, a plant heritage's traits, and the cleric's deity spells. */
const examples: object[] = [
  { key: 'ActorTraits', add: ['holy'], predicate: ['sanctification:holy'] },
  { key: 'ActorTraits', add: ['plant'], remove: ['animal', 'beast', 'humanoid', 'construct'] },
  { key: 'Strike', fist: true, predicate: ['deity:primary:favored-weapon:fist'] },
  { key: 'DeitySpells', entry: 'cleric', predicate: ['class:cleric'] },
];

describe("a cleric's deity grant elements", () => {
  test.each(examples)('reads %o and encodes it back unchanged', (example) => {
    expect(z.encode(RuleElement, RuleElement.parse(example))).toStrictEqual(example);
  });

  test('ActorTraits adds or removes at least one trait, each once', () => {
    expect(issues({ key: 'ActorTraits' })).toStrictEqual([
      { path: [], message: message(RulesMessage.ActorTraitsAddOrRemove) },
    ]);
    expect(issues({ key: 'ActorTraits', add: [], remove: [] })).toStrictEqual([
      { path: [], message: message(RulesMessage.ActorTraitsAddOrRemove) },
    ]);
    expect(issues({ key: 'ActorTraits', add: ['holy', 'holy'] })).toMatchObject([{ path: ['add', 1] }]);
  });

  test('Strike is a fist, or an attack of its own with a slug, category and damage', () => {
    const jaws = {
      key: 'Strike',
      slug: 'jaws',
      category: 'unarmed',
      damage: { dice: 1, die: 'd8', damageType: 'piercing' },
    };
    expect(issues(jaws)).toStrictEqual([]);
    expect(issues({ key: 'Strike', fist: false })).toMatchObject([{ path: ['fist'] }]);
    expect(issues({ key: 'Strike' })).toStrictEqual([{ path: [], message: message(RulesMessage.StrikeShape) }]);
    expect(issues({ ...jaws, fist: true })).toStrictEqual([{ path: [], message: message(RulesMessage.StrikeShape) }]);
    expect(issues({ key: 'Strike', slug: 'jaws', category: 'unarmed' })).toStrictEqual([
      { path: [], message: message(RulesMessage.StrikeShape) },
    ]);
  });
});
