import { ContentId, ContentKind, ContentRegistry, ActionCost } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import type { ActionUse } from '@pioneer/rules/ui';
import { newId } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { spendOf } from './sheet-spender';

const pack = new ContentPackBuilder()
  .withId('player-core')
  .withSpell('barrier', { rank: 2, traditions: [], duration: { type: 'sustained' } });
const registry = new ContentRegistry();
registry.register(pack.build());

const BARRIER = ContentId.parse(pack.idOf(ContentKind.Spell, 'barrier'));

/** A use of `id` for one action, paying `slot` when it names one. */
function useOf(id: ContentId, slot?: string): ActionUse {
  const payment = slot === undefined ? undefined : { slot };
  return { line: { id, name: 'Use', cost: ActionCost.One, payment }, actions: undefined };
}

describe(spendOf, () => {
  it('spends a sustained spell cast from a slot at the rank of the slot', () => {
    const spend = spendOf(registry, useOf(BARRIER, 'wizard:4'));
    expect(spend).toMatchObject({ action: BARRIER, slot: 'wizard:4', spell: { kind: 'cast', rank: 4 } });
  });

  it('spends a sustained cantrip-like cast with no slot at the rank its content gives', () => {
    expect(spendOf(registry, useOf(BARRIER))).toMatchObject({ spell: { kind: 'cast', rank: 2 } });
  });

  it('spends an action that is no spell without an active spell, whatever the registry holds', () => {
    const action = ContentId.parse(newId());
    const spend = spendOf(registry, useOf(action));
    expect(spend).toMatchObject({ action, cost: { kind: 'actions', count: 1 } });
    expect(spend).not.toHaveProperty('spell');
  });

  it('spends an action when the registry has no spells at all', () => {
    const none = new ContentRegistry();
    const action = ContentId.parse(newId());
    expect(spendOf(none, useOf(action))).toBeDefined();
  });
});
