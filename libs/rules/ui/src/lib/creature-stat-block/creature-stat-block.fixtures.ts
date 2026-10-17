import { contentId, ContentText, CreatureData, EntrySlug, Level, PackId, RichText } from '@pioneer/rules/sdk';

import type { StatBlockCreature } from './creature-stat-block';

const PLAYER_CORE = PackId.parse('player-core');

const HEAL_SPELL = contentId(PLAYER_CORE, EntrySlug.parse('spell:heal'));
const TORCH_ITEM = contentId(PLAYER_CORE, EntrySlug.parse('equipment:torch'));

/** A creature with every part of the stat block: the busiest page the layout has to hold. */
export const GOBLIN_WARCHANTER: StatBlockCreature = {
  name: ContentText.parse('Goblin Warchanter'),
  level: Level.parse(1),
  traits: ['goblin', 'humanoid'],
  data: CreatureData.parse({
    role: 'monster',
    size: 'small',
    perception: 7,
    attributes: { str: 0, dex: 3, con: 1, int: 0, wis: 1, cha: 2 },
    armorClass: 17,
    saves: { fortitude: 5, reflex: 8, will: 5 },
    hitPoints: 16,
    immunities: ['poison'],
    weaknesses: [{ type: 'fire', value: 5 }],
    resistances: [{ type: 'physical', value: 2, exceptions: ['silver'] }],
    speed: 25,
    speeds: [{ movement: 'climb', speed: 10 }],
    senses: [{ sense: 'darkvision', range: 60 }],
    languages: ['common', 'goblin'],
    skills: [
      { skill: 'acrobatics', modifier: 8 },
      { skill: 'stealth', modifier: 8 },
    ],
    strikes: [
      {
        name: 'dogslicer',
        range: 'melee',
        bonus: 9,
        damage: [{ dice: 1, die: 'd6', damageType: 'slashing', bonus: 2 }],
        traits: ['agile', 'backstabber'],
        reach: 5,
      },
      {
        name: 'shortbow',
        range: 'ranged',
        bonus: 9,
        damage: [{ dice: 1, die: 'd6', damageType: 'piercing' }],
        traits: ['deadly-d10'],
        increment: 60,
      },
    ],
    abilities: [
      {
        name: 'Goblin Scuttle',
        cost: 'reaction',
        trigger: [
          { type: 'paragraph', content: [{ type: 'text', text: 'An ally ends a move adjacent to the goblin.' }] },
        ],
        traits: [],
        description: [{ type: 'paragraph', content: [{ type: 'text', text: 'The goblin Steps.' }] }],
        rules: [],
      },
      {
        name: 'Cheerful Tune',
        traits: ['auditory'],
        frequency: { max: 1, per: 'round' },
        description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Allies in 30 feet gain a +1 bonus.' }] }],
        rules: [],
      },
    ],
    spellcasting: [
      {
        name: 'Primal Innate Spells',
        tradition: 'primal',
        preparation: 'innate',
        dc: 17,
        attack: 9,
        spells: [{ spell: HEAL_SPELL, rank: 1, uses: 2 }],
      },
    ],
    items: [{ item: TORCH_ITEM, quantity: 2 }],
    recallKnowledge: RichText.parse([
      { type: 'paragraph', content: [{ type: 'text', text: 'Goblins sing as they fight.' }] },
    ]),
  }),
};

/** A creature with only the core numbers, as a hand-written entry is: nothing beyond them shows. */
export const GIANT_RAT: StatBlockCreature = {
  name: ContentText.parse('Giant Rat'),
  level: Level.parse(-1),
  traits: ['animal'],
  data: CreatureData.parse({
    role: 'monster',
    size: 'small',
    perception: 4,
    attributes: { str: 0, dex: 3, con: 1, int: -4, wis: 1, cha: -2 },
    armorClass: 14,
    saves: { fortitude: 5, reflex: 7, will: 3 },
    hitPoints: 8,
    immunities: [],
    weaknesses: [],
    resistances: [],
    speed: 20,
  }),
};
