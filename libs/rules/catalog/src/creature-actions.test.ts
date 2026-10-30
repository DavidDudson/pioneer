import { describe, expect, test } from 'bun:test';

import { AonUrl, BookId, EntrySlug, PageNumber } from '@pioneer/rules/sdk';
import type { EnrichmentMapping } from '@pioneer/rules/sdk';

import { proposeCreatureActions } from './creature-actions';

const BOOK = BookId.parse('monster-core-2');
const ANADI: EnrichmentMapping = {
  book: BOOK,
  aon: AonUrl.parse('https://2e.aonprd.com/Monsters.aspx?ID=1'),
  page: PageNumber.parse(12),
};
const CREATURES = new Map<EntrySlug, EnrichmentMapping>([
  [EntrySlug.parse('creature:anadi-elder'), ANADI],
  [EntrySlug.parse('creature:unlinked'), { book: BOOK }],
]);

interface TestAction {
  readonly slug: EntrySlug;
  readonly name: string;
}

function action(name: string): TestAction {
  const words = name
    .toLowerCase()
    .replaceAll(/[^a-z]+/gu, '-')
    .replaceAll(/^-|-$/gu, '');
  return { slug: EntrySlug.parse(`action:${words}`), name };
}

describe('proposeCreatureActions', () => {
  test('maps several abilities of one creature to its page', () => {
    const first = action('(Anadi Elder) Change Shape');
    const second = action('(Anadi Elder) Venom');
    const { proposals, excepted } = proposeCreatureActions([first, second], CREATURES, new Set());
    expect(proposals.get(first.slug)).toEqual(ANADI);
    expect(proposals.get(second.slug)).toEqual(ANADI);
    expect(excepted).toEqual([]);
  });

  test('excepts a parenthetical that is not a creature of the pack', () => {
    const trait = action('(Mythic) Surge');
    const family = action('(Anadi) Change Shape');
    const role = action('(Anadi Elder, Grandmaster) Strike');
    const { proposals, excepted } = proposeCreatureActions([trait, family, role], CREATURES, new Set());
    expect(proposals.size).toBe(0);
    expect(excepted).toEqual([trait.slug, family.slug, role.slug]);
  });

  test('excepts a creature that has no AoN URL', () => {
    const lonely = action('(Unlinked) Ability');
    expect(proposeCreatureActions([lonely], CREATURES, new Set()).excepted).toEqual([lonely.slug]);
  });

  test('skips plain names and actions that already have a mapping', () => {
    const plain = action('Strike');
    const done = action('(Anadi Elder) Venom');
    const result = proposeCreatureActions([plain, done], CREATURES, new Set([done.slug]));
    expect(result.proposals.size).toBe(0);
    expect(result.excepted).toEqual([]);
  });
});
