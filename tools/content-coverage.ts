/**
 * Source coverage report (content-model.md, "Books and source references"): per registered book, how many entries
 * cite it and which cite it by AoN link alone, still waiting for a page number. Reports only; never fails.
 */
import { bookRegistry, contentCatalog, packEntries, sourceCoverage } from '@pioneer/rules/catalog';
import type { BookCoverage } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';

function formatBook({ book, cited, missingPage }: BookCoverage): string {
  const heading = `${book}: ${cited} cited, ${missingPage.length} without a page`;
  return [heading, ...missingPage.map((entry) => `  ${entry}`)].join('\n');
}

const registry = new ContentRegistry();
const packs = await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const coverage = sourceCoverage(
  packs.flatMap((pack) => packEntries(pack)),
  bookRegistry,
);
console.log(coverage.map((book) => formatBook(book)).join('\n'));
