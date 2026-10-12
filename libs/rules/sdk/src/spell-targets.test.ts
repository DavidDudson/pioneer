import { describe, expect, test } from 'bun:test';

import { fieldIssues, ValidationMessage } from '@pioneer/shared/kernel';

import { ContentEntry } from './content-entry';
import { contentId, EntrySlug, PackId } from './content-id';
import { RulesMessage } from './messages';

const PACK = 'player-core';
const SLUG = 'spell:command';

/** Command, a Player Core spell, with `targets` in place of its own. */
function targeting(targets: object): object {
  return {
    id: contentId(PackId.parse(PACK), EntrySlug.parse(SLUG)),
    pack: PACK,
    kind: 'spell',
    slug: SLUG,
    name: 'Command',
    rarity: 'common',
    traits: ['auditory', 'concentrate', 'linguistic', 'manipulate', 'mental'],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Command' }] }],
    rules: [],
    data: {
      rank: 1,
      traditions: ['arcane', 'divine', 'occult'],
      time: { type: 'actions', cost: 'two' },
      range: { type: 'feet', feet: 30 },
      targets,
      damage: [],
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

describe('spell targets', () => {
  test.each([
    ['the triggering creature (Air Bubble)', { any: [{ count: 1, triggering: true, of: 'creature' }] }],
    ['your animal companion (Heal Companion)', { any: [{ count: 1, of: 'animal-companion' }] }],
    ['any number of creatures (Overwhelming Presence)', { any: [{ count: 'any', of: 'creature' }] }],
    ['you and allies in the area (Bless)', { any: [{ count: 'all', within: 'area', of: 'ally' }], you: 'and' }],
    ['you or 1 ally (Hymn of Healing)', { any: [{ count: 1, of: 'ally' }], you: 'or' }],
    ['1 ally and 1 enemy (Forbidding Ward)', { any: [{ count: 1, of: 'ally' }], plus: [{ count: 1, of: 'enemy' }] }],
    [
      'creature types as traits (Primal Call)',
      {
        any: ['animal', 'beast', 'fey', 'fungus', 'plant'].map((trait) => ({
          count: 1,
          of: 'creature',
          traits: [trait],
        })),
      },
    ],
    ['1 dead creature (Create Undead)', { any: [{ count: 1, of: 'creature', qualifiers: ['dead'] }] }],
  ])('accepts %s', (_name, targets) => {
    expect(found(targeting(targets))).toStrictEqual([]);
  });

  test('only a number is up to, and only all is within an area or range', () => {
    expect(found(targeting({ any: [{ count: 'any', upTo: true, of: 'creature' }] }))).toStrictEqual([
      `data.targets.any.0.upTo ${RulesMessage.SpellTargetUpTo}`,
    ]);
    expect(found(targeting({ any: [{ count: 'all', of: 'enemy' }] }))).toStrictEqual([
      `data.targets.any.0.within ${RulesMessage.SpellTargetWithin}`,
    ]);
    expect(found(targeting({ any: [{ count: 2, within: 'range', of: 'enemy' }] }))).toStrictEqual([
      `data.targets.any.0.within ${RulesMessage.SpellTargetWithin}`,
    ]);
    expect(found(targeting({ any: [{ count: 1, of: 'ally' }], plus: [], you: 'both' }))).toStrictEqual([
      `data.targets.plus ${ValidationMessage.TooSmall}`,
      `data.targets.you ${ValidationMessage.InvalidValue}`,
    ]);
  });
});
