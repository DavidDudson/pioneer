import { describe, expect, test } from 'bun:test';

import { contentId, ContentId, ContentLicense, ContentText, EntrySlug } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, installRulesFakes } from '@pioneer/rules/sdk/testing';
import { sample } from 'fast-check';

import type { ContentReference } from './content-reference';
import { EmbeddedPack } from './embedded-homebrew';
import { exportPioneerCharacter } from './export-pioneer-character';
import type { PioneerExportResult } from './export-pioneer-character';
import { namedCharacter, TEST_PACK } from './testing/named-character';
import type { NamedCharacter } from './testing/named-character';

installRulesFakes();

const SAMPLES = 1;
const MIN_IDS = 3;

function generated(): NamedCharacter {
  const [character] = sample(
    namedCharacter.filter(({ ids }) => ids.length >= MIN_IDS),
    SAMPLES,
  );
  if (character === undefined) {
    throw new Error('Expected a generated character with content');
  }
  return character;
}

const { character, name, ids, references } = generated();
const [officialId, carriedId, ...otherIds] = ids;

function required<Value>(value: Value | undefined): Value {
  if (value === undefined) {
    throw new Error('Expected a value');
  }
  return value;
}

/** A feat as the content tables hold it, filed under `slug` in the test pack. */
function featNamed(slug: EntrySlug): ContentEntry {
  const [template] = new ContentPackBuilder().withId(TEST_PACK).withFeat('template').build().otherEntries;
  return { ...required(template), slug, id: ContentId.parse(contentId(TEST_PACK, slug)) };
}

function entryFor(id: ContentId): ContentEntry {
  return featNamed(required(references.get(id)).slug);
}

function packOf(entries: readonly ContentEntry[]): EmbeddedPack {
  return EmbeddedPack.parse({
    pack: {
      id: TEST_PACK,
      title: ContentText.parse('Test'),
      publisher: ContentText.parse('Me'),
      license: ContentLicense.Homebrew,
    },
    entries,
  });
}

function slugsOf(result: PioneerExportResult): string[] {
  const entries = result.ok ? (result.file.homebrew?.flatMap((pack) => pack.entries) ?? []) : [];
  return entries.map((entry) => entry.slug).toSorted();
}

function unnamedOf(result: PioneerExportResult): ContentId[] {
  return result.ok ? [] : result.unnamed.toSorted();
}

const unusedEntry = featNamed(EntrySlug.parse('feat:unused'));
const homebrewIds = [carriedId, ...otherIds].map((id) => required(id));
const homebrewSlugs = homebrewIds.map((id) => String(entryFor(id).slug)).toSorted();
function officialOnly(id: ContentId): ContentReference | undefined {
  return id === officialId ? references.get(id) : undefined;
}

describe('exportPioneerCharacter with embedded homebrew', () => {
  test('carries the homebrew entries the character uses, and only those', () => {
    const embedded = packOf([...homebrewIds.map((id) => entryFor(id)), unusedEntry]);

    const exported = exportPioneerCharacter(character, officialOnly, [embedded]);

    expect(exported.ok).toBe(true);
    expect(slugsOf(exported)).toStrictEqual(homebrewSlugs);
  });

  test('writes no homebrew when everything is loaded', () => {
    const exported = exportPioneerCharacter(character, name, [packOf([unusedEntry])]);

    expect(exported.ok).toBe(true);
    expect(slugsOf(exported)).toStrictEqual([]);
  });

  test('still fails, listing the ids neither the packs nor the file can name', () => {
    const embedded = packOf([entryFor(required(carriedId))]);

    const exported = exportPioneerCharacter(character, () => undefined, [embedded]);

    expect(unnamedOf(exported)).toStrictEqual([required(officialId), ...otherIds].toSorted());
  });
});
