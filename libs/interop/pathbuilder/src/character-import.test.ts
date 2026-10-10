import { describe, expect, test } from 'bun:test';

import { ContentText } from '@pioneer/rules/sdk';
import { Uuid } from '@pioneer/shared/kernel';

import { characterImportReport, UncarriedField, UnmatchedReason } from './character-import';
import { entryLookup } from './content-lookup';
import briarRose from './fixtures/briar-rose.json';
import { ImportKind } from './import-kind';
import { readPathbuilderExport } from './read-pathbuilder-export';
import type { PathbuilderImport } from './read-pathbuilder-export';

const golomaId = Uuid.parse('6f1f7a52-6a43-4d1e-8f6e-6d1cbb1e7a11');

function briar(): PathbuilderImport {
  const read = readPathbuilderExport(briarRose);
  if (!read.ok) {
    throw new Error('Briar Rose fixture no longer reads');
  }
  return read.value;
}

describe('characterImportReport', () => {
  const value = briar();
  const lookup = entryLookup({
    [ImportKind.Ancestry]: [{ id: golomaId, name: ContentText.parse('Goloma') }],
    [ImportKind.Feat]: [],
  });
  const report = characterImportReport(value, lookup);

  test('leaves matched names out and keeps kind order', () => {
    const kinds = report.unmatched.map((group) => group.kind);
    expect(kinds).not.toContain(ImportKind.Ancestry);
    expect(kinds.slice(0, 3)).toStrictEqual([ImportKind.Heritage, ImportKind.Background, ImportKind.Class]);
  });

  test('says why each name was not carried over', () => {
    const reasons = (kind: ImportKind): ReadonlySet<UnmatchedReason> =>
      new Set(report.unmatched.find((group) => group.kind === kind)?.names.map((name) => name.reason));
    expect(reasons(ImportKind.Feat)).toStrictEqual(new Set([UnmatchedReason.Unmatched]));
    expect(reasons(ImportKind.Heritage)).toStrictEqual(new Set([UnmatchedReason.KindNotLoaded]));
  });

  test('lists the filled fields the character cannot hold yet, ancestry never among them', () => {
    expect(report.notCarried[0]).toBe(UncarriedField.Heritage);
    expect(report.notCarried).toContain(UncarriedField.Feat);
    expect(report.notCarried).not.toContain(ImportKind.Ancestry);
  });

  test('lists lores only when the export has some', () => {
    expect(characterImportReport({ ...value, lores: [] }, lookup).notCarried).not.toContain(UncarriedField.Lore);
  });
});
