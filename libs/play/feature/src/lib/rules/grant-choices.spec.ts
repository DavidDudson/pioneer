import { contentId, ContentId, PackId, Slug } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { parsePicks, withPick } from './grant-choices';
import type { SlugTable } from './grant-choices';

const PACK = PackId.parse('playground');
const idOf = (slug: Slug): ContentId => ContentId.parse(contentId(PACK, slug));

/** A table that knows only `fighter` and `sudden-charge`. */
const table: SlugTable = {
  idOf,
  slugOf: () => undefined,
  has: (slug) => slug === 'fighter' || slug === 'sudden-charge',
};

describe(withPick, () => {
  it('replaces the line for the slot and keeps the others', () => {
    expect(withPick('fighter:4 = sudden-charge\n\nfighter:6 = sword', 'fighter:4', 'double-slice')).toBe(
      'fighter:6 = sword\nfighter:4 = double-slice',
    );
  });

  it('adds a line for a slot with no pick yet', () => {
    expect(withPick('', 'fighter:4', 'sudden-charge')).toBe('fighter:4 = sudden-charge');
  });
});

describe(parsePicks, () => {
  it('reads an entry slug as its id and any other slug as a plain option, the last line for a slot winning', () => {
    const { picks, bad } = parsePicks('fighter:4 = axe\nfighter:4 = sudden-charge\nfighter:6=sword', table);
    expect(bad).toStrictEqual([]);
    expect([...picks.values()]).toStrictEqual([idOf(Slug.parse('sudden-charge')), 'sword']);
  });

  it('points at lines that are not picks', () => {
    expect(parsePicks('fighter:4 = axe\nfighter = axe\n\nfighter:x = axe', table).bad).toStrictEqual([2, 4]);
  });
});
