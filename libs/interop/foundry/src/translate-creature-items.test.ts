import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind } from '@pioneer/rules/sdk';

import { ARBITER } from './testing/arbiter-fixture';
import { AZARKETI_CRAB_CATCHER } from './testing/azarketi-crab-catcher-fixture';
import { coreRulesEntry, coreRulesId, translate } from './testing/import-fixtures';
import { contentEntry, entryOf } from './testing/kind-fixtures';
import { TOR_LINNORM_ITEMS } from './testing/tor-linnorm-items-fixture';

/** Golden tests on real Monster Core creatures: a spellcaster, a multiattack monster, and a humanoid with gear. */

const SPELLS = ['read-omens', 'command', 'mending', 'sanctuary'].map((name) => coreRulesEntry(ContentKind.Spell, name));
const DAGGER = coreRulesEntry(ContentKind.Weapon, 'dagger');

function dataOf(fixture: typeof ARBITER, known = [...SPELLS, DAGGER]): Record<string, unknown> | undefined {
  const data = entryOf(translate([fixture], { known }), fixture.name.toLowerCase().replaceAll(' ', '-'))?.kindData;
  return data?.data;
}

describe('translateCreature: spellcasting', () => {
  test('an innate caster: its entry, DC, attack and spells by rank, uses and id', () => {
    expect(dataOf(ARBITER)?.['spellcasting']).toStrictEqual([
      {
        name: 'Divine Innate Spells',
        tradition: 'divine',
        preparation: 'innate',
        dc: 17,
        attack: 9,
        spells: [
          { spell: coreRulesId('spell:read-omens'), rank: 4 },
          { spell: coreRulesId('spell:command'), rank: 1 },
          { spell: coreRulesId('spell:mending'), rank: 1, uses: 3 },
          { spell: coreRulesId('spell:sanctuary'), rank: 1 },
        ],
      },
    ]);
  });

  test('a spell no loaded pack has is reported with its name, not invented', () => {
    const translation = translate([ARBITER], { known: [] });
    const gaps = translation.kindDataGaps.filter(({ field }) => field === 'spellcasting.spells');

    expect(gaps.map(({ raw }) => raw)).toStrictEqual(['Read Omens', 'Command', 'Mending', 'Sanctuary']);
  });

  test('the abilities beside it: a passive trait with a rule, a two-action activity', () => {
    const abilities = dataOf(ARBITER)?.['abilities'] as { name: string; cost?: string; rules: unknown[] }[];

    expect(abilities.map(({ name, cost }) => [name, cost])).toStrictEqual([
      ['Locate Aeon', undefined],
      ['+1 Status to All Saves vs. Magic', undefined],
      ['Electrical Burst', 'two'],
    ]);
    expect(abilities[1]?.rules).toHaveLength(1);
  });
});

describe('translateCreature: strikes', () => {
  test('a level 21 dragon’s jaws, claw and tail: bonus, damage with its flat bonus, reach and attack effects', () => {
    const strikes = dataOf(TOR_LINNORM_ITEMS)?.['strikes'] as { name: string }[];

    expect(strikes).toMatchObject([
      {
        name: 'Jaws',
        range: 'melee',
        bonus: 40,
        damage: [{ dice: 4, die: 'd12', bonus: 19, damageType: 'piercing' }],
        reach: 30,
      },
      { name: 'Claw', bonus: 40, damage: [{ dice: 4, die: 'd8', bonus: 19, damageType: 'slashing' }], reach: 30 },
      { name: 'Tail', bonus: 40, damage: [{ dice: 4, die: 'd6', bonus: 19, damageType: 'bludgeoning' }], reach: 30 },
    ]);
    expect(strikes.map(({ name }) => name)).toStrictEqual(['Jaws', 'Claw', 'Tail']);
  });

  test('names an attack effect from Foundry’s lang table or the ability it points at', () => {
    const lang = { PF2E: { AttackEffectImprovedGrab: 'Improved Grab' } };
    const translation = translate([TOR_LINNORM_ITEMS], { lang });
    const strikes = entryOf(translation, 'tor-linnorm')?.kindData?.data as unknown as {
      effects?: { content: { text: string }[] }[];
    };

    expect(JSON.stringify(strikes)).toContain('Improved Grab');
  });
});

describe('translateCreature: an NPC with gear', () => {
  test('carried equipment links to its entry, and a Lore is a skill', () => {
    const data = dataOf(AZARKETI_CRAB_CATCHER);

    expect(data?.['items']).toStrictEqual([{ item: coreRulesId('weapon:dagger') }]);
    expect(data?.['skills']).toContainEqual({ skill: 'underwater-lore', modifier: 4 });
  });

  test('gear without an entry is reported, and a reaction keeps its trigger', () => {
    const translation = translate([AZARKETI_CRAB_CATCHER], { known: [DAGGER] });
    const abilities = entryOf(translation, 'azarketi-crab-catcher')?.kindData?.data as unknown as {
      abilities: { name: string; cost?: string; trigger?: unknown }[];
    };
    const swim = abilities.abilities.find(({ name }) => name === 'Swim Away');

    expect(translation.kindDataGaps.filter(({ field }) => field === 'items').map(({ raw }) => raw)).toStrictEqual([
      'Crab Cage',
    ]);
    expect(swim).toMatchObject({ cost: 'reaction' });
    expect(swim?.trigger).toBeDefined();
  });
});

describe('translateCreature: validity', () => {
  test.each([ARBITER, AZARKETI_CRAB_CATCHER, TOR_LINNORM_ITEMS])('$name is a valid creature entry', (fixture) => {
    const entry = entryOf(
      translate([fixture], { known: [...SPELLS, DAGGER] }),
      fixture.name.toLowerCase().replaceAll(' ', '-'),
    );

    expect(ContentEntry.safeParse(contentEntry(entry)).error).toBeUndefined();
  });
});
