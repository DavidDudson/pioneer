import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, CreatureRole, KIND_DATA } from '@pioneer/rules/sdk';

import { kindDataReport } from './dry-run-report';
import { AAPOPH_GRANITESCALE } from './testing/aapoph-granitescale-fixture';
import { translate } from './testing/import-fixtures';
import { contentEntry, entryOf, FOUNDRY_NULL } from './testing/kind-fixtures';
import { TOR_LINNORM } from './testing/tor-linnorm-fixture';
import { ZOMBIE_SHAMBLER } from './testing/zombie-shambler-fixture';

/** Golden tests on real Monster Core creatures: a level -1 zombie, a mid-level humanoid and a level 21 dragon. */

describe('translateCreature: core statistics', () => {
  test('a level -1 zombie: size, defences, IWR, skills and senses', () => {
    const translation = translate([ZOMBIE_SHAMBLER]);
    const entry = entryOf(translation, 'zombie-shambler');

    expect(entry?.envelope.level).toBe(-1);
    expect(entry?.envelope.externalIds.foundry).toBe('Compendium.pf2e.pathfinder-monster-core.Actor.Xo4IGzw28hivgMmM');
    expect(entry?.kindData).toStrictEqual({
      kind: ContentKind.Creature,
      data: {
        role: CreatureRole.Monster,
        size: 'medium',
        perception: 0,
        attributes: { str: 3, dex: -2, con: 2, int: -5, wis: 0, cha: -2 },
        armorClass: 12,
        saves: { fortitude: 6, reflex: 0, will: 2 },
        hitPoints: 20,
        immunities: ['death-effects', 'disease', 'paralyzed', 'poison', 'unconscious', 'bleed'],
        weaknesses: [
          { type: 'vitality', value: 5 },
          { type: 'slashing', value: 5 },
        ],
        resistances: [],
        speed: 25,
        skills: [{ skill: 'athletics', modifier: 7 }],
        senses: [{ sense: 'darkvision' }],
      },
    });
  });

  test('a mid-level humanoid: languages, resistances and several skills', () => {
    const entry = entryOf(translate([AAPOPH_GRANITESCALE]), 'aapoph-granitescale');

    expect(entry?.envelope.level).toBe(6);
    expect(entry?.envelope.traits).toStrictEqual(['humanoid', 'mutant', 'serpentfolk']);
    expect(entry?.kindData?.data).toMatchObject({
      role: CreatureRole.Monster,
      resistances: [{ type: 'poison', value: 5 }],
      languages: ['aklo', 'common', 'sakvroth'],
      skills: [
        { skill: 'acrobatics', modifier: 14 },
        { skill: 'athletics', modifier: 15 },
        { skill: 'intimidation', modifier: 15 },
      ],
    });
  });

  test('a level 21 dragon: a Strength above a character’s +7, and another kind of speed', () => {
    const entry = entryOf(translate([TOR_LINNORM]), 'tor-linnorm');

    expect(entry?.envelope.level).toBe(21);
    expect(entry?.kindData?.data).toMatchObject({
      size: 'gargantuan',
      attributes: { str: 11 },
      speeds: [
        { movement: 'climb', speed: 35 },
        { movement: 'fly', speed: 100 },
        { movement: 'swim', speed: 60 },
      ],
    });
  });

  test.each([ZOMBIE_SHAMBLER, AAPOPH_GRANITESCALE, TOR_LINNORM])('$name is a valid creature entry', (fixture) => {
    const translation = translate([fixture]);
    const entry = entryOf(translation, fixture.name.toLowerCase().replaceAll(' ', '-'));

    expect(entry?.kindData?.kind).toBe(ContentKind.Creature);
    expect(KIND_DATA[ContentKind.Creature].safeParse(entry?.kindData?.data).success).toBe(true);
    expect(ContentEntry.safeParse(contentEntry(entry)).error).toBeUndefined();
  });

  test('a creature with no land speed has a speed of 0', () => {
    const banshee = {
      ...ZOMBIE_SHAMBLER,
      id: 'bAnShEe00000001',
      name: 'Banshee',
      system: {
        ...ZOMBIE_SHAMBLER.system,
        attributes: {
          ...(ZOMBIE_SHAMBLER.system as { attributes: object }).attributes,
          speed: { value: FOUNDRY_NULL, otherSpeeds: [{ type: 'fly', value: 60 }] },
        },
      },
    };
    const entry = entryOf(translate([banshee]), 'banshee');

    expect(entry?.kindData?.data).toMatchObject({ speed: 0, speeds: [{ movement: 'fly', speed: 60 }] });
  });
});

describe('translateCreature: what has no home', () => {
  test('reports values the stat block cannot hold, with the field and the raw value', () => {
    const translation = translate([TOR_LINNORM, ZOMBIE_SHAMBLER]);
    const gaps = kindDataReport(translation).kindDataGaps.map(({ key }) => key);

    expect(gaps).toContain('unmapped-value attributes.weaknesses.type');
  });

  test('adds the creature’s vocabulary: its traits and languages', () => {
    const translation = translate([AAPOPH_GRANITESCALE]);
    const vocabulary: string[] = translation.vocabulary.map(({ envelope }) => envelope.slug);

    expect(vocabulary).toContain('language:aklo');
  });
});
