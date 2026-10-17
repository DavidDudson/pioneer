import { describe, expect, test } from 'bun:test';

import { ContentText } from '@pioneer/rules/sdk';
import { Uuid } from '@pioneer/shared/kernel';

import { characterImportReport, RuleBreakingCount, UncarriedField, UnmatchedReason } from './character-import';
import type { CharacterImportReport, ImportOutcome } from './character-import';
import { entryLookup } from './content-lookup';
import briarRose from './fixtures/briar-rose.json';
import { ImportKind, PathbuilderName } from './import-kind';
import { readPathbuilderExport } from './read-pathbuilder-export';
import type { PathbuilderImport } from './read-pathbuilder-export';

const NOTHING_REFUSED: ImportOutcome = {
  notOffered: [],
  unplacedBoosts: [],
  skillGaps: [],
  spellGaps: [],
  modifierDifferences: [],
  discrepancies: { compared: 0, differences: [] },
  ruleBreaking: RuleBreakingCount.parse(0),
};
const golomaId = Uuid.parse('6f1f7a52-6a43-4d1e-8f6e-6d1cbb1e7a11');
const vigilantGolomaId = Uuid.parse('0d5c1e0b-3f7a-4b2e-9c1d-2a8e4f6b7c10');

function briar(): PathbuilderImport {
  const read = readPathbuilderExport(briarRose);
  if (!read.ok) {
    throw new Error('Briar Rose fixture no longer reads');
  }
  return read.value;
}

function reasons(report: CharacterImportReport, kind: ImportKind): ReadonlySet<UnmatchedReason> {
  return new Set(report.unmatched.find((group) => group.kind === kind)?.names.map((name) => name.reason));
}

describe('characterImportReport', () => {
  const value = briar();
  const lookup = entryLookup({
    [ImportKind.Ancestry]: [{ id: golomaId, name: ContentText.parse('Goloma') }],
    [ImportKind.Feat]: [],
  });
  const report = characterImportReport(value, lookup, NOTHING_REFUSED);

  test('leaves matched names out and keeps kind order', () => {
    const kinds = report.unmatched.map((group) => group.kind);
    expect(kinds).not.toContain(ImportKind.Ancestry);
    expect(kinds.slice(0, 3)).toStrictEqual([ImportKind.Heritage, ImportKind.Background, ImportKind.Class]);
  });

  test('says why each name was not carried over', () => {
    expect(reasons(report, ImportKind.Feat)).toStrictEqual(new Set([UnmatchedReason.Unmatched]));
    expect(reasons(report, ImportKind.Heritage)).toStrictEqual(new Set([UnmatchedReason.KindNotLoaded]));
  });

  test('lists the filled fields the character cannot hold yet, ancestry and heritage never among them', () => {
    expect(report.notCarried).toContain(UncarriedField.ClassFeature);
    expect(report.notCarried).not.toContain(ImportKind.Ancestry);
    expect(report.notCarried).not.toContain(ImportKind.Heritage);
  });

  test('a matched heritage its slot refused is reported as not offered', () => {
    const heritages = entryLookup({
      [ImportKind.Heritage]: [{ id: vigilantGolomaId, name: ContentText.parse('Vigilant Goloma') }],
    });
    const notOffered = [{ kind: ImportKind.Heritage, name: PathbuilderName.parse('Vigilant Goloma') }];
    const refused = characterImportReport(value, heritages, { ...NOTHING_REFUSED, notOffered });
    expect(reasons(refused, ImportKind.Heritage)).toStrictEqual(new Set([UnmatchedReason.NotOffered]));
    const filled = characterImportReport(value, heritages, NOTHING_REFUSED);
    expect(filled.unmatched.map((group) => group.kind)).not.toContain(ImportKind.Heritage);
  });
});
