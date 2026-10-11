import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, KIND_DATA, RuleElementKey } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import {
  ACOLYTE,
  ANCESTRY_OUTSIDE,
  ARCHETYPES_JOURNAL,
  BUILD,
  CLAN_DAGGER,
  DWARF,
  FIGHTER,
} from './testing/build-fixtures';
import { dataIn, entryOfKind, gapKeys, grantsIn, ranksIn, rulesIn } from './testing/build-helpers';
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
    expect(rulesIn(translate([DWARF, CLAN_DAGGER]), 'dwarf')).toEqual([
      { key: RuleElementKey.GrantItem, item: idOf('feat:clan-dagger') },
    ]);
    expect(gapsOf(translation)).toContainEqual({
      reason: KindDataGapReason.UnresolvedReference,
      field: 'items',
      raw: 'Compendium.pf2e.ancestryfeatures.Item.Clan Dagger',
    });
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
      { key: RuleElementKey.Proficiency, selector: 'skill:lore-scribing', rank: 'trained' },
      { key: RuleElementKey.GrantItem, item: idOf('feat:student-of-the-canon') },
    ]);
  });

  test("a background's skill feat outside the import is reported", () => {
    expect(gapKeys(translate([ACOLYTE]))).toEqual(['unresolved-reference items']);
  });
});

describe('translateKindData: classes', () => {
  test('a class keeps key attribute, hit points and extra skills', () => {
    expect(dataIn(translation, 'fighter')).toEqual({
      keyAttribute: ['dex', 'str'],
      hitPoints: 10,
      additionalSkills: 3,
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

    expect(grantsIn(translation, 'fighter')).toEqual([
      { key: RuleElementKey.GrantItem, item: idOf('class-feature:reactive-strike') },
      { key: RuleElementKey.GrantItem, item: idOf('class-feature:bravery'), predicate: [{ gte: ['self:level', 3] }] },
      { key: RuleElementKey.ChoiceSet, flag: 'class-feat-1', prompt: 'Fighter feat', choices },
      { key: RuleElementKey.GrantItem, item: { choice: 'class-feat-1' } },
      { key: RuleElementKey.ChoiceSet, flag: 'class-feat-2', prompt: 'Fighter feat', choices, ...atSecond },
      { key: RuleElementKey.GrantItem, item: { choice: 'class-feat-2' }, ...atSecond },
    ]);
  });

  test('a spellcasting rank trains both spell statistics', () => {
    const caster = translate([{ ...FIGHTER, system: { ...FIGHTER.system, spellcasting: 1 } }]);

    expect(ranksIn(caster, 'fighter')).toContainEqual(['spell-attack', 'trained']);
    expect(ranksIn(caster, 'fighter')).toContainEqual(['spell-dc', 'trained']);
  });

  test("shared slot levels off Player Core's schedule, and a named weapon group, are reported", () => {
    const odd = translate([
      {
        ...FIGHTER,
        system: {
          ...FIGHTER.system,
          skillFeatLevels: { value: [1, 2, 3] },
          attacks: { advanced: 0, martial: 0, simple: 1, unarmed: 1, other: { name: 'Firearms', rank: 1 } },
        },
      },
    ]);

    expect(gapKeys(odd)).toContain('unmapped-value skillFeatLevels');
    expect(gapKeys(odd)).toContain('unmapped-field attacks.other');
  });
});
