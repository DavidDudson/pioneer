import { describe, expect, test } from 'bun:test';

import {
  AncestryId,
  contentId,
  ContentRegistry,
  CreatureId,
  HitPoints,
  Level,
  PackId,
  packContentsFromFiles,
  Selector,
  Slug,
} from '@pioneer/rules/sdk';

import { checkedLoader, contentCatalog } from './index';
import { SourceCheckError } from './source-check';

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

  test('a pack that cites an unregistered book fails to load', async () => {
    const homebrew = PackId.parse('homebrew');
    const slug = Slug.parse('iruxi');
    const language = {
      id: contentId(homebrew, slug),
      pack: homebrew,
      kind: 'language',
      slug,
      name: 'Iruxi',
      rarity: 'common',
      traits: [],
      sources: [{ kind: 'book', book: 'core-rulebook', page: 1 }],
      description: [],
      rules: [],
      data: {},
    };
    const packFile = { id: homebrew, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };
    const loader = checkedLoader('homebrew', async () => packContentsFromFiles(packFile, [[language]]));
    const failure: unknown = await loader.load().then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(SourceCheckError);
  });
});
