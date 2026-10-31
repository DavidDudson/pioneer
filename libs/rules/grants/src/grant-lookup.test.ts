import { describe, expect, test } from 'bun:test';

import {
  ContentId,
  contentId,
  ContentKind,
  ContentLicense,
  contentPackId,
  ContentRegistry,
  EntrySlug,
  PackId,
  putUnsupportedPacks,
  RollOption,
  RuleElement,
} from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { grantLookup } from './grant-lookup';

/** The `legacy` fact of the one feat in a pack published under `license`. */
function featLegacy(license: ContentLicense): boolean | undefined {
  const registry = new ContentRegistry();
  registry.register(new ContentPackBuilder().withLicense(license).withFeat('sudden-charge').build());
  return grantLookup(registry).ofKind(ContentKind.Feat)[0]?.facts?.legacy;
}

function registryOf(...slugs: readonly string[]): ContentRegistry {
  const builder = new ContentPackBuilder();
  for (const slug of slugs) {
    builder.withAncestry(slug);
  }
  const registry = new ContentRegistry();
  registry.register(builder.build());
  return registry;
}

describe('grantLookup', () => {
  test("finds each ancestry by the registry's id, as an ancestry with its traits and sources", () => {
    const registry = registryOf('human');
    const human = ContentId.parse(contentId(PackId.parse('test-pack'), EntrySlug.parse('ancestry:human')));
    const found = grantLookup(registry).entry(human);
    expect(found?.kind).toBe(ContentKind.Ancestry);
    expect(String(found?.name)).toBe('Human');
    expect(found?.rules).toEqual([]);
    expect(found?.rollOptions).toEqual([RollOption.parse('trait:humanoid')]);
    expect(found?.sources.length).toBe(1);
  });

  test('flags the facts of a feat from an Open Game License pack as legacy, and those of any other pack not', () => {
    expect(featLegacy(ContentLicense.Ogl)).toBe(true);
    expect(featLegacy(ContentLicense.Orc)).toBeUndefined();
  });

  test('flags the facts of a feat from an unsupported pack, and those of any other pack not', () => {
    const pack = new ContentPackBuilder().withFeat('sudden-charge').build();
    const registry = new ContentRegistry();
    registry.register(pack);
    const feat = (): boolean | undefined => grantLookup(registry).ofKind(ContentKind.Feat)[0]?.facts?.unsupported;

    expect(feat()).toBeUndefined();
    putUnsupportedPacks(registry, [contentPackId(pack.id)]);
    expect(feat()).toBe(true);
  });

  test('holds legacy content back as unsupported until the character has legacy content on', () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withLicense(ContentLicense.Ogl).withFeat('sudden-charge').build());
    const feat = (legacyContent: boolean): boolean | undefined =>
      grantLookup(registry, legacyContent).ofKind(ContentKind.Feat)[0]?.facts?.unsupported;

    expect(feat(false)).toBe(true);
    expect(feat(true)).toBeUndefined();
  });

  test('never holds back remaster content for want of legacy content', () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withLicense(ContentLicense.Orc).withFeat('sudden-charge').build());
    expect(grantLookup(registry).ofKind(ContentKind.Feat)[0]?.facts?.unsupported).toBeUndefined();
  });

  test('lists ancestries by kind, and nothing of a kind the registry lacks', () => {
    const lookup = grantLookup(registryOf('human', 'elf'));
    expect(lookup.ofKind(ContentKind.Ancestry).map((entry) => String(entry.slug))).toEqual(['human', 'elf']);
    expect(lookup.ofKind(ContentKind.Feat)).toEqual([]);
  });

  test('finds backgrounds and classes, the other kinds a character picks in a root slot', () => {
    const registry = new ContentRegistry();
    registry.register(
      new ContentPackBuilder()
        .withBackground('farmhand', [['con']])
        .withClass('fighter', ['str'])
        .build(),
    );
    const lookup = grantLookup(registry);
    expect(lookup.ofKind(ContentKind.Background).map((entry) => String(entry.slug))).toEqual(['farmhand']);
    expect(lookup.ofKind(ContentKind.Class).map((entry) => String(entry.slug))).toEqual(['fighter']);
  });

  test("finds deities, with what each says of its follower as Foundry's deity sets it", () => {
    const registry = new ContentRegistry();
    registry.register(
      new ContentPackBuilder()
        .withDeity('sarenrae', {
          sanctification: { modal: 'can', what: ['holy'] },
          font: ['heal'],
          skills: ['skill:medicine'],
          weapons: ['scimitar'],
          domains: { primary: ['fire', 'healing'], alternate: ['sun'] },
        })
        .withDeity('irori', { font: ['heal'], weapons: ['fist'] })
        .build(),
    );
    const [sarenrae, irori] = grantLookup(registry).ofKind(ContentKind.Deity);
    expect(sarenrae?.characterOptions?.map(String)).toEqual([
      'deity:primary:sanctification:can:holy',
      'deity:primary:favored-weapon:scimitar',
      'deity:primary:font:heal',
      'deity:primary:skill:medicine',
      'deity:primary:domain:fire',
      'deity:primary:domain:healing',
      'deity:primary:alternate-domain:sun',
    ]);
    expect(sarenrae?.rollOptions.map(String)).toEqual(['domain:fire', 'domain:healing', 'alternate-domain:sun']);
    expect(irori?.characterOptions?.map(String)).toEqual([
      'deity:primary:sanctification:none',
      'deity:primary:favored-weapon:fist',
      'deity:primary:font:heal',
    ]);
  });

  test('exposes the level, rarity, traits and description of an envelope entry, and nothing for an ancestry', () => {
    const registry = new ContentRegistry();
    registry.register(
      new ContentPackBuilder()
        .withAncestry('human')
        .withFeat('sudden-charge', { level: 3, traits: ['fighter'] })
        .build(),
    );
    const lookup = grantLookup(registry);
    const [feat] = lookup.ofKind(ContentKind.Feat);
    expect(Number(feat?.facts?.level)).toBe(3);
    expect(feat?.facts?.rarity).toBe('common');
    expect(feat?.facts?.traits.map(String)).toEqual(['fighter']);
    expect(feat?.facts?.description).toBeDefined();
    expect(lookup.ofKind(ContentKind.Ancestry)[0]?.facts).toBeUndefined();
  });

  test('says nothing of the character beyond its kind for any other kind', () => {
    expect(grantLookup(registryOf('human')).ofKind(ContentKind.Ancestry)[0]?.characterOptions).toBeUndefined();
  });

  test('finds carried items with their rule elements and trait options, which are roots while worn or held', () => {
    const registry = new ContentRegistry();
    const perception = { key: 'FlatModifier', selectors: ['perception'], type: 'item', value: 1 };
    registry.register(
      new ContentPackBuilder()
        .withMagicItem(ContentKind.Equipment, 'cloak', {
          data: { bulk: 'light', usage: { type: 'worn', slot: 'cloak' } },
          traits: ['invested'],
          rules: [perception],
        })
        .build(),
    );
    const [cloak] = grantLookup(registry).ofKind(ContentKind.Equipment);
    expect(cloak?.rules).toEqual([RuleElement.parse(perception)]);
    expect(cloak?.rollOptions).toEqual([RollOption.parse('trait:invested'), RollOption.parse('level:0')]);
  });

  test('finds ancestry features, and an ancestry with the rule elements that grant them', () => {
    const builder = new ContentPackBuilder().withAncestryFeature('keen-eyes');
    const grant = { key: 'GrantItem', item: builder.idOf(ContentKind.AncestryFeature, 'keen-eyes') };
    const registry = new ContentRegistry();
    registry.register(builder.withAncestry('halfling', { rules: [grant] }).build());
    const lookup = grantLookup(registry);
    const [halfling] = lookup.ofKind(ContentKind.Ancestry);
    expect(halfling?.rules).toEqual([RuleElement.parse(grant)]);
    expect(lookup.ofKind(ContentKind.AncestryFeature).map((entry) => String(entry.slug))).toEqual(['keen-eyes']);
  });

  test('finds heritages, each belonging to its ancestry, a versatile one to none', () => {
    const builder = new ContentPackBuilder()
      .withAncestry('dwarf')
      .withHeritage('rock', 'dwarf')
      .withHeritage('changeling');
    const registry = new ContentRegistry();
    registry.register(builder.build());
    const heritages = grantLookup(registry).ofKind(ContentKind.Heritage);
    expect(heritages.map((entry) => [String(entry.slug), entry.belongsTo])).toEqual([
      ['rock', builder.idOf(ContentKind.Ancestry, 'dwarf')],
      ['changeling', undefined],
    ]);
  });

  test("finds feats, which a background grants, each with its category and level, which a feat slot's query reads", () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withFeat('assurance').build());
    expect(
      grantLookup(registry)
        .ofKind(ContentKind.Feat)
        .map((entry) => [String(entry.slug), entry.rollOptions.map(String)]),
    ).toEqual([['assurance', ['category:skill', 'level:1']]]);
  });

  test('finds class features, which a class grants, each tag a roll option a subclass query reads', () => {
    const builder = new ContentPackBuilder()
      .withClassFeature('doctrine')
      .withClassFeature('cloistered-cleric', { tags: ['cleric-doctrine'] });
    const registry = new ContentRegistry();
    registry.register(builder.build());
    const features = grantLookup(registry).ofKind(ContentKind.ClassFeature);
    expect(features.map((entry) => [String(entry.slug), entry.rollOptions.map(String)])).toEqual([
      ['doctrine', ['level:1']],
      ['cloistered-cleric', ['tag:cleric-doctrine', 'level:1']],
    ]);
  });

  test('finds conditions, roots while they last, each saying whether it carries a value', () => {
    const builder = new ContentPackBuilder().withCondition('encumbered').withCondition('clumsy', [], { valued: true });
    const registry = new ContentRegistry();
    registry.register(builder.build());
    const conditions = grantLookup(registry).ofKind(ContentKind.Condition);
    expect(conditions.map((entry) => [String(entry.slug), entry.valued])).toEqual([
      ['encumbered', false],
      ['clumsy', true],
    ]);
  });
});
