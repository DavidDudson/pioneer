import { ContentLicense, ContentPack, Size } from '@pioneer/rules/sdk';

/**
 * Pathfinder Monster Core (2024 remaster). Mechanics are ORC-licensed; see
 * NOTICE.md. Only the fields the SDK schema models are transcribed.
 */
export const monsterCore = ContentPack.define({
  manifest: { id: 'monster-core', title: 'Monster Core', publisher: 'Paizo Inc.', license: ContentLicense.Orc },
  ancestries: [],
  creatures: [
    {
      slug: 'zombie-shambler',
      name: 'Zombie Shambler',
      level: -1,
      size: Size.Medium,
      traits: ['mindless', 'undead', 'unholy', 'zombie'],
      perception: 0,
      attributes: { str: 3, dex: -1, con: 2, int: -5, wis: 0, cha: -2 },
      armorClass: 12,
      saves: { fortitude: 6, reflex: 0, will: 2 },
      hitPoints: 20,
      immunities: ['death-effects', 'disease', 'mental', 'paralyzed', 'poison', 'sleep'],
      weaknesses: [
        { type: 'slashing', value: 5 },
        { type: 'vitality', value: 5 },
      ],
      resistances: [],
      speed: 25,
    },
  ],
});
