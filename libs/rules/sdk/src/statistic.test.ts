import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { ContentPackSchema } from './content-pack';
import { RulesMessage } from './messages';
import { StatisticData, StatisticDefinition, StatisticKind, StatisticPer } from './statistic';
import { ContentPackBuilder } from './testing';

const armorClass = {
  slug: 'armor-class',
  name: 'Armor Class',
  selector: 'ac',
  domains: ['dex-based'],
  base: '10 + @attr.dex.capped + @prof.ac',
  kind: StatisticKind.Dc,
  keyAttribute: 'dex',
};

function issuesFrom(schema: z.ZodType, json: unknown): readonly FieldIssue[] {
  const result = schema.safeParse(json);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const issues = (json: unknown): readonly FieldIssue[] => issuesFrom(StatisticDefinition, json);

describe('StatisticDefinition', () => {
  test('accepts a statistic with an actor-only base formula', () => {
    expect(issues(armorClass)).toStrictEqual([]);
  });

  test('the key attribute is optional', () => {
    const { keyAttribute: _keyAttribute, ...withoutKey } = armorClass;
    expect(issues(withoutKey)).toStrictEqual([]);
  });

  test('an item reference in the base formula is a problem at base, with its position', () => {
    expect(issues({ ...armorClass, base: '10 + @item.level' })).toStrictEqual([
      { path: ['base'], message: message(RulesMessage.ReferenceOutOfScope, { found: '@item.level', position: 6 }) },
    ]);
  });

  test("a Foundry spelling in the base formula names Pioneer's", () => {
    expect(issues({ ...armorClass, base: '@actor.level' })).toStrictEqual([
      {
        path: ['base'],
        message: message(RulesMessage.FoundryReference, { found: '@actor.level', suggestion: '@level', position: 1 }),
      },
    ]);
  });

  test('a Foundry spelling of an item reference is out of scope, not a suggestion to write @item.level', () => {
    expect(issues({ ...armorClass, base: '@item.system.level.value' })).toStrictEqual([
      {
        path: ['base'],
        message: message(RulesMessage.ReferenceOutOfScope, { found: '@item.system.level.value', position: 1 }),
      },
    ]);
  });

  test('a weapon or spellcasting reference needs a statistic derived per that source', () => {
    expect(issues({ ...armorClass, base: '@weapon.attr + @spellcasting.prof' })).toStrictEqual([
      { path: ['base'], message: message(RulesMessage.ReferenceNeedsWeapon, { found: '@weapon.attr', position: 1 }) },
      {
        path: ['base'],
        message: message(RulesMessage.ReferenceNeedsSpellcasting, { found: '@spellcasting.prof', position: 16 }),
      },
    ]);
  });

  test('a statistic derived per weapon reads the weapon and the character, and names no key attribute', () => {
    const { keyAttribute: _keyAttribute, ...strike } = {
      ...armorClass,
      selector: 'strike',
      base: '@weapon.attr + @weapon.prof + @weapon.potency + @level * 0',
      kind: StatisticKind.Check,
      per: StatisticPer.Weapon,
    };
    expect(issues(strike)).toStrictEqual([]);
    expect(issues({ ...strike, base: '@spellcasting.attr' })).toStrictEqual([
      {
        path: ['base'],
        message: message(RulesMessage.ReferenceNeedsSpellcasting, { found: '@spellcasting.attr', position: 1 }),
      },
    ]);
    expect(issues({ ...strike, keyAttribute: 'str' })).toStrictEqual([
      { path: ['keyAttribute'], message: message(RulesMessage.StatisticPerKeyAttribute) },
    ]);
  });

  test('a statistic derived per spellcasting entry may read the entry, and @item stays out of scope', () => {
    const { keyAttribute: _keyAttribute, ...spellAttack } = {
      ...armorClass,
      selector: 'spell-attack',
      base: '@spellcasting.attr + @spellcasting.prof',
      per: StatisticPer.Spellcasting,
    };
    expect(issues(spellAttack)).toStrictEqual([]);
    expect(issues({ ...spellAttack, base: '@item.level' })).toStrictEqual([
      { path: ['base'], message: message(RulesMessage.ReferenceOutOfScope, { found: '@item.level', position: 1 }) },
    ]);
  });

  test('statistic data checks scopes the same way', () => {
    const { slug: _slug, name: _name, ...data } = armorClass;
    expect(issuesFrom(StatisticData, { ...data, base: '@weapon.prof' }).map((issue) => issue.path)).toStrictEqual([
      ['base'],
    ]);
  });

  test('rejects unknown keys and a malformed selector', () => {
    expect(issues({ ...armorClass, extra: true }).map((issue) => issue.path)).toStrictEqual([['extra']]);
    expect(issues({ ...armorClass, selector: 'Armor Class' }).map((issue) => issue.path)).toStrictEqual([['selector']]);
  });
});

describe('statistics in a pack', () => {
  test('two statistics may not share a selector; the second is the problem', () => {
    const sources = [{ kind: 'book', book: 'player-core', page: 404 }];
    const pack = {
      manifest: { id: 'test-pack', title: 'Test', publisher: 'Tests', license: 'homebrew' },
      ancestries: [],
      creatures: [],
      statistics: [
        { ...armorClass, sources },
        { ...armorClass, slug: 'other-armor-class', sources },
      ],
    };
    expect(issuesFrom(ContentPackSchema, pack)).toStrictEqual([
      { path: ['statistics', 1, 'selector'], message: message(RulesMessage.DuplicateSelector, { selector: 'ac' }) },
    ]);
  });

  test('every statistic in a pack cites at least one source', () => {
    const pack = {
      manifest: { id: 'test-pack', title: 'Test', publisher: 'Tests', license: 'homebrew' },
      ancestries: [],
      creatures: [],
      statistics: [armorClass, { ...armorClass, slug: 'other-armor-class', selector: 'other-ac', sources: [] }],
    };
    expect(issuesFrom(ContentPackSchema, pack)).toStrictEqual([
      { path: ['statistics', 0, 'sources'], message: message(ValidationMessage.InvalidType, { expected: 'array' }) },
      {
        path: ['statistics', 1, 'sources'],
        message: message(ValidationMessage.TooSmall, { origin: 'array', minimum: 1 }),
      },
    ]);
  });

  test('a pack without statistics has none', () => {
    expect(new ContentPackBuilder().build().statistics).toStrictEqual([]);
  });
});
