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
  const slug = EntrySlug.parse(
    `${kind}:${name
      .toLowerCase()
      .replaceAll(/[^a-z]+/gu, '-')
      .replaceAll(/^-|-$/gu, '')}`,
  );
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
    expect(unmatched).toEqual([feat.slug]);
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
    expect(unmatched).toEqual([]);
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

describe('proposeAonMappings name variants and kinds', () => {
  const listing: AonListing = {
    book: BOOK,
    entries: [
      listed("Alchemist's Lab", 'Equipment', 10),
      listed("Alchemist's Lab (Expanded)", 'Equipment', 10),
      listed('Rope', 'Equipment', 11),
      listed('Twin', 'Feats', 12),
      listed('Twin', 'Feats', 13),
    ],
  };

  test('looks up a name without its parenthetical or comma suffix when the full name has no row', () => {
    const expanded = entry(ContentKind.Equipment, "Alchemist's Lab (Expanded)");
    const silk = entry(ContentKind.Equipment, 'Rope, Silk');
    const { proposals } = proposeAonMappings([expanded, silk], [listing], new Set());
    expect(proposals.get(expanded.slug)?.aon).toBe(AonUrl.parse('https://2e.aonprd.com/Equipment.aspx?ID=10'));
    expect(proposals.get(silk.slug)?.aon).toBe(AonUrl.parse('https://2e.aonprd.com/Equipment.aspx?ID=11'));
  });

  test('counts rows that share a URL as one candidate, and two URLs as ambiguous', () => {
    const lab = entry(ContentKind.Equipment, "Alchemist's Lab");
    const twin = entry(ContentKind.Feat, 'Twin');
    const result = proposeAonMappings([lab, twin], [listing], new Set());
    expect([...result.proposals.keys()]).toEqual([lab.slug]);
    expect(result.ambiguous).toEqual([twin.slug]);
  });

  test('counts an entry of a kind AoN has no page for apart from one it could not find', () => {
    const effect = entry(ContentKind.Effect, 'Effect: Aid');
    const missing = entry(ContentKind.Feat, 'Not On AoN');
    const result = proposeAonMappings([effect, missing], [listing], new Set());
    expect(result.unlisted).toBe(1);
    expect(result.unmatched).toEqual([missing.slug]);
  });
});
