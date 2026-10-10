/**
 * Content coverage report. Sources (content-model.md, "Books and source references"): per registered book, how many
 * entries cite it and which cite it by AoN link alone, still waiting for a page number. Triggers
 * (play-and-campaigns.md, "Triggered abilities"): which actions have a trigger but no `triggerEvent`. Reports only;
 * never fails.
 */
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

function formatBook({ book, cited, missingPage }: BookCoverage): string {
  const heading = `${book}: ${cited} cited, ${missingPage.length} without a page`;
  return [heading, ...missingPage.map((entry) => `  ${entry}`)].join('\n');
}

function formatTriggers({ triggered, withoutEvent }: TriggerCoverage): string {
  const heading = `triggers: ${triggered} actions with a trigger, ${withoutEvent.length} without a trigger event`;
  return [heading, ...withoutEvent.map((entry) => `  ${entry}`)].join('\n');
}

const registry = new ContentRegistry();
// A pack the source checks reject is named and left out, so the report still runs.
const loads = await Promise.allSettled(contentCatalog.map(async (loader) => registry.load(loader)));
const packs = loads.flatMap((load) => (load.status === 'fulfilled' ? [load.value] : []));
const coverage = sourceCoverage(
  packs.flatMap((pack) => packEntries(pack)),
  bookRegistry,
);
console.log(coverage.map((book) => formatBook(book)).join('\n'));
for (const load of loads) {
  if (load.status === 'rejected') {
    console.log(`Not covered: ${String(load.reason)}`);
  }
}

const contents = await Promise.allSettled(officialPacks.map(async (loader) => loader.load()));
const entries = contents.flatMap((load) => (load.status === 'fulfilled' ? load.value.entries : []));
console.log(formatTriggers(triggerCoverage(entries)));
