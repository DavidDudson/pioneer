import { describe, expect, test } from 'bun:test';

import { ContentEntry, contentId, ContentKind, EntrySlug, PackId, SourceKind } from '@pioneer/rules/sdk';

import { carrySources } from './carried-sources';
import { packOutput } from './pack-output';
import { known, translate } from './testing/import-fixtures';
import { AID } from './testing/kind-fixtures';

const AON = 'https://2e.aonprd.com/Actions.aspx?ID=1';
const OTHER_AON = 'https://2e.aonprd.com/Actions.aspx?ID=2';
const OTHER_SLUG = EntrySlug.parse('action:other');
const OTHER_PACK = PackId.parse('player-core-2');
const action = packOutput(translate([AID]), { known }).entries.find(({ kind }) => kind === ContentKind.Action);
if (action === undefined) {
  throw new Error('The Aid fixture imports no action');
}
const imported = action;

/** `entry` with `fields` replaced, parsed, so literals come out branded. */
function changed(entry: ContentEntry, fields: object): ContentEntry {
  return ContentEntry.parse({ ...entry, ...fields });
}

/** `entry` citing Player Core with `page` and `aon`, either left out when undefined. */
function citing(entry: ContentEntry, page?: number, aon?: string): ContentEntry {
  return changed(entry, { sources: [{ kind: SourceKind.Book, book: 'player-core', page, aon }] });
}

describe('carrySources', () => {
  test('the imported book source takes the page and AoN link of the entry it replaces', () => {
    expect(carrySources([imported], [citing(imported, 12, AON)])).toEqual([citing(imported, 12, AON)]);
  });

  test('keeps what the import already has and the rest of the imported entry', () => {
    const before = changed(citing(imported, 12, AON), { name: 'Hand' });
    expect(carrySources([citing(imported, undefined, OTHER_AON)], [before])).toEqual([citing(imported, 12, OTHER_AON)]);
  });

  test('takes nothing from another book, slug or pack', () => {
    const otherBook = changed(imported, { sources: [{ kind: SourceKind.Book, book: 'gm-core', page: 12, aon: AON }] });
    const otherSlug = citing(
      changed(imported, { slug: OTHER_SLUG, id: contentId(imported.pack, OTHER_SLUG) }),
      12,
      AON,
    );
    const otherPack = citing(
      changed(imported, { pack: OTHER_PACK, id: contentId(OTHER_PACK, imported.slug) }),
      12,
      AON,
    );
    expect(carrySources([imported], [otherBook, otherSlug, otherPack])).toEqual([imported]);
  });

  test('carrying twice changes nothing', () => {
    const once = carrySources([imported], [citing(imported, 12, AON)]);
    expect(carrySources(once, once)).toEqual(once);
  });
});
