/**
 * Content coverage report (content-model.md, "Coverage report"). Per kind, over the committed packs and their import
 * backlogs (`content/import/<pack>.json`): entries, entries with every rule element translated, entries with nothing
 * left in the backlog, entries with a page number and with an AoN link, and entries the import left out. Sources
 * ("Books and source references"): per registered book, how many entries cite it and which still lack a page.
 * Triggers (play-and-campaigns.md, "Triggered abilities"): which actions have a trigger but no `triggerEvent`.
 * Reports only; never fails. CI runs it on pull requests touching `content/`.
 */
import path from 'node:path';

import { ImportFile, importCoverage } from '@pioneer/interop/foundry';
import type { BacklogItem } from '@pioneer/interop/foundry';
import {
  bookRegistry,
  contentCatalog,
  officialPacks,
  packEntries,
  sourceCoverage,
  triggerCoverage,
} from '@pioneer/rules/catalog';
import type { BookCoverage, TriggerCoverage } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { formatCoverage } from './content-import/coverage-table.ts';

const ROOT = path.join(import.meta.dir, '..');
const IMPORTS = path.join(ROOT, 'content', 'import');
/** How many entries a list names before it only counts the rest. */
const LISTED = 20;

function formatList(entries: readonly string[]): string[] {
  const rest = entries.length - LISTED;
  return [...entries.slice(0, LISTED).map((entry) => `  ${entry}`), ...(rest > 0 ? [`  … ${rest} more`] : [])];
}

function formatBook({ book, cited, missingPage }: BookCoverage): string {
  const heading = `${book}: ${cited} cited, ${missingPage.length} without a page`;
  return [heading, ...formatList(missingPage)].join('\n');
}

function formatTriggers({ triggered, withoutEvent }: TriggerCoverage): string {
  const heading = `triggers: ${triggered} actions with a trigger, ${withoutEvent.length} without a trigger event`;
  return [heading, ...formatList(withoutEvent)].join('\n');
}

async function backlogs(): Promise<readonly BacklogItem[]> {
  const files = await Array.fromAsync(new Glob('*.json').scan({ cwd: IMPORTS, absolute: true }));
  const imports = await Promise.all(files.map(async (file) => ImportFile.parse(await Bun.file(file).json())));
  return imports.flatMap(({ backlog }) => backlog);
}

const contents = await Promise.allSettled(officialPacks.map(async (loader) => loader.load()));
const entries = contents.flatMap((load) => (load.status === 'fulfilled' ? load.value.entries : []));
// A pack the source checks reject is named and left out, so the report still runs.
for (const load of contents) {
  if (load.status === 'rejected') {
    console.log(`Not covered: ${String(load.reason)}`);
  }
}
const backlog = await backlogs();
console.log(formatCoverage(importCoverage(entries, backlog)));

const registry = new ContentRegistry();
const loads = await Promise.allSettled(contentCatalog.map(async (loader) => registry.load(loader)));
const packs = loads.flatMap((load) => (load.status === 'fulfilled' ? [load.value] : []));
const coverage = sourceCoverage(
  packs.flatMap((pack) => packEntries(pack)),
  bookRegistry,
);
console.log(coverage.map((book) => formatBook(book)).join('\n'));
console.log(formatTriggers(triggerCoverage(entries)));
