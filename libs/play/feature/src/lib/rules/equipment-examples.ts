import { ContentKind, contentId, PackId, Slug } from '@pioneer/rules/sdk';

const PLAYER_CORE = PackId.parse('player-core');

/** Examples cite page 1, like the other playground examples; the importer fills real pages. */
const playerCorePage = { kind: 'book', book: 'player-core', page: 1 };

const paragraph = (text: string): unknown => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const idOf = (slug: string): string => contentId(PLAYER_CORE, Slug.parse(slug));

/** The envelope fields every Player Core example shares. */
function playerCore(slug: string, name: string, description: string): object {
  return {
    id: idOf(slug),
    pack: PLAYER_CORE,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [playerCorePage],
    description: [paragraph(description)],
    rules: [],
  };
}

/* Player Core numbers (Foundry pf2e): levels, prices, Bulk and stats. */
const LEATHER_DEX_CAP = 4;
const STEEL_SHIELD_AC = 2;
const STEEL_SHIELD_HARDNESS = 5;
const STEEL_SHIELD_HIT_POINTS = 20;
const BACKPACK_CAPACITY = 4;
const BACKPACK_IGNORED = 2;
const STRIKING_LEVEL = 4;
const STRIKING_PRICE = 65;
const DIAMOND_PRICE = 100;
const PACK_PRICE = 15;
const PACK_CHALK = 10;
const PACK_RATIONS = 2;
const PACK_TORCHES = 5;

export const longsword = {
  ...playerCore('longsword', 'Longsword', 'A long, straight blade.'),
  kind: ContentKind.Weapon,
  level: 0,
  traits: ['versatile-p'],
  data: {
    price: { coins: { gp: 1 } },
    bulk: 1,
    category: 'martial',
    group: 'sword',
    baseItem: 'longsword',
    damage: { dice: 1, die: 'd8', damageType: 'slashing' },
    usage: { type: 'held', hands: 'one' },
  },
};

export const leatherArmor = {
  ...playerCore('leather-armor', 'Leather Armor', 'Armour of boiled and shaped leather.'),
  kind: ContentKind.Armor,
  level: 0,
  data: {
    price: { coins: { gp: 2 } },
    bulk: 1,
    category: 'light',
    group: 'leather',
    baseItem: 'leather-armor',
    acBonus: 1,
    dexCap: LEATHER_DEX_CAP,
    checkPenalty: 1,
  },
};

export const steelShield = {
  ...playerCore('steel-shield', 'Steel Shield', 'A sturdy metal shield.'),
  kind: ContentKind.Shield,
  level: 0,
  data: {
    price: { coins: { gp: 2 } },
    bulk: 1,
    baseItem: 'steel-shield',
    acBonus: STEEL_SHIELD_AC,
    hardness: STEEL_SHIELD_HARDNESS,
    hitPoints: STEEL_SHIELD_HIT_POINTS,
  },
};

export const backpack = {
  ...playerCore('backpack', 'Backpack', 'Holds up to 4 Bulk of gear.'),
  kind: ContentKind.Equipment,
  level: 0,
  data: {
    price: { coins: { sp: 1 } },
    bulk: 'negligible',
    usage: { type: 'worn', slot: 'backpack' },
    container: { capacity: BACKPACK_CAPACITY, ignored: BACKPACK_IGNORED, heldBulk: 'light' },
  },
};

export const minorHealingPotion = {
  ...playerCore('healing-potion-minor', 'Healing Potion (Minor)', 'A vial that heals whoever drinks it.'),
  kind: ContentKind.Consumable,
  level: 1,
  traits: ['consumable', 'healing', 'magical', 'potion', 'vitality'],
  data: {
    price: { coins: { gp: 4 } },
    bulk: 'light',
    category: 'potion',
    damage: { formula: '1d8', damageType: 'vitality', kind: 'healing' },
    usage: { type: 'held', hands: 'one' },
  },
};

export const striking = {
  ...playerCore('striking', 'Striking', 'Adds a damage die to the weapon it is etched on.'),
  kind: ContentKind.Rune,
  level: STRIKING_LEVEL,
  traits: ['magical'],
  data: {
    price: { coins: { gp: STRIKING_PRICE } },
    bulk: 'negligible',
    type: 'fundamental',
    rune: 'striking',
    grade: 1,
    etchedOnto: { item: 'weapon' },
  },
};

export const smallDiamond = {
  ...playerCore('diamond-small', 'Diamond (Small)', 'A small, clear gem.'),
  kind: ContentKind.Treasure,
  level: 0,
  data: { price: { coins: { gp: DIAMOND_PRICE } }, bulk: 'negligible', category: 'gem' },
};

const contained = (slug: string, quantity: number): object => ({ item: idOf(slug), quantity });

export const adventurersPack = {
  ...playerCore('adventurers-pack', 'Adventurer’s Pack', 'The gear most adventurers set out with.'),
  kind: ContentKind.Kit,
  data: {
    price: { coins: { sp: PACK_PRICE } },
    items: [
      {
        ...contained('backpack', 1),
        contents: [
          contained('bedroll', 1),
          contained('chalk', PACK_CHALK),
          contained('flint-and-steel', 1),
          contained('rations', PACK_RATIONS),
          contained('rope', 1),
          contained('soap', 1),
          contained('torch', PACK_TORCHES),
          contained('waterskin', 1),
        ],
      },
    ],
  },
};
