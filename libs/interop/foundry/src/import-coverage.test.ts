import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, SourceKind } from '@pioneer/rules/sdk';

import { importCoverage } from './import-coverage';
import { packOutput } from './pack-output';
import { known, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { AID } from './testing/kind-fixtures';

function feat(id: string, name: string, system: object = {}): DocumentFixture {
  return {
    id,
    name,
    type: 'feat',
    system: { category: 'general', level: { value: 1 }, actionType: { value: 'passive' }, ...system },
  };
}

const PLAIN = feat('plainFeat0000001', 'Plain');
const IMAGE = feat('imageFeat0000001', 'Image', { rules: [{ key: 'TokenImage', value: 'token.webp' }] });
const MARKED = feat('markedFeat000001', 'Marked', { description: { value: '<p><span>Hi</span></p>' } });
/** A condition whose system does not translate, so it has no data and is left out. */
const ODD = { id: 'oddCondition0001', name: 'Odd', type: 'condition' };
const AON = 'https://2e.aonprd.com/Actions.aspx?ID=1';

/** `entry`, located: the action cites its page and AoN entry, the rest only the book. */
function located(entry: ContentEntry): ContentEntry {
  return entry.kind === ContentKind.Action
    ? ContentEntry.parse({ ...entry, sources: [{ kind: SourceKind.Book, book: 'player-core', page: 1, aon: AON }] })
    : entry;
}

describe('importCoverage', () => {
  const { entries, backlog } = packOutput(translate([AID, PLAIN, IMAGE, MARKED, ODD]), { known });
  const coverage = importCoverage(
    entries.map((entry) => located(entry)),
    backlog,
  );

  test('counts, per kind, entries whole, with rule elements translated, and with page and AoN link', () => {
    expect(coverage.find(({ kind }) => kind === ContentKind.Feat)).toEqual({
      kind: ContentKind.Feat,
      entries: 3,
      rulesTranslated: 2,
      complete: 1,
      withPage: 0,
      withAon: 0,
      leftOut: 0,
    });
    expect(coverage.find(({ kind }) => kind === ContentKind.Action)).toEqual({
      kind: ContentKind.Action,
      entries: 1,
      rulesTranslated: 1,
      complete: 1,
      withPage: 1,
      withAon: 1,
      leftOut: 0,
    });
  });

  test('counts entries left out under their kind', () => {
    expect(coverage.find(({ kind }) => kind === ContentKind.Condition)).toMatchObject({ entries: 0, leftOut: 1 });
  });

  test('lists kinds in order', () => {
    const kinds = coverage.map(({ kind }) => kind);

    expect(kinds).toEqual(kinds.toSorted());
  });
});
