import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, installRulesFakes } from '@pioneer/rules/sdk/testing';

import { explorationAction, isExplorationActivity, PERCEPTION, suggestedInitiative } from './exploration-activity';

installRulesFakes();

const builder = new ContentPackBuilder().withId('exploration-fixtures');
builder.withItem(ContentKind.Action, 'avoid-notice', {
  universal: true,
  modes: ['exploration'],
  skills: ['skill:stealth'],
});
builder.withItem(ContentKind.Action, 'search', { universal: true, modes: ['exploration'] });
builder.withItem(ContentKind.Action, 'strike', { cost: 'one', universal: true });
const registry = new ContentRegistry();
registry.register(builder.build());

const id = (name: string): ContentId => ContentId.parse(builder.idOf(ContentKind.Action, name));

describe('isExplorationActivity', () => {
  test('is true for an action used while exploring', () => {
    expect(isExplorationActivity(registry, id('search'))).toBe(true);
  });

  test('is false for an action that is not, and for an id the content lacks', () => {
    expect(isExplorationActivity(registry, id('strike'))).toBe(false);
    expect(isExplorationActivity(registry, ContentId.parse('00000000-0000-4000-8000-000000000009'))).toBe(false);
    expect(explorationAction(registry, id('strike'))).toBeUndefined();
  });
});

describe('suggestedInitiative', () => {
  test('is the skill the activity uses: Avoid Notice suggests Stealth', () => {
    const initiative = suggestedInitiative(registry, id('avoid-notice'));
    expect(String(initiative)).toBe('skill:stealth');
  });

  test('is Perception for an activity that uses no skill, for none picked and for one the content lacks', () => {
    expect(suggestedInitiative(registry, id('search'))).toBe(PERCEPTION);
    expect(suggestedInitiative(registry, undefined)).toBe(PERCEPTION);
    expect(suggestedInitiative(registry, id('strike'))).toBe(PERCEPTION);
  });
});
