import { describe, expect, test } from 'bun:test';

import { ContentText } from '@pioneer/rules/sdk';
import { Uuid } from '@pioneer/shared/kernel';

import { entryLookup } from './content-lookup';
import type { ContentLookup, ContentMatch } from './content-lookup';
import { ImportKind, PathbuilderName } from './import-kind';

const toolkitId = Uuid.parse('6f1f7a52-6a43-4d1e-8f6e-6d1cbb1e7b01');
const wholeId = Uuid.parse('6f1f7a52-6a43-4d1e-8f6e-6d1cbb1e7b02');
const lesserId = Uuid.parse('6f1f7a52-6a43-4d1e-8f6e-6d1cbb1e7b03');
const plusOneId = Uuid.parse('6f1f7a52-6a43-4d1e-8f6e-6d1cbb1e7b04');

function item(id: Uuid, name: string): ContentMatch {
  return { id, name: ContentText.parse(name) };
}

const lookup: ContentLookup = entryLookup({
  [ImportKind.Item]: [
    item(toolkitId, "Healer's Toolkit"),
    item(wholeId, 'Wholesome Bandage'),
    item(lesserId, 'Wholesome Bandages'),
    item(plusOneId, 'Potency Crystal +1'),
  ],
  [ImportKind.Feat]: [item(toolkitId, 'Shield Blocking')],
});

function resolvedId(kind: ImportKind, name: string): Uuid | undefined {
  return lookup.resolve(kind, PathbuilderName.parse(name))?.id;
}

describe('legacy names', () => {
  test("resolves an item's pre-remaster name to its remaster entry", () => {
    expect(resolvedId(ImportKind.Item, "Healer's Tools")).toBe(toolkitId);
  });

  test('applies to items only', () => {
    expect(resolvedId(ImportKind.Feat, "Healer's Tools")).toBeUndefined();
  });
});

describe('typos', () => {
  test.each([
    ['Healers Toolkitt', toolkitId],
    ["Healer's Toolkti", toolkitId],
    ["Healer's Toolit", toolkitId],
    ["Healer's Toolkits", toolkitId],
  ])('%s resolves to its one near name', (typed, id) => {
    expect(resolvedId(ImportKind.Item, typed)).toBe(id);
  });

  test('an exact name wins over a near one', () => {
    expect(resolvedId(ImportKind.Item, 'Wholesome Bandage')).toBe(wholeId);
  });

  test('two near names are ambiguous, so neither matches', () => {
    expect(resolvedId(ImportKind.Item, 'Wholesome Bandagez')).toBeUndefined();
  });

  test('short names are not guessed', () => {
    expect(resolvedId(ImportKind.Item, 'Healer')).toBeUndefined();
  });

  test('a different number is a different item', () => {
    expect(resolvedId(ImportKind.Item, 'Potency Crystal +2')).toBeUndefined();
  });

  test('stays inside the kind', () => {
    expect(resolvedId(ImportKind.Feat, 'Shield Blocking')).toBe(toolkitId);
    expect(resolvedId(ImportKind.Item, 'Shield Blocking')).toBeUndefined();
  });
});
