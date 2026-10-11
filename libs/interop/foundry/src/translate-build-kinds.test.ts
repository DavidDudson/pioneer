import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, KIND_DATA, RuleElementKey } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import {
  ACOLYTE,
  BRAVERY,
  ANCESTRY_OUTSIDE,
  ARCHETYPES_JOURNAL,
  BUILD,
  CLAN_DAGGER,
  DWARF,
  FIGHTER,
} from './testing/build-fixtures';
import { dataIn, entryOfKind, gapKeys, grantsIn, ranksIn, rulesIn, slotFlagsIn } from './testing/build-helpers';
import { coreRulesEntry, coreRulesId, idOf, known, translate } from './testing/import-fixtures';
import { contentEntry, gapsOf } from './testing/kind-fixtures';

const translation = translate(BUILD, { journals: [ARCHETYPES_JOURNAL] });
const ALL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

describe('translateKindData: one fixture per build kind, translated and parsed', () => {
  test.each([
    ['dwarf', ContentKind.Ancestry],
    ['ancient-blooded-dwarf', ContentKind.Heritage],
    ['acolyte', ContentKind.Background],
    ['fighter', ContentKind.Class],
    ['reactive-strike', ContentKind.ClassFeature],
    ['sudden-charge', ContentKind.Feat],
    ['pharasma', ContentKind.Deity],
    ['adventurers-pack', ContentKind.Kit],
  ] as const)('%s parses against its kind data and as a ContentEntry', (name, kind) => {
    const entry = entryOfKind(translation, kind, name);

    expect(KIND_DATA[kind].safeParse(entry?.kindData?.data).success).toBe(true);
    expect(ContentEntry.safeParse(contentEntry(entry)).error).toBeUndefined();
  });

  test('an archetype from the journal parses against ArchetypeData and as a ContentEntry', () => {
    const [archetype] = translation.archetypes;

    expect(KIND_DATA[ContentKind.Archetype].safeParse(archetype?.kindData.data).success).toBe(true);
    expect(ContentEntry.safeParse(contentEntry(archetype)).error).toBeUndefined();
  });
});

describe('translateKindData: ancestries and heritages', () => {
  test('ancestry fields map; languages and vision are vocabulary entries by slug', () => {
    expect(dataIn(translation, 'dwarf')).toEqual({
      hitPoints: 10,
      size: 'medium',
      speed: 20,
      reach: 5,
      boosts: [['con'], ['wis'], ALL],
      flaws: ['cha'],
      languages: [coreRulesId('language:common'), coreRulesId('language:dwarven')],
      additionalLanguages: { count: 0, options: [coreRulesId('language:petran')] },
      vision: coreRulesId('sense:darkvision'),
    });
  });

  test("an ancestry's features become GrantItem elements; unresolved ones are reported", () => {
    expect(rulesIn(translate([DWARF, CLAN_DAGGER]), 'dwarf')[0]).toEqual({
      key: RuleElementKey.GrantItem,
      item: idOf('feat:clan-dagger'),
    });
    expect(gapsOf(translation)).toContainEqual({
      reason: KindDataGapReason.UnresolvedReference,
      field: 'items',
      raw: 'Compendium.pf2e.ancestryfeatures.Item.Clan Dagger',
    });
  });

  test("an ancestry opens its ancestry feat slots on Player Core's schedule, feats with its trait", () => {
    const rules = rulesIn(translation, 'dwarf');

    expect(slotFlagsIn(translation, 'dwarf', 'ancestry-feat')).toEqual([
      'ancestry-feat-1',
      'ancestry-feat-5',
      'ancestry-feat-9',
      'ancestry-feat-13',
      'ancestry-feat-17',
    ]);
    expect(rules).toContainEqual({
      key: RuleElementKey.ChoiceSet,
      flag: 'ancestry-feat-5',
      prompt: 'Dwarf feat',
      choices: { kind: ContentKind.Feat, filter: ['item:trait:dwarf', { lte: ['item:level', 'self:level'] }] },
      predicate: [{ gte: ['self:level', 5] }],
    });
    expect(rules).toContainEqual({
      key: RuleElementKey.GrantItem,
      item: { choice: 'ancestry-feat-5' },
      predicate: [{ gte: ['self:level', 5] }],
    });
  });

  test('language free text, unknown languages and senses are reported; normal vision is none', () => {
    const odd = translate([
      {
        ...DWARF,
        system: {
          ...DWARF.system,
          languages: { custom: 'Gnomish dialect', value: ['common', 'sylvan-x'] },
          vision: 'normal',
        },
      },
    ]);
    const blind = translate([{ ...DWARF, system: { ...DWARF.system, vision: 'tremorsense-x' } }]);

    expect(dataIn(odd, 'dwarf')).toMatchObject({ languages: [coreRulesId('language:common')] });
    expect(dataIn(odd, 'dwarf')).not.toHaveProperty('vision');
    expect(gapKeys(odd)).toContain('unmapped-field languages.custom');
    expect(gapKeys(odd)).toContain('unresolved-reference languages.value');
    expect(gapKeys(blind)).toContain('unresolved-reference vision');
  });

  test('an attribute Pioneer does not have is reported and dropped, leaving no empty boost', () => {
    const lucky = translate([
      { ...DWARF, system: { ...DWARF.system, boosts: { '0': { value: ['con'] }, '1': { value: ['luck'] } } } },
    ]);

    expect(dataIn(lucky, 'dwarf')).toMatchObject({ boosts: [['con']] });
    expect(gapsOf(lucky)).toContainEqual({ reason: KindDataGapReason.UnmappedValue, field: 'boosts.1', raw: 'luck' });
  });

  test('an unknown size, or hands other than two, is reported', () => {
    const odd = translate([{ ...DWARF, system: { ...DWARF.system, size: 'colossal', hands: 4 } }]);

    expect(gapsOf(odd)).toContainEqual({ reason: KindDataGapReason.UnmappedValue, field: 'size', raw: 'colossal' });
    expect(gapsOf(odd)).toContainEqual({ reason: KindDataGapReason.UnmappedValue, field: 'hands', raw: 4 });
  });

  test('a heritage names its ancestry by UUID among the documents; a versatile heritage has none', () => {
    expect(dataIn(translation, 'ancient-blooded-dwarf')).toEqual({ ancestry: idOf('ancestry:dwarf') });
    expect(dataIn(translation, 'changeling')).toEqual({});
  });
});

describe('translateKindData: heritages of ancestries outside the import', () => {
  test("resolve by slug among the other packs' entries, or are reported", () => {
    const elf = coreRulesEntry(ContentKind.Ancestry, 'elf');
    const found = translate([ANCESTRY_OUTSIDE], { known: [...known, elf] });
    const missing = translate([ANCESTRY_OUTSIDE]);

    expect(dataIn(found, 'seer-elf')).toEqual({ ancestry: coreRulesId('ancestry:elf') });
    expect(dataIn(missing, 'seer-elf')).toEqual({});
    expect(gapKeys(missing)).toEqual(['unresolved-reference ancestry']);
  });
});

describe('translateKindData: backgrounds', () => {
  test('a background keeps its boosts; trained skills and Lore become Proficiency, its feat a GrantItem', () => {
    expect(dataIn(translation, 'acolyte')).toEqual({ boosts: [['int', 'wis'], ALL] });
    expect(rulesIn(translation, 'acolyte')).toEqual([
      { key: RuleElementKey.Proficiency, selector: 'skill:religion', rank: 'trained' },
      { key: RuleElementKey.Proficiency, selector: 'skill:lore:scribing', rank: 'trained' },
      { key: RuleElementKey.GrantItem, item: idOf('feat:student-of-the-canon') },
    ]);
  });

  test("a background's skill feat outside the import is reported", () => {
    expect(gapKeys(translate([ACOLYTE]))).toEqual(['unresolved-reference items']);
  });
});

describe('translateKindData: classes', () => {
  test('a class keeps key attribute, hit points, extra skills and skill increase levels', () => {
    expect(dataIn(translation, 'fighter')).toEqual({
      keyAttribute: ['dex', 'str'],
      hitPoints: 10,
      additionalSkills: 3,
      skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    });
  });

  test("a class's starting ranks are Proficiency elements, class DC trained, untrained left out", () => {
    expect(ranksIn(translation, 'fighter')).toEqual([
      ['perception', 'expert'],
      ['save:fortitude', 'expert'],
      ['save:reflex', 'expert'],
      ['save:will', 'trained'],
      ['attack:unarmed', 'expert'],
      ['attack:simple', 'expert'],
      ['attack:martial', 'expert'],
      ['attack:advanced', 'trained'],
      ['defense:unarmored', 'trained'],
      ['defense:light', 'trained'],
      ['defense:medium', 'trained'],
      ['defense:heavy', 'trained'],
      ['class-dc', 'trained'],
    ]);
  });

  test('class features are granted from their level, and each class feat level opens a slot', () => {
    const atSecond = { predicate: [{ gte: ['self:level', 2] }] };
    const choices = { kind: ContentKind.Feat, filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] };

    expect(grantsIn(translation, 'fighter').slice(0, 6)).toEqual([
      { key: RuleElementKey.GrantItem, item: idOf('class-feature:reactive-strike') },
      { key: RuleElementKey.GrantItem, item: idOf('class-feature:bravery'), predicate: [{ gte: ['self:level', 3] }] },
      { key: RuleElementKey.ChoiceSet, flag: 'class-feat-1', prompt: 'Fighter feat', choices },
      { key: RuleElementKey.GrantItem, item: { choice: 'class-feat-1' } },
      { key: RuleElementKey.ChoiceSet, flag: 'class-feat-2', prompt: 'Fighter feat', choices, ...atSecond },
      { key: RuleElementKey.GrantItem, item: { choice: 'class-feat-2' }, ...atSecond },
    ]);
  });

  test("general and skill feat slots follow Foundry's levels, else Player Core's", () => {
    const rogue = translate([{ ...FIGHTER, system: { ...FIGHTER.system, skillFeatLevels: { value: [1, 2, 3] } } }]);

    expect(slotFlagsIn(translation, 'fighter', 'general-feat')).toEqual([
      'general-feat-3',
      'general-feat-7',
      'general-feat-11',
      'general-feat-15',
      'general-feat-19',
    ]);
    expect(slotFlagsIn(translation, 'fighter', 'skill-feat')).toHaveLength(10);
    expect(slotFlagsIn(rogue, 'fighter', 'skill-feat')).toEqual(['skill-feat-1', 'skill-feat-2', 'skill-feat-3']);
    expect(rulesIn(translation, 'fighter')).toContainEqual({
      key: RuleElementKey.ChoiceSet,
      flag: 'skill-feat-2',
      prompt: 'Skill feat',
      choices: { kind: ContentKind.Feat, filter: ['item:trait:skill', { lte: ['item:level', 'self:level'] }] },
      predicate: [{ gte: ['self:level', 2] }],
    });
  });

  test('a spellcasting rank is reported, as its tradition comes from a feature, not the class', () => {
    const caster = translate([{ ...FIGHTER, system: { ...FIGHTER.system, spellcasting: 1 } }]);

    expect(ranksIn(caster, 'fighter').map(([selector]) => selector)).not.toContain('spell-attack');
    expect(gapsOf(caster)).toContainEqual({ reason: KindDataGapReason.UnmappedField, field: 'spellcasting', raw: 1 });
  });

  test('a granted item whose level Foundry writes as text still grants from that level', () => {
    const items = { b1: { level: '3', name: 'Bravery', uuid: 'Compendium.pf2e.classfeatures.Item.Bravery' } };
    const texty = translate([{ ...FIGHTER, system: { ...FIGHTER.system, items } }, BRAVERY]);

    expect(rulesIn(texty, 'fighter')).toContainEqual({
      key: RuleElementKey.GrantItem,
      item: idOf('class-feature:bravery'),
      predicate: [{ gte: ['self:level', 3] }],
    });
    expect(gapKeys(texty)).not.toContain('invalid-data ');
  });

  test("ancestry feat levels off Player Core's schedule and a named weapon group are reported", () => {
    const odd = translate([
      {
        ...FIGHTER,
        system: {
          ...FIGHTER.system,
          ancestryFeatLevels: { value: [1, 3] },
          attacks: { advanced: 0, martial: 0, simple: 1, unarmed: 1, other: { name: 'Firearms', rank: 1 } },
        },
      },
    ]);

    expect(gapKeys(odd)).toContain('unmapped-value ancestryFeatLevels');
    expect(gapKeys(odd)).toContain('unmapped-field attacks.other');
  });

  test("a class off Player Core's skill increase schedule keeps its own levels", () => {
    const everyLevel = Array.from({ length: 19 }, (_unused, index) => index + 2);
    const rogueLike = translate([{ ...FIGHTER, system: { ...FIGHTER.system, skillIncreaseLevels: { value: everyLevel } } }]);

    expect(dataIn(rogueLike, 'fighter')).toMatchObject({ skillIncreaseLevels: everyLevel });
    expect(gapKeys(rogueLike)).not.toContain('unmapped-field skillIncreaseLevels');
  });
});
