import { describe, expect, test } from 'bun:test';

import { AonUrl, BookId } from '@pioneer/rules/sdk';

import { readFoundryRelease } from './foundry-release';
import type { FoundryRelease } from './foundry-release';
import { replacedLegacy } from './replaced-legacy';
import type { ReplacedLegacy } from './replaced-legacy';
import { selectReplacedLegacy, SkipReason } from './select-entries';
import type { Selection } from './select-entries';
import { LEGACY } from './testing/legacy';

const ROOT = 'pf2e-5.16.1';
const guide = BookId.parse('advanced-players-guide');
const secrets = BookId.parse('secrets-of-magic');
const url = (id: number): AonUrl => AonUrl.parse(`https://2e.aonprd.com/Feats.aspx?ID=${id}`);

const manifest = {
  packs: [{ name: 'feats-srd', path: 'packs/feats', type: 'Item' }],
  languages: [{ lang: 'en', name: 'Main (English)', path: 'lang/en.json' }],
};

function feat(name: string, title: string, remaster = false): object {
  const publication = { title, license: 'OGL', remaster };
  return { _id: `${name}Id`, name, type: 'feat', img: 'icon.webp', system: { publication, rules: [] } };
}

function release(documents: Record<string, object>): FoundryRelease {
  const files = { 'system.pf2e.json': manifest, 'static/lang/en.json': { PF2E: {} }, ...documents };
  return readFoundryRelease(
    new Map(Object.entries(files).map(([file, json]) => [`${ROOT}/${file}`, JSON.stringify(json)] as const)),
  );
}

const GUIDE_TITLE = "Pathfinder Advanced Player's Guide";
const replaced: ReplacedLegacy = new Map([
  [guide, new Map([['dubious-knowledge', url(1)]])],
  [secrets, new Map([['dubious-knowledge', url(1)]])],
]);

function select(documents: Record<string, object>, targets: BookId[]): Selection {
  return selectReplacedLegacy(release(documents), { targets: new Set(targets), books: LEGACY, replaced });
}

describe('replacedLegacy', () => {
  test('names the slug of each replaced entry AoN lists, per book', () => {
    const names = new Map([[url(1), 'Dubious Knowledge']]);

    const slugs = replacedLegacy([{ book: guide, replaced: [url(1), url(2)], names }]);

    const expected = new Map([['dubious-knowledge', url(1)]]);

    expect(slugs).toEqual(new Map([[guide, expected]]));
  });
});

describe('replacedLegacy with two replaced entries of one slug', () => {
  test('keeps the slug and drops the link, as the slug cannot say which entry a document is', () => {
    const names = new Map([
      [url(1), 'Heal'],
      [url(2), 'Heal'],
    ]);

    const slugs = replacedLegacy([{ book: guide, replaced: [url(1), url(2)], names }]);

    expect(slugs).toEqual(new Map([[guide, new Map([['heal', undefined]])]]));
  });
});

describe('selectReplacedLegacy', () => {
  test('keeps a replaced pre-remaster document of a legacy book', () => {
    const { selected } = select({ 'packs/pf2e/feats/a.json': feat('Dubious Knowledge', GUIDE_TITLE) }, [guide]);

    expect(selected.map(({ book }) => book)).toEqual([guide]);
  });

  test('leaves out a legacy document nothing replaces', () => {
    const { selected, skipped } = select({ 'packs/pf2e/feats/a.json': feat('Other Feat', GUIDE_TITLE) }, [guide]);

    expect(selected).toEqual([]);
    expect(skipped.map(({ reason }) => reason)).toEqual([SkipReason.Legacy]);
  });

  test('leaves out a replaced document of a book the registry does not flag legacy', () => {
    const title = 'Pathfinder Secrets of Magic';
    const { selected } = select({ 'packs/pf2e/feats/a.json': feat('Dubious Knowledge', title) }, [secrets]);

    expect(selected).toEqual([]);
  });

  test('takes a remaster document by the remaster rules, not as a replaced one', () => {
    const { selected, skipped } = select({ 'packs/pf2e/feats/a.json': feat('Dubious Knowledge', GUIDE_TITLE, true) }, [
      guide,
    ]);

    expect(selected).toEqual([]);
    expect(skipped.map(({ reason }) => reason)).toEqual([SkipReason.NotOrc]);
  });
});
