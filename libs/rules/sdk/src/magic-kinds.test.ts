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

/* Foundry pf2e's Player Core entries, in Pioneer's words. */

const fireball = {
  ...entry('fireball', 'Fireball'),
  kind: 'spell',
  traits: ['concentrate', 'fire', 'manipulate'],
  data: {
    rank: 3,
    traditions: ['arcane', 'primal'],
    time: { type: 'actions', cost: 'two' },
    range: { type: 'feet', feet: 500 },
    area: { shape: 'burst', size: 20 },
    defense: { save: { statistic: 'save:reflex', basic: true } },
    damage: [{ key: '0', formula: '6d6', damageType: 'fire', kinds: ['damage'] }],
    heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '2d6' }] },
  },
};

const heal = {
  ...entry('heal', 'Heal'),
  kind: 'spell',
  traits: ['healing', 'manipulate', 'vitality'],
  data: {
    rank: 1,
    traditions: ['divine', 'primal'],
    time: { type: 'actions', cost: 'one', upTo: 'three' },
    targets: {
      any: [
        { count: 1, of: 'creature', qualifiers: ['willing', 'living'] },
        { count: 1, of: 'creature', traits: ['undead'] },
      ],
    },
    defense: { save: { statistic: 'save:fortitude', basic: true } },
    damage: [{ key: '0', formula: '1d8', damageType: 'vitality', kinds: ['damage', 'healing'] }],
    heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '1d8' }] },
  },
};

const shield = {
  ...entry('shield', 'Shield'),
  kind: 'spell',
  traits: ['cantrip', 'concentrate', 'force'],
  data: {
    rank: 1,
    traditions: ['arcane', 'divine', 'occult'],
    time: { type: 'actions', cost: 'one' },
    duration: { type: 'until', until: 'next-turn-start' },
    damage: [],
  },
};

const command = {
  ...entry('command', 'Command'),
  kind: 'spell',
  traits: ['auditory', 'concentrate', 'linguistic', 'manipulate', 'mental'],
  data: {
    rank: 1,
    traditions: ['arcane', 'divine', 'occult'],
    time: { type: 'actions', cost: 'two' },
    range: { type: 'feet', feet: 30 },
    targets: { any: [{ count: 1, of: 'creature' }] },
    duration: { type: 'until', until: 'next-turn-end', of: 'target' },
    defense: { save: { statistic: 'save:will', basic: false } },
    damage: [],
    heightening: { type: 'fixed', ranks: [{ rank: 5, targets: { any: [{ count: 10, of: 'creature' }] } }] },
  },
};

const sureStrike = {
  ...entry('sure-strike', 'Sure Strike'),
  kind: 'spell',
  traits: ['concentrate', 'fortune'],
  data: {
    rank: 1,
    traditions: ['arcane', 'occult'],
    time: { type: 'actions', cost: 'one' },
    duration: { type: 'until', until: 'turn-end' },
    damage: [],
  },
};

const dispelMagic = {
  ...entry('dispel-magic', 'Dispel Magic'),
  kind: 'spell',
  traits: ['concentrate', 'manipulate'],
  data: {
    rank: 2,
    traditions: ['arcane', 'divine', 'occult', 'primal'],
    time: { type: 'actions', cost: 'two' },
    range: { type: 'feet', feet: 120 },
    targets: {
      any: [
        { count: 1, of: 'spell-effect' },
        { count: 1, of: 'item', qualifiers: ['unattended', 'magical'] },
      ],
    },
    damage: [],
    counteraction: true,
  },
};

describe('spell kind', () => {
  test.each([
    ['a spell with damage heightened by interval', fireball],
    ['a spell cast with one to three actions at alternative targets', heal],
    ['a cantrip lasting until the start of your next turn', shield],
    ["a spell lasting until the end of the target's next turn, with fixed heightening", command],
    ['a spell lasting until the end of your turn', sureStrike],
    ['a counteracting spell targeting a spell effect or magic item', dispelMagic],
    [
      'a sustained spell against a passive defence',
      {
        ...fireball,
        data: {
          ...fireball.data,
          defense: { against: 'save:fortitude' },
          duration: { type: 'time', count: 1, unit: 'minute', sustained: true },
        },
      },
    ],
  ])('accepts %s', (_name, value) => {
    expect(issues(value)).toStrictEqual([]);
  });

  test('a casting time runs from fewer actions to more', () => {
    const backwards = { ...heal, data: { ...heal.data, time: { type: 'actions', cost: 'three', upTo: 'two' } } };
    const reaction = { ...heal, data: { ...heal.data, time: { type: 'actions', cost: 'reaction', upTo: 'three' } } };

    expect(found(backwards)).toStrictEqual([`data.time.upTo ${RulesMessage.SpellCastUpTo}`]);
    expect(found(reaction)).toStrictEqual([`data.time.upTo ${RulesMessage.SpellCastUpTo}`]);
    expect(
      found({ ...heal, data: { ...heal.data, time: { type: 'actions', cost: 'two', upTo: 'two' } } }),
    ).toStrictEqual([`data.time.upTo ${RulesMessage.SpellCastUpTo}`]);
  });

  test('a defence names a save or what it is against', () => {
    const empty = { ...fireball, data: { ...fireball.data, defense: {} } };
    const notASave = {
      ...fireball,
      data: { ...fireball.data, defense: { save: { statistic: 'ac', basic: true } } },
    };

    expect(found(empty)).toStrictEqual([`data.defense ${RulesMessage.SpellDefenseEmpty}`]);
    expect(found(notASave)).toStrictEqual([`data.defense.save.statistic ${RulesMessage.SaveSelector}`]);
    expect(found({ ...fireball, data: { ...fireball.data, defense: { against: 'skill:arcana' } } })).toStrictEqual([
      `data.defense.against ${RulesMessage.SpellAgainst}`,
    ]);
  });

  test('only a turn-relative end has an owner', () => {
    const preparations = {
      ...command,
      data: { ...command.data, duration: { type: 'until', until: 'daily-preparations', of: 'target' } },
    };

    expect(found(preparations)).toStrictEqual([`data.duration.of ${RulesMessage.SpellDurationOwner}`]);
  });

  test('damage parts have distinct keys, and heightening adds only to them', () => {
    const repeated = {
      ...fireball,
      data: { ...fireball.data, damage: [...fireball.data.damage, ...fireball.data.damage] },
    };
    const unknownPart = {
      ...fireball,
      data: {
        ...fireball.data,
        heightening: { type: 'interval', interval: 1, damage: [{ key: 'splash', formula: '1d6' }] },
      },
    };

    expect(issues(repeated)).toStrictEqual([
      { path: ['data', 'damage', 1, 'key'], message: message(RulesMessage.ListDuplicate, { value: '0' }) },
    ]);
    expect(issues(unknownPart)).toStrictEqual([
      {
        path: ['data', 'heightening', 'damage', 0, 'key'],
        message: message(RulesMessage.SpellDamageKey, { key: 'splash' }),
      },
    ]);
  });

  test('fixed heightening names each rank once, above the spell, and changes something', () => {
    const tenCreatures = { any: [{ count: 10, of: 'creature' }] };
    const invalid = {
      ...command,
      data: {
        ...command.data,
        heightening: {
          type: 'fixed',
          ranks: [
            { rank: 1, targets: tenCreatures },
            { rank: 3, targets: tenCreatures },
            { rank: 3, targets: tenCreatures },
          ],
        },
      },
    };
    const unchanged = { ...command, data: { ...command.data, heightening: { type: 'fixed', ranks: [{ rank: 5 }] } } };

    expect(issues(invalid)).toStrictEqual([
      {
        path: ['data', 'heightening', 'ranks', 0, 'rank'],
        message: message(RulesMessage.SpellHeightenAbove, { rank: 1 }),
      },
      { path: ['data', 'heightening', 'ranks', 2, 'rank'], message: message(RulesMessage.ListDuplicate, { value: 3 }) },
    ]);
    expect(found(unchanged)).toStrictEqual([`data.heightening.ranks.0 ${RulesMessage.SpellHeightenEmpty}`]);
  });

  test("checks a spell's rank, traditions, range, area and targets", () => {
    const invalid = {
      ...fireball,
      data: {
        ...fireball.data,
        rank: 11,
        traditions: ['arcane', 'arcane', 'elemental'],
        range: { type: 'feet' },
        area: { shape: 'burst', size: 20, width: 10 },
        targets: { any: [] },
      },
    };

    expect(found(invalid)).toStrictEqual([
      `data.area.width ${RulesMessage.RichTextWidthOnLine}`,
      `data.range.feet ${ValidationMessage.InvalidType}`,
      `data.rank ${ValidationMessage.TooBig}`,
      `data.targets.any ${ValidationMessage.TooSmall}`,
      `data.traditions.2 ${ValidationMessage.InvalidValue}`,
    ]);
  });

  test('rejects data fields a kind does not have', () => {
    expect(found({ ...fireball, data: { ...fireball.data, location: { heightenedLevel: 3 } } })).toStrictEqual([
      `data.location ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });
});
