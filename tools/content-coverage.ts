/**
 * Content coverage report (content-model.md, "Coverage report"). Per kind, over the committed packs and their import
 * backlogs (`content/import/<pack>.json`): entries, entries with every rule element translated, entries with nothing
 * left in the backlog, entries with a page number and with an AoN link, and entries the import left out. Sources
 * ("Books and source references"): per registered book, how many entries cite it and which still lack a page.
 * Triggers (play-and-campaigns.md, "Triggered abilities"): which actions have a trigger but no `triggerEvent`,
 * grouped by wording, most common first.
 * Prerequisites (content-model.md, "Prerequisites"): which feats have prerequisites but no `prerequisitePredicate`.
 * Reports only; never fails. CI runs it on pull requests touching `content/`.
 */
import path from 'node:path';

import { creatureCoverage, importCoverage, ImportFile } from '@pioneer/interop/foundry';
import type { BacklogItem } from '@pioneer/interop/foundry';
import {
  bookRegistry,
  contentCatalog,
  officialPacks,
  packEntries,
  prerequisiteCoverage,
  sourceCoverage,
  staffCoverage,
  triggerCoverage,
} from '@pioneer/rules/catalog';
import type { BookCoverage, PrerequisiteCoverage, StaffCoverage, TriggerCoverage } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentId, ContentText } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { formatCoverage, formatCreatureCoverage } from './content-import/coverage-table.ts';

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

function formatPrerequisites({ withPrerequisites, withoutPredicate }: PrerequisiteCoverage): string {
  const heading = `prerequisites: ${withPrerequisites} feats with prerequisites, ${withoutPredicate.length} without a predicate`;

  return [heading, ...formatList(withoutPredicate)].join('\n');
}

function formatTriggers({ triggered, withoutEvent, unmatched }: TriggerCoverage): string {
  const heading = `triggers: ${triggered} actions with a trigger, ${withoutEvent.length} without a trigger event`;
  const phrasings = unmatched.map(({ phrasing, count }) => `${count}\u00D7 ${phrasing}`);

  return [heading, ...formatList(phrasings)].join('\n');
}

function formatStaves({ staves, withoutSpells }: StaffCoverage): string {
  const heading = `staves: ${staves} staves, ${withoutSpells.length} without typed spells`;

  return [heading, ...formatList(withoutSpells)].join('\n');
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

console.log(formatCreatureCoverage(creatureCoverage(entries)));

const registry = new ContentRegistry();
const loads = await Promise.allSettled(contentCatalog.map(async (loader) => registry.load(loader)));
const packs = loads.flatMap((load) => (load.status === 'fulfilled' ? [load.value] : []));

const coverage = sourceCoverage(
  packs.flatMap((pack) => packEntries(pack)),
  bookRegistry,
);

console.log(coverage.map((book) => formatBook(book)).join('\n'));

const entryNames = new Map<ContentId, ContentText>(entries.map((entry) => [entry.id, entry.name]));

console.log(formatTriggers(triggerCoverage(entries, entryNames)));

console.log(formatPrerequisites(prerequisiteCoverage(entries)));

console.log(formatStaves(staffCoverage(entries)));
