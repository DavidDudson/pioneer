import { describe, expect, test } from 'bun:test';

import { AonSupersedesFile, ContentEntryFile, ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { enrichSupersedesText, supersedesLinks } from './supersedes-enrichment.ts';
import type { SupersedesEnrichedFile } from './supersedes-enrichment.ts';

const PACK = PackId.parse('player-core');
const aonOf = (id: number): string => `https://2e.aonprd.com/Spells.aspx?ID=${id}`;
const idOf = (slug: string): ContentId => ContentId.parse(contentId(PACK, EntrySlug.parse(slug)));

/** A spell as a pack file holds it, citing the AoN URL `aon`, with its other fields as `extra`. */
function spell(slug: string, aon: string, extra: object = {}): object {
  return {
    id: idOf(slug),
    pack: PACK,
    kind: 'spell',
    slug,
    name: slug,
    level: 1,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: PACK, aon }],
    description: [],
    rules: [],
    data: {
      rank: 1,
      time: { type: 'actions', cost: 'two' },
      range: { type: 'feet', feet: 30 },
      duration: { type: 'unlimited' },
      traditions: ['divine'],
      damage: [],
    },
    ...extra,
  };
}

const entriesOf = (...entries: object[]): readonly ContentEntry[] => ContentEntryFile.parse(entries);
const pairs = (replacedBy: Record<string, string[]>): AonSupersedesFile => AonSupersedesFile.parse({ replacedBy });
const fileText = (...entries: object[]): string => `${JSON.stringify(entries, undefined, 2)}\n`;

/** The entries of a patched file; the pass must have changed it. */
function patchedEntries({ text }: SupersedesEnrichedFile): readonly ContentEntry[] {
  if (text === undefined) {
    throw new Error('The pass changed nothing');
  }
  return ContentEntryFile.parse(JSON.parse(text));
}

function patchedText({ text }: SupersedesEnrichedFile): string {
  if (text === undefined) {
    throw new Error('The pass changed nothing');
  }
  return text;
}

const OLD = 'spell:old-heal';
const NEW = 'spell:heal';
const NOTHING: SupersedesEnrichedFile = { text: undefined, set: 0 };

describe('supersedesLinks', () => {
  test('links the remaster entry to the legacy one by their AoN URLs', () => {
    const entries = entriesOf(spell(OLD, aonOf(1)), spell(NEW, aonOf(2)));
    const { replaces, unresolved } = supersedesLinks(entries, [pairs({ [aonOf(1)]: [aonOf(2)] })]);
    expect(replaces.get(idOf(NEW))).toEqual([idOf(OLD)]);
    expect(unresolved).toBe(0);
  });

  test('counts a pair with no entry on a side and links nothing for it', () => {
    const file = pairs({ [aonOf(1)]: [aonOf(2)], [aonOf(3)]: [aonOf(4)] });
    const entries = entriesOf(spell(NEW, aonOf(2)));
    const { replaces, unresolved } = supersedesLinks(entries, [file]);
    expect(replaces.size).toBe(1);
    expect(replaces.get(idOf(NEW))).toEqual([]);
    expect(unresolved).toBe(2);
  });
});

describe('enrichSupersedesText', () => {
  const replaces = new Map([[idOf(NEW), [idOf(OLD)]]]);

  test('adds supersedes to the remaster entry only', () => {
    const text = fileText(spell(OLD, aonOf(1)), spell(NEW, aonOf(2)));
    const result = enrichSupersedesText(text, replaces);
    const [legacy, remaster] = patchedEntries(result);
    expect(result.set).toBe(1);
    expect(legacy?.supersedes).toBeUndefined();
    expect(remaster?.supersedes).toEqual([idOf(OLD)]);
  });

  test('adds one line and leaves the rest of the text as it was', () => {
    const text = fileText(spell(OLD, aonOf(1)), spell(NEW, aonOf(2)));
    const patched = patchedText(enrichSupersedesText(text, replaces));
    const before = text.split('\n');
    expect(patched.split('\n')).toHaveLength(before.length + 1);
  });

  test('keeps ids already there', () => {
    const other = idOf('spell:older');
    const text = fileText(spell(NEW, aonOf(2), { supersedes: [other] }));
    const result = enrichSupersedesText(text, replaces);
    expect(patchedEntries(result)[0]?.supersedes).toEqual([other, idOf(OLD)]);
  });

  test('never repeats an id, so a second run changes nothing', () => {
    const text = fileText(spell(NEW, aonOf(2)));
    const once = patchedText(enrichSupersedesText(text, replaces));
    expect(enrichSupersedesText(once, replaces)).toEqual(NOTHING);
  });

  test('changes nothing for an entry no pair names', () => {
    const text = fileText(spell(OLD, aonOf(1)));
    expect(enrichSupersedesText(text, replaces)).toEqual(NOTHING);
  });
});
