import { describe, expect, test } from 'bun:test';

import { BookId, ContentId, contentId, ContentKind, entrySlug, PackId, Slug } from '@pioneer/rules/sdk';
import { slugText } from '@pioneer/rules/sdk/testing';
import { assert, integer, property, record, string } from 'fast-check';

import { FoundryDocument, FoundryItemType } from './foundry-document';
import type { SelectedEntry } from './select-entries';
import { translateEnvelopes } from './translate-envelope';

const LEVEL_MAX = 30;
const ID_LENGTH_MAX = 16;

interface Case {
  readonly pack: string;
  readonly slug: string;
  readonly documentId: string;
  readonly level: number;
}

const cases = record({
  pack: slugText,
  slug: slugText,
  documentId: string({ minLength: 1, maxLength: ID_LENGTH_MAX }),
  level: integer({ min: 0, max: LEVEL_MAX }),
});

function selected({ slug, documentId, level }: Case): SelectedEntry {
  const document = FoundryDocument.parse({
    _id: documentId,
    name: 'Any Name',
    type: 'feat',
    system: { slug, level: { value: level } },
  });
  return {
    pack: { name: 'feats-srd', directory: 'feats' },
    path: `packs/pf2e/feats/${documentId}.json`,
    document,
    type: FoundryItemType.Feat,
    book: BookId.parse('player-core'),
  };
}

describe('translateEnvelopes ids', () => {
  test('are UUIDv5 of <pack>/<slug>, whatever else the document holds', () => {
    assert(
      property(cases, (each) => {
        const pack = PackId.parse(each.pack);
        const slug = entrySlug(ContentKind.Feat, Slug.parse(each.slug));
        const expected = ContentId.parse(contentId(pack, slug));
        const { entries } = translateEnvelopes([selected(each)], { pack, traits: new Set(), lang: {} });

        expect(entries[0]?.envelope.id).toBe(expected);
      }),
    );
  });
});
