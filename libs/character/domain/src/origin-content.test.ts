import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, Selector } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { originContent } from './origin-content';

const ids = new ContentPackBuilder();
const pack = new ContentPackBuilder()
  .withAncestry('elf', { boosts: [['dex']], flaws: ['con'] })
  .withAncestry('dwarf')
  .withAncestryFeature('keen-eyes')
  .withFeat('assurance')
  .withHeritage('woodland-elf', 'elf')
  .withHeritage('cavern-elf', 'elf', [{ key: 'GrantItem', item: ids.idOf(ContentKind.AncestryFeature, 'keen-eyes') }])
  .withHeritage('changeling')
  .withBackground(
    'scholar',
    [
      ['int', 'wis'],
      ['str', 'dex', 'con', 'int', 'wis', 'cha'],
    ],
    [
      { key: 'Proficiency', selector: 'skill:arcana', rank: 'trained' },
      { key: 'Proficiency', selector: 'skill:lore:academia', rank: 'trained' },
      { key: 'GrantItem', item: ids.idOf(ContentKind.Feat, 'assurance') },
    ],
  );
const registry = new ContentRegistry();
registry.register(pack.build());
const origins = originContent(registry);

describe('originContent', () => {
  test('lists every ancestry by name with its definition', () => {
    expect(origins.ancestries.map((ancestry) => String(ancestry.name))).toEqual(['Dwarf', 'Elf']);
    expect(origins.ancestries.at(1)?.definition.flaws).toEqual(['con']);
  });

  test('lists every heritage by name, saying which ancestry it belongs to and that a versatile one has none', () => {
    expect(origins.heritages.map((heritage) => String(heritage.name))).toEqual([
      'Cavern-elf',
      'Changeling',
      'Woodland-elf',
    ]);
    const changeling = origins.heritages.find((heritage) => String(heritage.name) === 'Changeling');
    expect(changeling?.ancestry).toBeUndefined();
    const woodland = origins.heritages.find((heritage) => String(heritage.name) === 'Woodland-elf');
    expect(woodland?.ancestry).toBe(ContentId.parse(pack.idOf(ContentKind.Ancestry, 'elf')));
  });

  test('names what a heritage grants outright', () => {
    const cavern = origins.heritages.find((heritage) => String(heritage.name) === 'Cavern-elf');
    expect(cavern?.grants.map(String)).toEqual(['Keen-eyes']);
  });

  test('reads the skill and Lore a background trains from its proficiency rules', () => {
    const scholar = origins.backgrounds.at(0);
    expect(scholar?.trained).toEqual([Selector.parse('skill:arcana'), Selector.parse('skill:lore:academia')]);
  });

  test('names the feat a background grants', () => {
    expect(origins.backgrounds.at(0)?.feats.map(String)).toStrictEqual(['Assurance']);
  });

  test('lists where an ancestry is printed', () => {
    expect(origins.ancestries.every((ancestry) => ancestry.sources.length > 0)).toBe(true);
  });

  test('reads the same lists again for the same registry', () => {
    expect(originContent(registry)).toBe(origins);
  });
});
