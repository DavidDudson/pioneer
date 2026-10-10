import { describe, expect, test } from 'bun:test';

import { ContentRegistry, ContentText, ExternalId } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { Uuid } from '@pioneer/shared/kernel';

import { entryLookup, matchKey, registryLookup } from './content-lookup';
import briarRose from './fixtures/briar-rose.json';
import mordred from './fixtures/mordred.json';
import { ImportKind, PathbuilderName } from './import-kind';
import type { ImportedName } from './import-kind';
import { buildImportReport, MatchStatus, unmatchedRows } from './import-report';
import { readPathbuilderExport } from './read-pathbuilder-export';

const dwarfId = Uuid.parse('6f1f7a52-6a43-4d1e-8f6e-6d1cbb1e7a01');
const potionId = Uuid.parse('6f1f7a52-6a43-4d1e-8f6e-6d1cbb1e7a02');

function imported(kind: ImportKind, name: string): ImportedName {
  return { kind, name: PathbuilderName.parse(name) };
}

describe('matchKey', () => {
  test.each([
    ['Healing Potion (Moderate)', 'Healing Potion, Moderate'],
    ["Nature's Reprisal", 'Nature’s Reprisal'],
    ['Wisteria-And-Peony Reunion', 'wisteria and peony reunion'],
    ['Élan', 'elan'],
  ])('%s matches %s', (left, right) => {
    expect(matchKey(left)).toBe(matchKey(right));
  });

  test('keeps different variants apart', () => {
    expect(matchKey('Healing Potion (Moderate)')).not.toBe(matchKey('Healing Potion (Minor)'));
  });
});

describe('buildImportReport', () => {
  const lookup = entryLookup({
    [ImportKind.Ancestry]: [{ id: dwarfId, name: ContentText.parse('Dwarf') }],
    [ImportKind.Item]: [
      {
        id: potionId,
        name: ContentText.parse('Healing Potion, Moderate'),
        externalIds: { pathbuilder: ExternalId.parse('Moderate Healing Potion') },
      },
    ],
  });

  test('marks matched, unmatched and not-loaded names', () => {
    const report = buildImportReport(
      [
        imported(ImportKind.Ancestry, 'dwarf'),
        imported(ImportKind.Ancestry, 'Goloma'),
        imported(ImportKind.Feat, 'Shield Block'),
      ],
      lookup,
    );
    const rows = report.groups.flatMap((group) => group.rows);
    expect<string[][]>(rows.map((row) => [row.name, row.status])).toEqual([
      ['dwarf', MatchStatus.Matched],
      ['Goloma', MatchStatus.Unmatched],
      ['Shield Block', MatchStatus.KindNotLoaded],
    ]);
    expect<object | undefined>(rows[0]?.match).toEqual({ id: dwarfId, name: 'Dwarf' });
  });

  test("matches Pathbuilder's name through externalIds.pathbuilder", () => {
    const report = buildImportReport([imported(ImportKind.Item, 'Moderate Healing Potion')], lookup);
    expect(report.groups[0]?.rows[0]?.match?.id).toBe(potionId);
  });

  test('counts repeats once per kind and name, in kind order', () => {
    const report = buildImportReport(
      [
        imported(ImportKind.Language, 'Common'),
        imported(ImportKind.ClassFeature, 'Nature'),
        imported(ImportKind.ClassFeature, 'Nature'),
        imported(ImportKind.Spell, 'Nature'),
      ],
      lookup,
    );
    expect(report.groups.map((group) => group.kind)).toEqual([
      ImportKind.ClassFeature,
      ImportKind.Spell,
      ImportKind.Language,
    ]);
    expect(report.groups[0]?.rows).toEqual([
      expect.objectContaining({ name: 'Nature', occurrences: 2, status: MatchStatus.KindNotLoaded }),
    ]);
  });
});

describe('buildImportReport: golden fixture against loaded packs', () => {
  const registry = new ContentRegistry();
  registry.register(new ContentPackBuilder().withAncestry('human').withAncestry('dwarf').build());
  const read = readPathbuilderExport(briarRose);
  if (!read.ok) {
    throw new Error('fixture must read');
  }
  const report = buildImportReport(read.value.names, registryLookup(registry));

  test('Goloma is not in the loaded packs, so the ancestry is unmatched', () => {
    expect(report.groups[0]).toEqual({
      kind: ImportKind.Ancestry,
      rows: [expect.objectContaining({ name: 'Goloma', status: MatchStatus.Unmatched })],
    });
  });

  test('every other kind is not loaded yet', () => {
    const others = report.groups.filter((group) => group.kind !== ImportKind.Ancestry);
    expect(others.flatMap((group) => group.rows).every((row) => row.status === MatchStatus.KindNotLoaded)).toBe(true);
  });

  test('nothing matches, so every distinct name is in the unmatched list', () => {
    const distinct = new Set(read.value.names.map((entry) => `${entry.kind}:${entry.name}`));
    expect(unmatchedRows(report)).toHaveLength(distinct.size);
  });

  test('a loaded ancestry matches', () => {
    const human = buildImportReport([imported(ImportKind.Ancestry, 'Human')], registryLookup(registry));
    expect(human.groups[0]?.rows[0]?.status).toBe(MatchStatus.Matched);
  });
});

describe('buildImportReport: Mordred against loaded packs', () => {
  const registry = new ContentRegistry();
  registry.register(new ContentPackBuilder().withAncestry('human').build());
  const read = readPathbuilderExport(mordred);
  if (!read.ok) {
    throw new Error('fixture must read');
  }
  const report = buildImportReport(read.value.names, registryLookup(registry));

  test('Human matches a loaded ancestry', () => {
    expect(report.groups[0]?.rows).toEqual([expect.objectContaining({ name: 'Human', status: MatchStatus.Matched })]);
  });

  const items = report.groups.find((group) => group.kind === ImportKind.Item)?.rows ?? [];

  test('repeated names are counted, not listed twice', () => {
    expect<number | undefined>(items.find((row) => row.name === 'Bastard Sword')?.occurrences).toBe(2);
  });
});
