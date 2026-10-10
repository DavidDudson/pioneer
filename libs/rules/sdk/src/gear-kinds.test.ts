import { describe, expect, test } from 'bun:test';

import { fieldIssues, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { RulesMessage } from './messages';

function issues(value: unknown): readonly FieldIssue[] {
  const result = ContentEntry.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** Each issue as `<path> <message key>`, sorted. */
function found(value: unknown): readonly string[] {
  return issues(value)
    .map((issue) => `${issue.path.join('.')} ${issue.message.key}`)
    .toSorted();
}

const PACK = 'player-core';
const idOf = (slug: string): string => contentId(PackId.parse(PACK), Slug.parse(slug));
const prose = (text: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

/** The envelope of a Player Core entry, without its kind and data. */
function entry(slug: string, name: string): object {
  return {
    id: idOf(slug),
    pack: PACK,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: prose(name),
    rules: [],
  };
}

/* Foundry pf2e's Player Core and GM Core items, in Pioneer's words. */

const backpack = {
  ...entry('backpack', 'Backpack'),
  kind: 'equipment',
  level: 0,
  data: {
    price: { coins: { sp: 1 } },
    bulk: 'light',
    usage: { type: 'worn', slot: 'backpack' },
    container: { capacity: 4, ignored: 2 },
  },
};

const rope = {
  ...entry('rope', 'Rope'),
  kind: 'equipment',
  level: 0,
  data: { price: { coins: { sp: 5 } }, bulk: 'light', usage: { type: 'held', hands: 'two' } },
};

const healingPotion = {
  ...entry('healing-potion-minor', 'Healing Potion (Minor)'),
  kind: 'consumable',
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

const arrows = {
  ...entry('arrows', 'Arrows'),
  kind: 'consumable',
  level: 0,
  traits: ['consumable'],
  data: {
    price: { coins: { sp: 1 }, per: 10 },
    bulk: 'light',
    bulkPer: 10,
    category: 'ammunition',
    ammunition: ['arrows'],
  },
};

/** GM Core's 2nd-rank arboreal wand holds Heal, heightened to 2nd rank. */
const arborealWand = {
  ...entry('arboreal-wand-rank-2', 'Arboreal Wand (2nd Rank)'),
  kind: 'consumable',
  level: 9,
  traits: ['healing', 'magical', 'vitality', 'wand'],
  data: {
    price: { coins: { gp: 700 } },
    bulk: 'light',
    category: 'wand',
    spell: { spell: idOf('heal'), rank: 2 },
    usage: { type: 'held', hands: 'one' },
  },
};

const goldPieces = {
  ...entry('gold-pieces', 'Gold Pieces'),
  kind: 'treasure',
  level: 0,
  data: { price: { coins: { gp: 1 } }, bulk: 1, bulkPer: 1000, category: 'coin' },
};

const diamond = {
  ...entry('diamond-small', 'Diamond (Small)'),
  kind: 'treasure',
  level: 0,
  data: { price: { coins: { gp: 100 } }, bulk: 'negligible', category: 'gem' },
};

const contained = (slug: string, quantity: number): object => ({ item: idOf(slug), quantity });

const adventurersPack = {
  ...entry('adventurers-pack', 'Adventurer’s Pack'),
  kind: 'kit',
  data: {
    price: { coins: { sp: 15 } },
    items: [
      {
        ...contained('backpack', 1),
        contents: [
          contained('bedroll', 1),
          contained('chalk', 10),
          contained('flint-and-steel', 1),
          contained('rations', 2),
          contained('rope', 1),
          contained('soap', 1),
          contained('torch', 5),
          contained('waterskin', 1),
        ],
      },
    ],
  },
};

describe('equipment, consumable and treasure kinds', () => {
  test.each([
    ['a worn container', backpack],
    ['held gear', rope],
    ['a consumable that heals', healingPotion],
    ['ammunition sold and carried in tens', arrows],
    ['a wand holding a heightened spell', arborealWand],
    ['coins, a thousand to the Bulk', goldPieces],
    ['a gem', diamond],
    ['gear with no price', { ...rope, data: { bulk: 'light' } }],
    ['tattooed gear', { ...rope, data: { bulk: 'negligible', usage: { type: 'tattooed' } } }],
    [
      'gear affixed to something',
      { ...rope, data: { bulk: 'negligible', usage: { type: 'affixed', to: 'armor-or-a-weapon' } } },
    ],
  ])('accepts %s', (_name, value) => {
    expect(issues(value)).toStrictEqual([]);
  });

  test('only ammunition names the ammunition it can be', () => {
    const notAmmunition = { ...healingPotion, data: { ...healingPotion.data, ammunition: ['arrows'] } };

    expect(found(notAmmunition)).toStrictEqual([`data.ammunition ${RulesMessage.ConsumableAmmunition}`]);
    expect(found({ ...arrows, data: { ...arrows.data, ammunition: ['arrows', 'arrows'] } })).toStrictEqual([
      `data.ammunition.1 ${RulesMessage.ListDuplicate}`,
    ]);
  });

  test("checks an item's price, bulk and usage", () => {
    const invalid = {
      ...rope,
      data: {
        price: { coins: { gp: 0, ep: 1 }, per: 0 },
        bulk: 'heavy',
        bulkPer: 0,
        usage: { type: 'affixed' },
      },
    };

    expect(found(invalid)).toStrictEqual([
      `data.bulk ${ValidationMessage.InvalidValue}`,
      `data.bulkPer ${ValidationMessage.TooSmall}`,
      `data.price.coins.ep ${ValidationMessage.UnrecognizedKeys}`,
      `data.price.coins.gp ${ValidationMessage.TooSmall}`,
      `data.price.per ${ValidationMessage.TooSmall}`,
      `data.usage.to ${ValidationMessage.InvalidType}`,
    ]);
  });

  test("checks a consumable's damage and spell", () => {
    const invalid = {
      ...arborealWand,
      data: {
        ...arborealWand.data,
        damage: { formula: '1d8', damageType: 'vitality', kind: 'harm' },
        spell: { spell: idOf('heal'), rank: 11 },
      },
    };

    expect(found(invalid)).toStrictEqual([
      `data.damage.kind ${ValidationMessage.InvalidValue}`,
      `data.spell.rank ${ValidationMessage.TooBig}`,
    ]);
  });
});

describe('kit kind', () => {
  test('accepts a kit holding a container and its contents', () => {
    expect(issues(adventurersPack)).toStrictEqual([]);
  });

  test('a kit holds something, in a positive quantity, and has no Bulk', () => {
    const empty = { ...adventurersPack, data: { items: [] } };
    const weighed = { ...adventurersPack, data: { ...adventurersPack.data, bulk: 1 } };
    const none = { ...adventurersPack, data: { items: [contained('rope', 0)] } };

    expect(found(empty)).toStrictEqual([`data.items ${ValidationMessage.TooSmall}`]);
    expect(found(weighed)).toStrictEqual([`data.bulk ${ValidationMessage.UnrecognizedKeys}`]);
    expect(found(none)).toStrictEqual([`data.items.0.quantity ${ValidationMessage.TooSmall}`]);
  });
});
