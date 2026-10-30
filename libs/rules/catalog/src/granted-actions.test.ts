import { describe, expect, test } from 'bun:test';

import { AonUrl, BookId, ContentKind, EntrySlug, PageNumber } from '@pioneer/rules/sdk';
import type { EnrichmentMapping } from '@pioneer/rules/sdk';

import { proposeGrantedActions } from './granted-actions';
import type { ActionGranter } from './granted-actions';

const FEAT_PAGE: EnrichmentMapping = {
  book: BookId.parse('war-of-immortals'),
  aon: AonUrl.parse('https://2e.aonprd.com/Feats.aspx?ID=1'),
  page: PageNumber.parse(40),
};
const OTHER_PAGE: EnrichmentMapping = { ...FEAT_PAGE, aon: AonUrl.parse('https://2e.aonprd.com/Feats.aspx?ID=2') };
const SLUG = EntrySlug.parse('action:break-the-suns-legs');

function granter(kind: ContentKind, mapping: EnrichmentMapping | undefined = FEAT_PAGE): ActionGranter {
  return { kind, mapping };
}

describe('proposeGrantedActions', () => {
  test('maps an action to the one feat, heritage or background that grants it', () => {
    for (const kind of [ContentKind.Feat, ContentKind.Heritage, ContentKind.Background]) {
      const { proposals } = proposeGrantedActions([{ slug: SLUG, grantedBy: [granter(kind)] }], new Set());
      expect(proposals.get(SLUG)).toEqual(FEAT_PAGE);
    }
  });

  test('excepts an action with two granters', () => {
    const grantedBy = [granter(ContentKind.Feat), granter(ContentKind.Feat, OTHER_PAGE)];
    const { proposals, excepted } = proposeGrantedActions([{ slug: SLUG, grantedBy }], new Set());
    expect(proposals.size).toBe(0);
    expect(excepted).toEqual([SLUG]);
  });

  test('excepts a granting class feature, effect, or a granter without an AoN URL', () => {
    const cases = [
      granter(ContentKind.ClassFeature),
      granter(ContentKind.Effect),
      granter(ContentKind.Feat, { book: FEAT_PAGE.book }),
      { kind: ContentKind.Feat, mapping: undefined },
    ];
    for (const one of cases) {
      const { proposals, excepted } = proposeGrantedActions([{ slug: SLUG, grantedBy: [one] }], new Set());
      expect(proposals.size).toBe(0);
      expect(excepted).toEqual([SLUG]);
    }
  });

  test('leaves an action nothing grants unlinked', () => {
    const { proposals, excepted, unlinked } = proposeGrantedActions([{ slug: SLUG, grantedBy: [] }], new Set());
    expect(proposals.size).toBe(0);
    expect(excepted).toEqual([]);
    expect(unlinked).toEqual([SLUG]);
  });

  test('keeps an action that is already mapped', () => {
    const { proposals, excepted, unlinked } = proposeGrantedActions(
      [{ slug: SLUG, grantedBy: [granter(ContentKind.Feat)] }],
      new Set([SLUG]),
    );
    expect(proposals.size + excepted.length + unlinked.length).toBe(0);
  });
});
