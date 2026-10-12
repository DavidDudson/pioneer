import { describe, expect, test } from 'bun:test';

import { fieldIssues, ValidationMessage } from '@pioneer/shared/kernel';

import { ContentEntry } from './content-entry';
import { contentId, EntrySlug, PackId } from './content-id';
import { RulesMessage } from './messages';

const PACK = 'player-core';
const SLUG = 'spell:teleport';

/** Teleport, a Player Core spell, with `casting` laid over its range and duration. */
function casting(fields: object): object {
  return {
    id: contentId(PackId.parse(PACK), EntrySlug.parse(SLUG)),
    pack: PACK,
    kind: 'spell',
    slug: SLUG,
    name: 'Teleport',
    rarity: 'uncommon',
    traits: ['manipulate', 'teleportation'],
    sources: [{ kind: 'book', book: 'player-core', page: 346 }],
    description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Teleport' }] }],
    rules: [],
    data: {
      rank: 6,
      traditions: ['arcane', 'occult'],
      time: { type: 'time', count: 10, unit: 'minute' },
      damage: [],
      ...fields,
    },
  };
}

/** Each issue as `<path> <message key>`, sorted. */
function found(value: unknown): readonly string[] {
  const result = ContentEntry.safeParse(value);
  return result.success
    ? []
    : fieldIssues(result.error.issues)
        .map((issue) => `${issue.path.join('.')} ${issue.message.key}`)
        .toSorted();
}

describe('spell ranges', () => {
  test.each([
    ['100 miles (Teleport)', { type: 'miles', miles: 100 }],
    ['half a mile (Earthquake, 10th)', { type: 'miles', miles: 0.5 }],
    ['interplanar (Binding Circle)', { type: 'interplanar' }],
    [
      'touch or 30 feet (Heal Companion)',
      {
        type: 'either',
        options: [{ type: 'touch' }, { type: 'feet', feet: 30 }],
      },
    ],
  ])('accepts %s', (_name, range) => {
    expect(found(casting({ range }))).toStrictEqual([]);
  });

  test('miles are whole or half, and a choice is of two or more single ranges', () => {
    expect(found(casting({ range: { type: 'miles', miles: 0.25 } }))).toStrictEqual([
      `data.range.miles ${ValidationMessage.NotMultipleOf}`,
    ]);
    expect(found(casting({ range: { type: 'either', options: [{ type: 'touch' }] } }))).toStrictEqual([
      `data.range.options ${ValidationMessage.TooSmall}`,
    ]);
    const nested = { type: 'either', options: [{ type: 'touch' }, { type: 'either', options: [] }] };
    expect(found(casting({ range: nested }))).toStrictEqual([
      `data.range.options.1.type ${ValidationMessage.InvalidValue}`,
    ]);
  });
});

describe('spell areas', () => {
  test.each([
    ['a 5-foot square (Floating Flame)', { shape: 'square', size: 5 }],
    [
      'a burst narrowed by its details (Entangling Flora)',
      {
        shape: 'burst',
        size: 20,
        details: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'all squares in a 20-foot-radius burst that contain plants' }],
          },
        ],
      },
    ],
  ])('accepts %s', (_name, area) => {
    expect(found(casting({ area }))).toStrictEqual([]);
  });
});

describe('spell durations', () => {
  test.each([
    ['varies (Fear)', { type: 'varies' }],
    ['up to 10 minutes (Commune)', { type: 'time', count: 10, unit: 'minute', upTo: true }],
    ['4d12 hours (Control Weather)', { type: 'rolled', dice: 4, die: 'd12', unit: 'hour' }],
    [
      '10 minutes or 8 hours (One with Plants)',
      {
        type: 'either',
        options: [
          { type: 'time', count: 10, unit: 'minute' },
          { type: 'time', count: 8, unit: 'hour' },
        ],
      },
    ],
    [
      '1 round or sustained up to 1 minute (Mind Reading)',
      {
        type: 'either',
        options: [
          { type: 'time', count: 1, unit: 'round' },
          { type: 'time', count: 1, unit: 'minute', sustained: true },
        ],
      },
    ],
  ])('accepts %s', (_name, duration) => {
    expect(found(casting({ duration }))).toStrictEqual([]);
  });

  test('a sustained time is already up to it, and a die is a die size', () => {
    const both = { type: 'time', count: 1, unit: 'minute', upTo: true, sustained: true };
    expect(found(casting({ duration: both }))).toStrictEqual([`data.duration.upTo ${RulesMessage.SpellDurationUpTo}`]);
    const rolled = { type: 'rolled', dice: 4, die: 'd20', unit: 'hour' };
    expect(found(casting({ duration: rolled }))).toStrictEqual([`data.duration.die ${ValidationMessage.InvalidValue}`]);
  });
});
