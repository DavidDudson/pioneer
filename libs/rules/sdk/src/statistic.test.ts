import { describe, expect, test } from 'bun:test';

import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { ContentPackSchema } from './content-pack';
import { RulesMessage } from './messages';
import { StatisticDefinition, StatisticKind } from './statistic';
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

  test('rejects unknown keys and a malformed selector', () => {
    expect(issues({ ...armorClass, extra: true }).map((issue) => issue.path)).toStrictEqual([['extra']]);
    expect(issues({ ...armorClass, selector: 'Armor Class' }).map((issue) => issue.path)).toStrictEqual([['selector']]);
  });
});

describe('statistics in a pack', () => {
  test('two statistics may not share a selector; the second is the problem', () => {
    const pack = {
      manifest: { id: 'test-pack', title: 'Test', publisher: 'Tests', license: 'homebrew' },
      ancestries: [],
      creatures: [],
      statistics: [armorClass, { ...armorClass, slug: 'other-armor-class' }],
    };
    expect(issuesFrom(ContentPackSchema, pack)).toStrictEqual([
      { path: ['statistics', 1, 'selector'], message: message(RulesMessage.DuplicateSelector, { selector: 'ac' }) },
    ]);
  });

  test('a pack without statistics has none', () => {
    expect(new ContentPackBuilder().build().statistics).toStrictEqual([]);
  });
});
