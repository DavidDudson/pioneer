import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, ValidationMessage } from '@pioneer/shared/kernel';
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

/** The envelope of a Player Core item at `level`, without its kind and data. */
function item(slug: string, name: string, level: number): object {
  return {
    id: idOf(slug),
    pack: PACK,
    slug,
    name,
    level,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: prose(name),
    rules: [],
  };
}

/* Foundry pf2e's Player Core and GM Core items, in Pioneer's words. */

const longsword = {
  ...item('longsword', 'Longsword', 0),
  kind: 'weapon',
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

const shortbow = {
  ...item('shortbow', 'Shortbow', 0),
  kind: 'weapon',
  traits: ['deadly-d10'],
  data: {
    price: { coins: { gp: 3 } },
    bulk: 1,
    category: 'martial',
    group: 'bow',
    baseItem: 'shortbow',
    damage: { dice: 1, die: 'd6', damageType: 'piercing' },
    range: 60,
    reload: 0,
    ammunition: { type: 'arrows' },
    usage: { type: 'held', hands: 'one-plus' },
  },
};

const alchemistsFire = {
  ...item('alchemists-fire-lesser', 'Alchemist’s Fire (Lesser)', 1),
  kind: 'weapon',
  traits: ['alchemical', 'bomb', 'consumable', 'fire', 'splash'],
  data: {
    price: { coins: { gp: 3 } },
    bulk: 'light',
    category: 'martial',
    group: 'bomb',
    damage: { dice: 1, die: 'd8', damageType: 'fire', persistent: { formula: '1', damageType: 'fire' } },
    splash: 1,
    range: 20,
    usage: { type: 'held', hands: 'one' },
  },
};

const spellguardBlade = {
  ...item('spellguard-blade', 'Spellguard Blade', 7),
  kind: 'weapon',
  traits: ['agile', 'disarm', 'finesse', 'magical', 'parry', 'versatile-s'],
  data: {
    price: { coins: { gp: 320 } },
    bulk: 'light',
    category: 'martial',
    group: 'knife',
    baseItem: 'main-gauche',
    damage: { dice: 1, die: 'd4', damageType: 'piercing' },
    usage: { type: 'held', hands: 'one' },
    runes: { potency: 1, striking: 1, property: [] },
  },
};

const fullPlate = {
  ...item('full-plate', 'Full Plate', 2),
  kind: 'armor',
  traits: ['bulwark'],
  data: {
    price: { coins: { gp: 30 } },
    bulk: 4,
    category: 'heavy',
    group: 'plate',
    baseItem: 'full-plate',
    acBonus: 6,
    dexCap: 0,
    checkPenalty: 3,
    speedPenalty: 10,
    strength: 4,
  },
};

const leatherArmor = {
  ...item('leather-armor', 'Leather Armor', 0),
  kind: 'armor',
  data: {
    price: { coins: { gp: 2 } },
    bulk: 1,
    category: 'light',
    group: 'leather',
    baseItem: 'leather-armor',
    acBonus: 1,
    dexCap: 4,
    checkPenalty: 1,
  },
};

const sturdyShield = {
  ...item('sturdy-shield-minor', 'Sturdy Shield (Minor)', 4),
  kind: 'shield',
  traits: ['magical'],
  data: { price: { coins: { gp: 100 } }, bulk: 1, baseItem: 'steel-shield', acBonus: 2, hardness: 8, hitPoints: 64 },
};

describe('weapon, armor and shield kinds', () => {
  test.each([
    ['a melee weapon', longsword],
    ['a ranged weapon firing ammunition', shortbow],
    ['an alchemical bomb with persistent and splash damage', alchemistsFire],
    ['a specific magic weapon with its runes', spellguardBlade],
    ['heavy armour with penalties and a Strength threshold', fullPlate],
    ['light armour', leatherArmor],
    ['a specific magic shield', sturdyShield],
  ])('accepts %s', (_name, value) => {
    expect(issues(value)).toStrictEqual([]);
  });

  test('an item always has a level', () => {
    expect(found({ ...longsword, level: undefined })).toStrictEqual([`level ${ValidationMessage.InvalidType}`]);
  });

  test('a price names at least one coin', () => {
    expect(found({ ...longsword, data: { ...longsword.data, price: { coins: {} } } })).toStrictEqual([
      `data.price.coins ${RulesMessage.ItemPriceEmpty}`,
    ]);
  });

  test('a potency rune holds as many property runes as its grade', () => {
    const flamingId = idOf('flaming');
    const unslotted = {
      ...spellguardBlade,
      data: { ...spellguardBlade.data, runes: { striking: 1, property: [flamingId] } },
    };
    const overfull = {
      ...spellguardBlade,
      data: { ...spellguardBlade.data, runes: { potency: 1, property: [flamingId, idOf('frost')] } },
    };
    const repeated = {
      ...fullPlate,
      data: { ...fullPlate.data, runes: { potency: 2, property: [flamingId, flamingId] } },
    };

    expect(issues(unslotted)).toStrictEqual([
      { path: ['data', 'runes', 'property'], message: message(RulesMessage.RunePropertySlots, { potency: 0 }) },
    ]);
    expect(issues(overfull)).toStrictEqual([
      { path: ['data', 'runes', 'property'], message: message(RulesMessage.RunePropertySlots, { potency: 1 }) },
    ]);
    expect(issues(repeated)).toStrictEqual([
      {
        path: ['data', 'runes', 'property', 1],
        message: message(RulesMessage.ListDuplicate, { value: flamingId }),
      },
    ]);
  });

  test("checks a weapon's damage, usage and bonus", () => {
    const invalid = {
      ...longsword,
      data: {
        ...longsword.data,
        damage: {
          dice: 0,
          die: 'd20',
          damageType: 'slashing',
          persistent: { formula: '1 + @nope', damageType: 'fire' },
        },
        usage: { type: 'held', hands: 'one', to: 'belt' },
        itemBonus: 5,
      },
    };

    expect(found(invalid)).toStrictEqual([
      `data.damage.dice ${ValidationMessage.TooSmall}`,
      `data.damage.die ${ValidationMessage.InvalidValue}`,
      `data.damage.persistent.formula ${RulesMessage.UnknownReference}`,
      `data.itemBonus ${ValidationMessage.TooBig}`,
      `data.usage.to ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });

  test('a shield always has hardness and hit points, and no usage', () => {
    const { hardness: _hardness, hitPoints: _hitPoints, ...flimsy } = sturdyShield.data;

    expect(found({ ...sturdyShield, data: { ...flimsy, usage: { type: 'held', hands: 'one' } } })).toStrictEqual([
      `data.hardness ${ValidationMessage.InvalidType}`,
      `data.hitPoints ${ValidationMessage.InvalidType}`,
      `data.usage ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });
});
