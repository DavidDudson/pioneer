import type { DocumentFixture } from './import-fixtures';
import { FOUNDRY_NULL } from './kind-fixtures';
import { FIREBALL } from './magic-fixtures';

/** Fixture weapons, armour, shields, equipment, consumables, treasure and runes, shaped as `pf2e-8.6.0` has them. */

/** Fields every physical item has, at Foundry's defaults. */
const PHYSICAL_DEFAULTS = {
  baseItem: FOUNDRY_NULL,
  bulk: { value: 0 },
  containerId: FOUNDRY_NULL,
  hardness: 0,
  hp: { max: 0, value: 0 },
  material: { grade: FOUNDRY_NULL, type: FOUNDRY_NULL },
  price: { value: {} },
  quantity: 1,
  size: 'med',
};

export function physical({ id, name, type }: DocumentFixture, system: object): DocumentFixture {
  return { id, name, type, system: { ...PHYSICAL_DEFAULTS, level: { value: 0 }, ...system } };
}

const NO_WEAPON_RUNES = { potency: 0, property: [], striking: 0 };

/** Fields every weapon has, at Foundry's defaults. */
const WEAPON_DEFAULTS = {
  ammo: FOUNDRY_NULL,
  bonus: { value: 0 },
  bonusDamage: { value: 0 },
  expend: FOUNDRY_NULL,
  grade: FOUNDRY_NULL,
  range: FOUNDRY_NULL,
  reload: { value: FOUNDRY_NULL },
  runes: NO_WEAPON_RUNES,
  specific: FOUNDRY_NULL,
  splashDamage: { value: 0 },
};

export function weapon(id: string, name: string, system: object): DocumentFixture {
  return physical({ id, name, type: 'weapon' }, { ...WEAPON_DEFAULTS, ...system });
}

export const LONGSWORD = weapon('Aej3xxn3aeGWQ0bx', 'Longsword', {
  baseItem: 'longsword',
  bulk: { value: 1 },
  category: 'martial',
  damage: { damageType: 'slashing', dice: 1, die: 'd8' },
  group: 'sword',
  price: { value: { gp: 1 } },
  usage: { value: 'held-in-one-hand' },
});

const LONGBOW = weapon('MVAWttmT0wC0gxcX', 'Longbow', {
  baseItem: 'longbow',
  bulk: { value: 2 },
  category: 'martial',
  damage: { damageType: 'piercing', dice: 1, die: 'd8' },
  group: 'bow',
  price: { value: { gp: 6 } },
  range: 100,
  reload: { value: '0' },
  ammo: { baseType: 'arrows', builtIn: false, capacity: FOUNDRY_NULL },
  expend: 1,
  usage: { value: 'held-in-one-plus-hands' },
});

const ALCHEMISTS_FIRE = weapon('4tbhGjqCqAAzC9pO', "Alchemist's Fire (Moderate)", {
  baseItem: 'alchemical-bomb',
  bonus: { value: 1 },
  bulk: { value: 0.1 },
  category: 'martial',
  damage: { damageType: 'fire', dice: 2, die: 'd8', persistent: { faces: FOUNDRY_NULL, number: 2, type: 'fire' } },
  group: 'bomb',
  level: { value: 3 },
  price: { value: { gp: 10 } },
  range: 20,
  splashDamage: { value: 2 },
  usage: { value: 'held-in-one-hand' },
});

export const FLAMING_LONGSWORD = weapon('fLaMiNgL0ngsw0rd', 'Searing Longsword', {
  baseItem: 'longsword',
  bonus: { value: 1 },
  bulk: { value: 1 },
  category: 'martial',
  damage: { damageType: 'slashing', dice: 1, die: 'd8' },
  group: 'sword',
  level: { value: 8 },
  material: { grade: 'standard', type: 'cold-iron' },
  price: { value: { gp: 500 } },
  runes: { potency: 1, property: ['flaming', 'greaterFrost'], striking: 1 },
  specific: {
    material: { grade: 'standard', type: 'cold-iron' },
    runes: { potency: 1, property: ['flaming', 'greaterFrost'], striking: 1 },
  },
  usage: { value: 'held-in-one-hand' },
});

const FULL_PLATE = physical(
  { id: 'BmfF7AyG5ZcdG0Xu', name: 'Full Plate', type: 'armor' },
  {
    acBonus: 6,
    baseItem: 'full-plate',
    bulk: { value: 4 },
    category: 'heavy',
    checkPenalty: -3,
    dexCap: 0,
    group: 'plate',
    level: { value: 2 },
    price: { value: { gp: 30 } },
    runes: { potency: 0, property: [], resilient: 0 },
    speedPenalty: -10,
    strength: 4,
  },
);

export const STEEL_SHIELD = physical(
  { id: 'Yr9yCuJiAlFh3QEB', name: 'Steel Shield', type: 'shield' },
  {
    acBonus: 2,
    baseItem: 'steel-shield',
    bulk: { value: 1 },
    hardness: 5,
    hp: { max: 20, value: 20 },
    price: { value: { gp: 2 } },
    runes: { reinforcing: 0 },
    speedPenalty: 0,
  },
);

export const BACKPACK = physical(
  { id: '3lgwjrFEsQVKzhh7', name: 'Backpack', type: 'backpack' },
  {
    bulk: { capacity: 4, heldOrStowed: 0.1, ignored: 2, value: 0 },
    collapsed: false,
    price: { value: { sp: 1 } },
    stowing: true,
    usage: { value: 'wornbackpack' },
  },
);

const CLOAK_OF_ELVENKIND = physical(
  { id: 'cLoAkOfElVeNkInD', name: 'Cloak of Elvenkind', type: 'equipment' },
  {
    bulk: { value: 0.1 },
    level: { value: 7 },
    price: { value: { gp: 360 } },
    usage: { value: 'worncloak' },
  },
);

const HEADBAND_OF_INSPIRED_WISDOM = physical(
  { id: 'hEaDbAnDwIsD0m01', name: 'Headband of Inspired Wisdom', type: 'equipment' },
  {
    apex: { attribute: 'wis' },
    level: { value: 17 },
    price: { value: { gp: 15_000 } },
    usage: { value: 'wornheadwear' },
  },
);

export const HEALING_POTION = physical(
  { id: 'hEaLiNgP0t10n001', name: 'Healing Potion (Minor)', type: 'consumable' },
  {
    category: 'potion',
    damage: { formula: '1d8', kind: 'healing', type: 'vitality' },
    level: { value: 1 },
    price: { value: { gp: 4 } },
    spell: FOUNDRY_NULL,
    usage: { value: 'held-in-one-hand' },
    uses: { autoDestroy: true, max: 1, value: 1 },
  },
);

const FIREBALL_WAND = physical(
  { id: 'wAnDoFfIrEbAlL01', name: 'Magic Wand (3rd-Rank Spell)', type: 'consumable' },
  {
    bulk: { value: 0.1 },
    category: 'wand',
    damage: FOUNDRY_NULL,
    level: { value: 7 },
    price: { per: 1, value: { gp: 360 } },
    spell: {
      name: FIREBALL.name,
      system: { ...FIREBALL.system, location: { heightenedLevel: 3, value: FOUNDRY_NULL } },
    },
    usage: { value: 'held-in-one-hand' },
    uses: { autoDestroy: false, max: 1, value: 1 },
  },
);

const ARROWS = physical(
  { id: 'w2ENw2VMPcsbif8g', name: 'Arrows', type: 'ammo' },
  {
    baseItem: 'arrows',
    bulk: { value: 0.1 },
    craftableAs: FOUNDRY_NULL,
    price: { per: 10, value: { sp: 1 } },
    quantity: 10,
    uses: { autoDestroy: true, max: 1, value: 1 },
  },
);

const BEACON_SHOT = physical(
  { id: 'bEaCoNsH0t000001', name: 'Beacon Shot', type: 'ammo' },
  {
    craftableAs: ['arrows', 'bolts'],
    level: { value: 3 },
    price: { value: { gp: 10 } },
    uses: { autoDestroy: true, max: 1, value: 1 },
  },
);

const GOLD_PIECES = physical(
  { id: 'B6B7tBWJSqOBz5zz', name: 'Gold Pieces', type: 'treasure' },
  {
    bulk: { value: 1 },
    category: 'coin',
    price: { value: { gp: 1 } },
  },
);

const FLAMING = physical(
  { id: 'XszNvxnymWYRaoTp', name: 'Flaming', type: 'equipment' },
  {
    level: { value: 8 },
    price: { value: { gp: 500 } },
    usage: { value: 'etched-onto-a-weapon' },
  },
);

const FROST_GREATER = physical(
  { id: 'fRoStGrEaTeR0001', name: 'Frost (Greater)', type: 'equipment' },
  {
    level: { value: 15 },
    price: { value: { gp: 6500 } },
    usage: { value: 'etched-onto-a-weapon' },
  },
);

const STRIKING_GREATER = physical(
  { id: 'BKjvzaRupmiwgnRV', name: 'Striking (Greater)', type: 'equipment' },
  {
    level: { value: 12 },
    price: { value: { gp: 1065 } },
    usage: { value: 'etched-onto-a-weapon' },
  },
);

const FORTIFICATION = physical(
  { id: 'fOrTiFiCaTiOn001', name: 'Fortification', type: 'equipment' },
  {
    level: { value: 12 },
    price: { value: { gp: 2000 } },
    usage: { value: 'etched-onto-med-heavy-armor' },
  },
);

export const EQUIPMENT: readonly DocumentFixture[] = [
  LONGSWORD,
  LONGBOW,
  ALCHEMISTS_FIRE,
  FLAMING_LONGSWORD,
  FULL_PLATE,
  STEEL_SHIELD,
  BACKPACK,
  CLOAK_OF_ELVENKIND,
  HEADBAND_OF_INSPIRED_WISDOM,
  HEALING_POTION,
  FIREBALL,
  FIREBALL_WAND,
  ARROWS,
  BEACON_SHOT,
  GOLD_PIECES,
  FLAMING,
  FROST_GREATER,
  STRIKING_GREATER,
  FORTIFICATION,
];
