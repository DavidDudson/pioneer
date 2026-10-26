import { describe, expect, test } from 'bun:test';

import { AonListedEntry, AonUrl, BookId, ContentKind, EntrySlug, SourceRef } from '@pioneer/rules/sdk';

import { proposeAonMappings } from './aon-matcher';
import type { AonListing, AonMatchable } from './aon-matcher';

const BOOK = BookId.parse('player-core');

/** A listing entry on AoN's `page`, whose heading is the same word. */
function listed(name: string, page: string, id: number): AonListedEntry {
  return AonListedEntry.parse({ type: page, name, url: `https://2e.aonprd.com/${page}.aspx?ID=${id}` });
}

function bookSource(book: BookId, aon?: string): SourceRef {
  return SourceRef.parse({ kind: 'book', book, aon });
}

function entry(kind: ContentKind, name: string, source: SourceRef = bookSource(BOOK)): AonMatchable {
  const slug = EntrySlug.parse(`${kind}:${name.toLowerCase().replaceAll(/[^a-z]+/gu, '-')}`);
  return { slug, kind, name, sources: [source] };
}

const LISTING: AonListing = {
  book: BOOK,
  entries: [
    listed('Power Attack', 'Feats', 1),
    listed('Fireball', 'Spells', 2),
    listed('Twin', 'Feats', 3),
    listed('Twin', 'Feats', 4),
    listed('Warrior’s Regret', 'Spells', 5),
  ],
};

describe('proposeAonMappings', () => {
  test('proposes the URL of the one entry of that kind with the name', () => {
    const power = entry(ContentKind.Feat, 'Power Attack');
    const { proposals } = proposeAonMappings([power], [LISTING], new Set());
    expect(proposals.get(power.slug)).toEqual({
      book: BOOK,
      aon: AonUrl.parse('https://2e.aonprd.com/Feats.aspx?ID=1'),
    });
  });

  test('does not match across kinds, and ignores case, diacritics and apostrophe style', () => {
    const feat = entry(ContentKind.Feat, 'Fireball');
    const spell = entry(ContentKind.Spell, "warrior's regret");
    const { proposals, unmatched } = proposeAonMappings([feat, spell], [LISTING], new Set());
    expect([...proposals.keys()]).toEqual([spell.slug]);
    expect(unmatched).toBe(1);
  });

  test('reports two candidates instead of guessing', () => {
    const twin = entry(ContentKind.Feat, 'Twin');
    const result = proposeAonMappings([twin], [LISTING], new Set());
    expect(result.ambiguous).toEqual([twin.slug]);
    expect(result.proposals.size).toBe(0);
  });

  test('leaves an entry that is already mapped or already linked', () => {
    const mapped = entry(ContentKind.Feat, 'Power Attack');
    const linked = entry(ContentKind.Spell, 'Fireball', bookSource(BOOK, 'https://2e.aonprd.com/Spells.aspx?ID=2'));
    const { proposals, unmatched } = proposeAonMappings([mapped, linked], [LISTING], new Set([mapped.slug]));
    expect(proposals.size).toBe(0);
    expect(unmatched).toBe(0);
  });

  test('skips an entry whose books have no listing', () => {
    const other = entry(ContentKind.Feat, 'Power Attack', bookSource(BookId.parse('gm-core')));
    expect(proposeAonMappings([other], [LISTING], new Set()).proposals.size).toBe(0);
  });
});

describe('proposeAonMappings page kinds', () => {
  test('matches creatures to Monsters and NPCs pages', () => {
    const listing: AonListing = {
      book: BOOK,
      entries: [listed('Goblin Warrior', 'Monsters', 7), listed('Guard', 'NPCs', 8)],
    };
    const goblin = entry(ContentKind.Creature, 'Goblin Warrior');
    const guard = entry(ContentKind.Creature, 'Guard');
    const { proposals } = proposeAonMappings([goblin, guard], [listing], new Set());
    expect([...proposals.keys()]).toEqual([goblin.slug, guard.slug]);
  });
});
