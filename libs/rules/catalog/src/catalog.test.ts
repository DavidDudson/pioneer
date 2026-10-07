import { describe, expect, test } from 'bun:test';

import { AncestryId, contentId, ContentRegistry, CreatureId, HitPoints } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

describe('content catalog', () => {
  test('every pack loads and validates', async () => {
    const registry = new ContentRegistry();
    await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
    expect(registry.packs.map((pack) => pack.id).toSorted()).toStrictEqual(['monster-core', 'player-core']);
    const human = registry.ancestry(AncestryId.parse(contentId('player-core', 'human')));
    expect(human?.definition.hitPoints).toBe(HitPoints.parse(8));
    const zombie = registry.creature(CreatureId.parse(contentId('monster-core', 'zombie-shambler')));
    expect(zombie?.definition.level).toBe(-1);
  });
});
