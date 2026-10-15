import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentId, ContentKind, ContentRegistry, RollOption } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES, installRulesFakes } from '@pioneer/rules/sdk/testing';

import { actionContext } from './action-context';
import type { ActionContext } from './action-context';

installRulesFakes();

const builder = new ContentPackBuilder().withId('context-fixtures');
builder.withItem(ContentKind.Action, 'stand', { cost: 'one', universal: true });
builder.withItem(ContentKind.Action, 'crawl', { cost: 'one', universal: true });
builder.withItem(ContentKind.Action, 'escape', { cost: 'one', universal: true });
builder.withItem(ContentKind.Feat, 'shield-block', { category: 'general', action: { cost: 'reaction', trigger: [] } });
const registry = new ContentRegistry();
registry.register(builder.build());

const id = (kind: ContentKind, name: string): ContentId => ContentId.parse(builder.idOf(kind, name));
const STAND = id(ContentKind.Action, 'stand');
const CRAWL = id(ContentKind.Action, 'crawl');
const ESCAPE = id(ContentKind.Action, 'escape');
const SHIELD_BLOCK = id(ContentKind.Feat, 'shield-block');

function contextOf(...options: readonly string[]): ActionContext {
  return actionContext(
    new PredicateFacts(
      options.map((option) => RollOption.parse(option)),
      CORE_NAMESPACES,
    ),
    registry,
  );
}

describe('actionContext', () => {
  test('standing with nothing raised calls for no action and keeps Shield Block dormant', () => {
    const context = contextOf();

    expect(context.first).toStrictEqual([]);
    expect([...context.dormant]).toStrictEqual([SHIELD_BLOCK]);
  });

  test('prone puts Stand and Crawl first', () => {
    expect(contextOf('self:condition:prone').first).toStrictEqual([STAND, CRAWL]);
  });

  test('grabbed puts Escape first, and so does restrained, once', () => {
    expect(contextOf('self:condition:grabbed').first).toStrictEqual([ESCAPE]);
    expect(contextOf('self:condition:grabbed', 'self:condition:restrained').first).toStrictEqual([ESCAPE]);
  });

  test('a raised shield enables Shield Block and puts it first', () => {
    const context = contextOf('self:effect:effect-raise-a-shield');

    expect(context.first).toStrictEqual([SHIELD_BLOCK]);
    expect(context.dormant.has(SHIELD_BLOCK)).toBe(false);
  });
});
