import { describe, expect, test } from 'bun:test';

import { ContentKind, contentPackFromContents } from '@pioneer/rules/sdk';

import { playerCorePack } from './json-packs';

const SPECIES = contentPackFromContents(await playerCorePack()).otherEntries.filter(
  ({ kind }) => kind === ContentKind.CompanionSpecies,
);

function named(name: string): (typeof SPECIES)[number] | undefined {
  return SPECIES.find((entry) => entry.name === name);
}

describe('Player Core companion species', () => {
  test('holds the sixteen animal companions of Player Core pages 206 to 210', () => {
    expect(SPECIES.map(({ name }) => String(name)).toSorted()).toEqual(
      [
        'Ape',
        'Arboreal Sapling',
        'Badger',
        'Bat',
        'Bear',
        'Bird',
        'Boar',
        'Cat',
        'Crocodile',
        'Dromaeosaur',
        'Horse',
        'Riding Drake',
        'Scorpion',
        'Shark',
        'Snake',
        'Wolf',
      ].toSorted(),
    );
  });

  test('the bear is Small, 35 feet, with 8 Hit Points, jaws and an agile claw', () => {
    expect(named('Bear')?.data).toMatchObject({
      block: {
        size: 'small',
        speed: 35,
        ancestryHp: 8,
        extraSkill: 'intimidation',
        attributes: { str: 3, dex: 2, con: 2, int: -4, wis: 1, cha: 0 },
        attacks: [
          { slug: 'jaws', damage: { dice: 1, die: 'd8', damageType: 'piercing' } },
          { slug: 'claw', damage: { dice: 1, die: 'd6', damageType: 'slashing' } },
        ],
      },
    });
  });

  test('the bird flies 60 feet and its land Speed is 10', () => {
    expect(named('Bird')?.data).toMatchObject({ block: { speed: 10, movement: { fly: 60 } } });
  });
});
