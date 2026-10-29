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
    listed('Twin', 'Spells', 3),
    listed('Twin', 'Spells', 4),
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
    const twin = entry(ContentKind.Spell, 'Twin');
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
      listed('Twin', 'Spells', 12),
      listed('Twin', 'Spells', 13),
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
    const twin = entry(ContentKind.Spell, 'Twin');
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

describe('proposeAonMappings Equipment fallback for weapons, armor and shields', () => {
  const listing: AonListing = {
    book: BOOK,
    entries: [
      listed('Staff of Air', 'Equipment', 20),
      listed('Lion’s Shield', 'Equipment', 21),
      listed('Longsword', 'Weapons', 22),
      listed('Longsword', 'Equipment', 23),
    ],
  };

  test('maps a magic weapon and a graded variant of it to the Equipment page of the base item', () => {
    const staff = entry(ContentKind.Weapon, 'Staff of Air');
    const greater = entry(ContentKind.Weapon, 'Staff of Air (Greater)');
    const shield = entry(ContentKind.Shield, "Lion's Shield");
    const { proposals } = proposeAonMappings([staff, greater, shield], [listing], new Set());
    const air = AonUrl.parse('https://2e.aonprd.com/Equipment.aspx?ID=20');
    expect(proposals.get(staff.slug)?.aon).toBe(air);
    expect(proposals.get(greater.slug)?.aon).toBe(air);
    expect(proposals.get(shield.slug)?.aon).toBe(AonUrl.parse('https://2e.aonprd.com/Equipment.aspx?ID=21'));
  });

  test('prefers the weapon page, so a base item an Equipment row shares a name with is not ambiguous', () => {
    const longsword = entry(ContentKind.Weapon, 'Longsword');
    const result = proposeAonMappings([longsword], [listing], new Set());
    expect(result.proposals.get(longsword.slug)?.aon).toBe(AonUrl.parse('https://2e.aonprd.com/Weapons.aspx?ID=22'));
    expect(result.ambiguous).toEqual([]);
  });

  test('does not fall back for another kind, nor for a name the Equipment page lacks', () => {
    const feat = entry(ContentKind.Feat, 'Staff of Air');
    const missing = entry(ContentKind.Weapon, 'Staff of Water');
    const result = proposeAonMappings([feat, missing], [listing], new Set());
    expect(result.proposals.size).toBe(0);
    expect(result.unmatched).toEqual([feat.slug, missing.slug]);
  });
});

describe('proposeAonMappings legacy and remaster rows', () => {
  const legacy = AonUrl.parse('https://2e.aonprd.com/Spells.aspx?ID=30');
  const remaster = AonUrl.parse('https://2e.aonprd.com/Spells.aspx?ID=31');
  const entries = [listed('Twin', 'Spells', 30), listed('Twin', 'Spells', 31)];

  test('takes the one row the book prints a page for, whatever its ID', () => {
    const twin = entry(ContentKind.Spell, 'Twin');
    const { proposals } = proposeAonMappings([twin], [{ book: BOOK, entries, printed: new Set([legacy]) }], new Set());
    expect(proposals.get(twin.slug)?.aon).toBe(legacy);
  });

  test('stays ambiguous when the book prints both rows or neither', () => {
    const twin = entry(ContentKind.Spell, 'Twin');
    const both = proposeAonMappings([twin], [{ book: BOOK, entries, printed: new Set([legacy, remaster]) }], new Set());
    const neither = proposeAonMappings([twin], [{ book: BOOK, entries }], new Set());
    expect(both.ambiguous).toEqual([twin.slug]);
    expect(neither.ambiguous).toEqual([twin.slug]);
  });
});

describe('proposeAonMappings other books and plurals', () => {
  const other = BookId.parse('gm-core');
  const home: AonListing = { book: BOOK, entries: [] };
  const url = AonUrl.parse('https://2e.aonprd.com/Equipment.aspx?ID=40');

  test('maps a weapon, armor or shield to the one URL another book lists, keeping the cited book', () => {
    const shield = entry(ContentKind.Shield, 'Spined Shield');
    const away: AonListing = { book: other, entries: [listed('Spined Shield', 'Equipment', 40)] };
    const { proposals } = proposeAonMappings([shield], [home, away], new Set());
    expect(proposals.get(shield.slug)).toEqual({ book: BOOK, aon: url });
  });

  test('does not guess between two URLs in other books, nor for another kind', () => {
    const shield = entry(ContentKind.Shield, 'Spined Shield');
    const feat = entry(ContentKind.Feat, 'Spined Shield');
    const away: AonListing = { book: other, entries: [listed('Spined Shield', 'Equipment', 40)] };
    const more: AonListing = {
      book: BookId.parse('player-core-2'),
      entries: [listed('Spined Shield', 'Equipment', 41)],
    };
    const result = proposeAonMappings([shield, feat], [home, away, more], new Set());
    expect(result.ambiguous).toEqual([shield.slug]);
    expect(result.unmatched).toEqual([feat.slug]);
  });

  test('looks up the plural of a name last', () => {
    const bola = entry(ContentKind.Weapon, 'Windlass Bola');
    const listing: AonListing = { book: BOOK, entries: [listed('Windlass Bolas', 'Equipment', 40)] };
    expect(proposeAonMappings([bola], [listing], new Set()).proposals.get(bola.slug)?.aon).toBe(url);
  });
});

describe('proposeAonMappings superseded pages', () => {
  test('stays ambiguous for a weapon with several rows of one page: the current row is not always the higher ID', () => {
    const crossbow = entry(ContentKind.Weapon, 'Repeating Crossbow');
    const entries = [listed('Repeating Crossbow', 'Weapons', 176), listed('Repeating Crossbow', 'Weapons', 448)];
    const result = proposeAonMappings([crossbow], [{ book: BOOK, entries }], new Set());
    expect(result.proposals.size).toBe(0);
    expect(result.ambiguous).toEqual([crossbow.slug]);
  });

  test('stays ambiguous for a kind this was not checked on', () => {
    const twin = entry(ContentKind.Spell, 'Twin');
    const feats = [listed('Twin', 'Spells', 3), listed('Twin', 'Spells', 4)];
    expect(proposeAonMappings([twin], [{ book: BOOK, entries: feats }], new Set()).ambiguous).toEqual([twin.slug]);
  });
});

describe('proposeAonMappings superseded creatures and feats', () => {
  test('takes the highest ID of a creature or feat with several rows of one page', () => {
    const elder = entry(ContentKind.Creature, 'Anadi Elder');
    const display = entry(ContentKind.Feat, 'Banshee Cry Display');
    const entries = [
      listed('Anadi Elder', 'Monsters', 432),
      listed('Anadi Elder', 'Monsters', 1424),
      listed('Banshee Cry Display', 'Feats', 3250),
      listed('Banshee Cry Display', 'Feats', 8533),
    ];
    const { proposals } = proposeAonMappings([elder, display], [{ book: BOOK, entries }], new Set());
    expect(proposals.get(elder.slug)?.aon).toBe(AonUrl.parse('https://2e.aonprd.com/Monsters.aspx?ID=1424'));
    expect(proposals.get(display.slug)?.aon).toBe(AonUrl.parse('https://2e.aonprd.com/Feats.aspx?ID=8533'));
  });

  test('keeps a creature whose parenthetical names its level ambiguous', () => {
    const gurglegut = entry(ContentKind.Creature, 'Gurglegut (Level 12)');
    const entries = [listed('Gurglegut', 'Monsters', 4665), listed('Gurglegut', 'Monsters', 4691)];
    const result = proposeAonMappings([gurglegut], [{ book: BOOK, entries }], new Set());
    expect(result.ambiguous).toEqual([gurglegut.slug]);
  });
});

function aonUrl(page: string, id: number): AonUrl {
  return AonUrl.parse(`https://2e.aonprd.com/${page}.aspx?ID=${id}`);
}

describe('proposeAonMappings actions on other AoN pages', () => {
  const listing: AonListing = {
    book: BOOK,
    entries: [
      listed('Seek and Destroy', 'Tactics', 70),
      listed('Death Gaze', 'Relics', 71),
      listed('All-Around Vision', 'MonsterAbilities', 72),
      listed('Primal Howl', 'Feats', 73),
      listed('Darkvision', 'Spells', 74),
      listed('Aid', 'Actions', 75),
      listed('Aid', 'Feats', 76),
    ],
  };

  test('maps an action to the Tactics, Relics and MonsterAbilities pages, and a granted one to its feat', () => {
    const names = ['Seek and Destroy', 'Death Gaze', 'All-Around Vision', 'Primal Howl'];
    const actions = names.map((name) => entry(ContentKind.Action, name));
    const { proposals } = proposeAonMappings(actions, [listing], new Set());
    expect(actions.map(({ slug }) => proposals.get(slug)?.aon)).toEqual([
      aonUrl('Tactics', 70),
      aonUrl('Relics', 71),
      aonUrl('MonsterAbilities', 72),
      aonUrl('Feats', 73),
    ]);
  });

  test('prefers the Actions page over a feat of the same name, and never falls back to a spell', () => {
    const aid = entry(ContentKind.Action, 'Aid');
    const darkvision = entry(ContentKind.Action, 'Darkvision');
    const result = proposeAonMappings([aid, darkvision], [listing], new Set());
    expect(result.proposals.get(aid.slug)?.aon).toBe(aonUrl('Actions', 75));
    expect(result.unmatched).toEqual([darkvision.slug]);
  });

  test('keeps a feat from matching a Tactics row', () => {
    const feat = entry(ContentKind.Feat, 'Seek and Destroy');
    expect(proposeAonMappings([feat], [listing], new Set()).unmatched).toEqual([feat.slug]);
  });
});
