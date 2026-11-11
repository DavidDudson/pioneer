import { EffectInstanceId, EffectUses, SELF } from '@pioneer/character/domain';
import type { ActiveEffect } from '@pioneer/character/domain';
import { ContentId, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { effectViews } from './sheet-effects';

const pack = new ContentPackBuilder().withId('player-core');
pack.withItem(ContentKind.Effect, 'gods-favour', { category: 'other', duration: { type: 'uses', count: 3 } });
const favour = ContentId.parse(pack.idOf(ContentKind.Effect, 'gods-favour'));

const registry = new ContentRegistry();
registry.register(pack.build());

const FIRST = EffectInstanceId.parse('00000000-0000-4000-8000-000000000001');

function boon(uses: number): ActiveEffect {
  return { id: FIRST, effect: favour, source: SELF, uses: EffectUses.parse(uses) };
}

describe(effectViews, () => {
  it('shows the uses a boon has left, which its Use button spends', () => {
    const [view] = effectViews(registry, [boon(2)]);

    expect(view?.uses).toBe(2);
    expect(view?.details).toStrictEqual([{ key: 'character.sheet.effects.usesLeft', params: { count: 2 } }]);
  });

  it('shows no uses for an effect that has none', () => {
    const [view] = effectViews(registry, [{ id: FIRST, effect: favour, source: SELF }]);

    expect(view?.uses).toBeUndefined();
  });
});
