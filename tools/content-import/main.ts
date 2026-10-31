/**
 * One-off Foundry import (ADR-0031, content-model.md "Foundry import"): `just content-import --pack <pack>
 * --book <book>... [--dry-run]`. Downloads the pack's pinned foundryvtt/pf2e release into a gitignored cache, checks
 * its SHA-256, reads the item packs, journals and config vocabularies, selects entries, translates them, validates
 * the result (`packOutput`), carries over the page numbers and AoN links of the entries it replaces
 * (`carrySources`), and reports what the import brings in, what it could not translate and its coverage. Without
 * `--dry-run` it then writes the pack, the vocabulary it adds to `core-rules` and the backlog (`write-output.ts`), and
 * names the files to register in the catalog.
 */
import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import {
  archiveUrl,
  BacklogItemType,
  carrySources,
  creatureCoverage,
  creatureEntry,
  dryRunReport,
  FOUNDRY_BOOK_TITLES,
  importCoverage,
  ImportFile,
  kindDataReport,
  packOutput,
  readFoundryRelease,
  RELEASE_FILES,
  selectCreatures,
  selectEntries,
  sha256,
  SkipReason,
  translateImport,
  translationReport,
} from '@pioneer/interop/foundry';
import type {
  BacklogItem,
  DryRunReport,
  EnvelopeTranslation,
  FoundryReleaseTag,
  ImportPin,
  ImportTranslation,
  KeyCount,
  KindCount,
  KnownEntry,
  Selection,
  Sha256,
} from '@pioneer/interop/foundry';
import { bookRegistry, officialPacks } from '@pioneer/rules/catalog';
import { BookId, PackId } from '@pioneer/rules/sdk';

import { formatCoverage, formatCreatureCoverage } from './coverage-table.ts';
import { formatCreatures } from './creature-report.ts';
import { loadFoundryConfig } from './foundry-config-loader';
import type { PackTargets } from './pack-writes.ts';
import { applyRules, committedEntries, previousImport, writeChecks, writeOutput } from './write-output.ts';

const ROOT = path.resolve(import.meta.dir, '../..');
const CACHE = path.join(ROOT, '.data/foundry');
const UNREADABLE_SHOWN = 20;
const FAILURES_SHOWN = 20;
const KEYS_SHOWN = 15;
/** Where vocabulary entries (traits, senses, damage types) go, beside the hand-authored rules core entries. */
const VOCABULARY_PACK = PackId.parse('core-rules');
const FOUNDRY_TITLED: ReadonlySet<BookId> = new Set(FOUNDRY_BOOK_TITLES.values());

interface Options {
  readonly pack: PackId;
  readonly books: ReadonlySet<BookId>;
  readonly dryRun: boolean;
  /** Keep the committed pack and take only the rules the translators now cover (`apply-rules.ts`). */
  readonly applyRules: ReadonlySet<string> | undefined;
}

function options(): Options {
  const { values } = parseArgs({
    options: {
      pack: { type: 'string' },
      book: { type: 'string', multiple: true },
      'dry-run': { type: 'boolean', default: false },
      'apply-rules': { type: 'string' },
    },
  });
  const books = (values.book ?? []).map((book) => BookId.parse(book));
  for (const book of books) {
    if (bookRegistry.book(book) === undefined) {
      throw new Error(`${book} is not in the book registry`);
    }
    if (!FOUNDRY_TITLED.has(book)) {
      throw new Error(`${book} has no Foundry publication title in FOUNDRY_BOOK_TITLES`);
    }
  }
  if (books.length === 0) {
    throw new Error('Name at least one target book with --book');
  }
  return {
    pack: PackId.parse(values.pack),
    books: new Set(books),
    dryRun: values['dry-run'],
    applyRules: values['apply-rules'] === undefined ? undefined : new Set(values['apply-rules'].split(',')),
  };
}

async function readPin(pack: PackId): Promise<ImportPin> {
  const file = Bun.file(path.join(ROOT, 'content/import', `${pack}.json`));
  const pinned = await file.exists();
  if (!pinned) {
    throw new Error(`content/import/${pack}.json is missing; commit the pack's pin first (ADR-0031)`);
  }
  const { pin } = ImportFile.parse(await file.json());
  return pin;
}

async function verified(
  bytes: Uint8Array<ArrayBuffer>,
  expected: Sha256,
  what: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const actual = await sha256(bytes);
  if (actual !== expected) {
    throw new Error(`${what} has SHA-256 ${actual}, the pin says ${expected}`);
  }
  return bytes;
}

async function download(tag: FoundryReleaseTag, expected: Sha256, cachePath: string): Promise<Uint8Array<ArrayBuffer>> {
  console.log(`Downloading ${archiveUrl(tag)}`);
  const response = await fetch(archiveUrl(tag));
  if (!response.ok) {
    throw new Error(`Download of ${tag} failed: ${response.status} ${response.statusText}`);
  }
  const bytes = await verified(new Uint8Array(await response.arrayBuffer()), expected, `${tag} (not cached)`);
  await mkdir(CACHE, { recursive: true });
  // Written aside and renamed, so an interrupted run never leaves a partial archive in the cache.
  await Bun.write(`${cachePath}.partial`, bytes);
  await rename(`${cachePath}.partial`, cachePath);
  return bytes;
}

/** The pinned archive, from the cache or downloaded into it; never returned unless its checksum matches the pin. */
async function archive({ tag, sha256: expected }: ImportPin): Promise<Uint8Array<ArrayBuffer>> {
  const cachePath = path.join(CACHE, `${tag}.tar.gz`);
  const cached = Bun.file(cachePath);
  const hit = await cached.exists();
  return hit
    ? verified(await cached.bytes(), expected, `${cachePath} (delete it to re-download)`)
    : download(tag, expected, cachePath);
}

async function archiveFiles(bytes: Uint8Array<ArrayBuffer>): Promise<ReadonlyMap<string, string>> {
  const members = await new Bun.Archive(bytes).files([...RELEASE_FILES]);
  const texts = await Promise.all([...members].map(async ([name, file]) => [name, await file.text()] as const));
  return new Map(texts);
}

function formatReport({ imported, skipped }: DryRunReport, { skipped: entries }: Selection): string {
  const total = imported.reduce((sum, { count }) => sum + count, 0);
  const skippedTotal = skipped.reduce((sum, { count }) => sum + count, 0);
  const unreadable = entries.filter(({ reason }) => reason === SkipReason.Unreadable);
  return [
    `Would import ${total}:`,
    ...imported.map(({ book, type, count }) => `  ${book}  ${type}  ${count}`),
    `Skipped ${skippedTotal}:`,
    ...skipped.map(({ reason, detail, count }) => `  ${reason}  ${detail === '' ? '-' : detail}  ${count}`),
    ...unreadable.slice(0, UNREADABLE_SHOWN).map(({ path: file, detail }) => `  unreadable ${file}: ${detail}`),
  ].join('\n');
}

function sumOf(counts: readonly KeyCount[]): number {
  return counts.reduce((sum, { count }) => sum + count, 0);
}

function formatCounts(counts: readonly KeyCount[]): string[] {
  const shown = counts.slice(0, KEYS_SHOWN).map(({ key, count }) => `  ${key === '' ? '-' : key}  ${count}`);
  const rest = counts.length - shown.length;
  return rest > 0 ? [...shown, `  … ${rest} more`] : shown;
}

function formatTranslation(translation: EnvelopeTranslation): string {
  const {
    entries,
    failures,
    untranslatedRules,
    droppedRules,
    unknownTraits,
    unknownMarkup,
    untranslatedEnrichers,
    unresolvedText,
  } = translationReport(translation);
  return [
    `Translated ${entries} envelopes; ${sumOf(failures)} failed:`,
    ...formatCounts(failures),
    ...translation.failures
      .slice(0, FAILURES_SHOWN)
      .map(({ path: file, reason, detail }) => `  ${reason} ${file}: ${detail}`),
    `Untranslated rule elements ${sumOf(untranslatedRules)}, by key:`,
    ...formatCounts(untranslatedRules),
    `Rule elements dropped on purpose ${sumOf(droppedRules)}, by key and reason:`,
    ...formatCounts(droppedRules),
    `Traits outside Pioneer's vocabulary ${unknownTraits.length} (${sumOf(unknownTraits)} uses):`,
    ...formatCounts(unknownTraits),
    'Description markup kept as text only, by entries using it:',
    ...formatCounts(unknownMarkup),
    'Description enrichers kept as text or dropped, by entries using them:',
    ...formatCounts(untranslatedEnrichers),
    `Lang keys left out of the text ${sumOf(unresolvedText)}, by reason and key:`,
    ...formatCounts(unresolvedText),
  ].join('\n');
}

/**
 * The entries of the official packs other than the one being imported, which the import replaces, less what its
 * earlier runs added to the vocabulary pack, which it replaces too.
 */
async function knownEntries(targets: PackTargets): Promise<readonly KnownEntry[]> {
  const others = officialPacks.filter(({ id }) => id !== targets.pack);
  const packs = await Promise.all(others.map(async ({ load }) => load()));
  const replaced = await previousImport(targets);
  return packs.flatMap(({ entries }) =>
    entries.flatMap(({ id, pack: entryPack, kind, slug, externalIds }) => {
      const foundry = externalIds?.foundry;
      return replaced.has(id)
        ? []
        : [{ id, pack: entryPack, kind, slug, ...(foundry === undefined ? {} : { foundry }) }];
    }),
  );
}

function formatLeftOut(backlog: readonly BacklogItem[]): string {
  const leftOut = backlog.flatMap((item) =>
    item.type === BacklogItemType.Entry && item.leftOut !== undefined
      ? [{ key: `${item.leftOut.reason} ${item.pack}/${item.slug}`, detail: item.leftOut.detail }]
      : [],
  );
  return [
    `Left out of the pack ${leftOut.length}:`,
    ...leftOut.map(({ key, detail }) => `  ${key}${detail === '' ? '' : `: ${detail}`}`),
  ].join('\n');
}

function formatKinds(counts: readonly KindCount[]): string[] {
  return counts.map(({ kind, count }) => `  ${kind}  ${count}`);
}

function formatKindData(translation: ImportTranslation): string {
  const { kindData, vocabulary, kindDataGaps, vocabularyGaps } = kindDataReport(translation);
  return [
    `Kind data built ${kindData.reduce((sum, { count }) => sum + count, 0)}:`,
    ...formatKinds(kindData),
    `Kind data gaps ${sumOf(kindDataGaps)}, by reason and field:`,
    ...formatCounts(kindDataGaps),
    `Vocabulary entries ${vocabulary.reduce((sum, { count }) => sum + count, 0)}:`,
    ...formatKinds(vocabulary),
    `Vocabulary gaps ${sumOf(vocabularyGaps)}, by kind and reason:`,
    ...formatCounts(vocabularyGaps),
  ].join('\n');
}

const { pack, books, dryRun, applyRules: rulesOnly } = options();
const targets: PackTargets = { pack, vocabularyPack: VOCABULARY_PACK };
const pin = await readPin(pack);
const files = await archiveFiles(await archive(pin));
const release = readFoundryRelease(files);
const config = await loadFoundryConfig(files, path.join(CACHE, pin.tag));
const selection = selectEntries(release, books);
console.log(`${pack} at ${pin.tag}, books ${[...books].join(', ')}`);
console.log(formatReport(dryRunReport(selection), selection));
const creatures = selectCreatures(release, books);
console.log(formatCreatures(creatures));
const known = await knownEntries(targets);
const translation = translateImport([...selection.selected, ...creatures.selected.map((each) => creatureEntry(each))], {
  pack,
  vocabularyPack: VOCABULARY_PACK,
  books: [...books],
  config,
  lang: release.lang,
  known,
  documents: release.documents,
  journals: release.journals,
});
console.log(formatTranslation(translation.envelopes));
console.log(formatKindData(translation));
const generated = packOutput(translation, { known });
// Page numbers and AoN links on the entries the import replaces carry over to the imported entry with the same slug.
const output = { ...generated, entries: carrySources(generated.entries, await committedEntries(targets)) };
console.log(formatLeftOut(output.backlog));
console.log(formatCoverage(importCoverage(output.entries, output.backlog)));
console.log(formatCreatureCoverage(creatureCoverage(output.entries)));
if (!dryRun && rulesOnly !== undefined) {
  const { written, applied } = await applyRules(output, targets, rulesOnly);
  console.log(
    [
      `Took the import's ${[...rulesOnly].join(', ')} rules into ${applied} committed entries; wrote:`,
      ...written.map((file) => `  ${file}`),
    ].join('\n'),
  );
} else if (!dryRun) {
  const written = await writeOutput(output, targets, pin);
  console.log([`Wrote ${written.length} files:`, ...written.map((file) => `  ${file}`)].join('\n'));
  console.log(await writeChecks(written));
}
