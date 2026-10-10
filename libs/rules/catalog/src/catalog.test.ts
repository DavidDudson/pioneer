import { describe, expect, test } from 'bun:test';

import {
  AncestryId,
  contentId,
  ContentRegistry,
  CreatureId,
  HitPoints,
  Level,
  PackId,
  Selector,
  Slug,
} from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

const coreRules = PackId.parse('core-rules');
const playerCore = PackId.parse('player-core');
const monsterCore = PackId.parse('monster-core');
const humanId = AncestryId.parse(contentId(playerCore, Slug.parse('human')));
const zombieId = CreatureId.parse(contentId(monsterCore, Slug.parse('zombie-shambler')));

describe('content catalog', () => {
  test('every pack loads and validates', async () => {
    const registry = new ContentRegistry();
    await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
    expect(registry.packs.map((pack) => pack.id).toSorted()).toStrictEqual([coreRules, monsterCore, playerCore]);
    const human = registry.ancestry(humanId);
    expect(human?.definition.hitPoints).toBe(HitPoints.parse(8));
    const zombie = registry.creature(zombieId);
    expect(zombie?.definition.level).toBe(Level.parse(-1));
    const [armorClass] = registry.statisticsFor(Selector.parse('ac'));
    expect(armorClass?.pack.id).toBe(coreRules);
  });
});
