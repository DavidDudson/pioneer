import { describe, expect, test } from 'bun:test';

import { ContentKind } from '@pioneer/rules/sdk';

import type { FoundryJournalPage } from './foundry-journal';
import type { JournalDocument } from './foundry-release';
import { KindDataGapReason } from './kind-data-gaps';
import {
  ARCHETYPES_JOURNAL,
  BASIC_MANEUVER,
  BUILD,
  FIGHTER_DEDICATION,
  PHARASMA,
  SUDDEN_CHARGE,
} from './testing/build-fixtures';
import { dataIn, gapKeys, kindDataOf, slugIn } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';
import { gapsOf } from './testing/kind-fixtures';

const translation = translate(BUILD, { journals: [ARCHETYPES_JOURNAL] });

/** One paragraph of plain text, as rich text. */
function paragraph(text: string): unknown[] {
  return [{ type: 'paragraph', content: [{ type: 'text', text }] }];
}

/** The archetypes journal with `pages` added before its own. */
function withPages(...pages: FoundryJournalPage[]): JournalDocument {
  const { journal } = ARCHETYPES_JOURNAL;
  return { ...ARCHETYPES_JOURNAL, journal: { ...journal, pages: [...pages, ...journal.pages] } };
}

function archetypeSlugs({ archetypes }: typeof translation): string[] {
  return archetypes.map(({ envelope }) => String(envelope.slug));
}

describe('translateKindData: feats and class features', () => {
  test('a feat of category classfeature is the class-feature kind, its action its data', () => {
    expect(slugIn(translation, 'reactive-strike')).toBe('class-feature:reactive-strike');
    expect(kindDataOf(translation, 'reactive-strike')).toEqual({
      kind: ContentKind.ClassFeature,
      data: {
        action: { cost: 'reaction', trigger: paragraph('A creature within your reach uses a manipulate action.') },
      },
    });
    expect(dataIn(translation, 'bravery')).toEqual({});
  });

  test('an action feat carries its action; a passive one none', () => {
    expect(dataIn(translation, 'sudden-charge')).toEqual({ category: 'class', action: { cost: 'two' } });
  });

  test("Foundry's null maxTakable is unlimited, and prerequisites keep their text", () => {
    expect(dataIn(translation, 'additional-lore')).toEqual({
      category: 'skill',
      maxTakable: 'unlimited',
      prerequisites: paragraph('trained in Lore'),
    });
  });

  test('a feature category with no kind is reported and the entry has no data', () => {
    const feature = translate([
      { id: 'cLaNdAgGeR000001', name: 'Clan Dagger', type: 'feat', system: { category: 'ancestryfeature' } },
    ]);

    expect(kindDataOf(feature, 'clan-dagger')).toBeUndefined();
    expect(gapsOf(feature)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'category',
      raw: 'ancestryfeature',
    });
  });

  test('a reaction whose trigger was left for rich text keeps the feat without its action', () => {
    const trigger = '<p><strong>Trigger</strong> @UUID[Compendium.pf2e.x.Item.y]</p>';
    const reaction = translate([
      {
        ...SUDDEN_CHARGE,
        system: { ...SUDDEN_CHARGE.system, actionType: { value: 'reaction' }, description: { value: trigger } },
      },
    ]);

    expect(dataIn(reaction, 'sudden-charge')).toEqual({ category: 'class' });
    expect(gapKeys(reaction)).toContain('invalid-data action.trigger');
  });
});

describe('translateKindData: deities and kits', () => {
  test('deity fields map, skills as selectors, spells by rank to content ids', () => {
    expect(dataIn(translation, 'pharasma')).toEqual({
      category: 'deity',
      domains: { primary: ['death', 'fate'], alternate: ['soul'] },
      font: ['heal'],
      attributes: ['con', 'wis'],
      skills: ['skill:medicine'],
      weapons: ['dagger'],
      spells: [{ rank: 1, spell: idOf('spell:mindlink') }],
    });
  });

  test("a deity's spell outside the import is reported and left out", () => {
    const alone = translate([PHARASMA]);

    expect(dataIn(alone, 'pharasma')).toMatchObject({ spells: [] });
    expect(gapKeys(alone)).toContain('unresolved-reference spells.1');
  });

  test('a kit holds its items by id, a container its contents, and costs its paid coins', () => {
    expect(dataIn(translation, 'adventurers-pack')).toEqual({
      price: { coins: { sp: 15 } },
      items: [
        { item: idOf('equipment:backpack'), quantity: 1, contents: [{ item: idOf('equipment:rope'), quantity: 1 }] },
      ],
    });
  });
});

describe('importArchetypes', () => {
  test('a page whose dedication is imported is an archetype, multiclass linking its class', () => {
    const [archetype] = translation.archetypes;
    const uuid = 'Compendium.pf2e.journals.JournalEntry.vx5FGEG34AxI2dow.JournalEntryPage.pAgEfIgHtEr00001';

    expect(archetypeSlugs(translation)).toEqual(['archetype:fighter']);
    expect(archetype?.envelope).toMatchObject({
      name: 'Fighter',
      rarity: 'common',
      externalIds: { foundry: uuid },
      description: paragraph('You have spent time learning the art of warfare.'),
    });
    expect(archetype?.kindData).toEqual({
      kind: ContentKind.Archetype,
      data: { dedication: idOf('feat:fighter-dedication'), multiclass: idOf('class:fighter') },
    });
  });

  test('archetype feats the page links belong to it, the dedication included', () => {
    const archetype = idOf('archetype:fighter');

    expect(dataIn(translation, 'fighter-dedication')).toMatchObject({ archetype });
    expect(dataIn(translation, 'basic-maneuver')).toMatchObject({ archetype });
  });

  test('an archetype feat no imported page links is reported; without journals there are no archetypes', () => {
    const alone = translate([BASIC_MANEUVER]);

    expect(alone.archetypes).toEqual([]);
    expect(gapsOf(alone)).toContainEqual({
      reason: KindDataGapReason.UnresolvedReference,
      field: 'archetype',
      raw: [],
    });
  });

  test("a page linking another archetype's dedication as a prerequisite is not that archetype", () => {
    const razmiran = {
      _id: 'pAgErAzMiRaN0001',
      name: 'Razmiran Priest',
      type: 'text',
      text: {
        content: '<p><strong>Prerequisites</strong> @UUID[Compendium.pf2e.feats-srd.Item.Fighter Dedication]</p>',
      },
    };
    const linked = translate(BUILD, { journals: [withPages(razmiran)] });

    expect(archetypeSlugs(linked)).toEqual(['archetype:fighter']);
    expect(dataIn(linked, 'fighter-dedication')).toMatchObject({ archetype: idOf('archetype:fighter') });
  });

  test('a feat two pages link belongs to the archetype whose dedication its prerequisites name', () => {
    const martial = {
      _id: 'pAgEtWiN00000001',
      name: 'Martial Artist',
      type: 'text',
      text: {
        content:
          '<p>@Embed[Compendium.pf2e.feats-srd.Item.fEaT000000000099 inline]</p>' +
          '<h2>@UUID[Compendium.pf2e.feats-srd.Item.Basic Maneuver]</h2>',
      },
    };
    const dedication = {
      ...FIGHTER_DEDICATION,
      id: 'fEaT000000000099',
      name: 'Martial Artist Dedication',
      system: { ...FIGHTER_DEDICATION.system, traits: { rarity: 'common', value: ['archetype', 'dedication'] } },
    };
    const both = translate([...BUILD, dedication], { journals: [withPages(martial)] });

    expect(archetypeSlugs(both)).toEqual(['archetype:martial-artist', 'archetype:fighter']);
    expect(dataIn(both, 'basic-maneuver')).toMatchObject({ archetype: idOf('archetype:fighter') });
  });
});
