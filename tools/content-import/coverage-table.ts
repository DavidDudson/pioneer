/**
 * The coverage table the importer prints after a run and `bun run content:coverage` prints over the committed packs
 * (content-model.md, "Coverage report"), so both report the same numbers the same way.
 */
import type { KindCoverage } from '@pioneer/interop/foundry';

const HEADINGS = ['kind', 'entries', 'rules translated', 'complete', 'with page', 'with AoN', 'left out'];
const PERCENT = 100;

function percent(part: number, whole: number): string {
  return whole === 0 ? '' : ` (${Math.round((part / whole) * PERCENT)}%)`;
}

function cells(label: string, row: Omit<KindCoverage, 'kind'>): string[] {
  const { entries, rulesTranslated, complete, withPage, withAon, leftOut } = row;
  return [
    label,
    String(entries),
    `${rulesTranslated}${percent(rulesTranslated, entries)}`,
    `${complete}${percent(complete, entries)}`,
    `${withPage}${percent(withPage, entries)}`,
    `${withAon}${percent(withAon, entries)}`,
    String(leftOut),
  ];
}

function total(rows: readonly KindCoverage[]): Omit<KindCoverage, 'kind'> {
  const sum = (field: keyof Omit<KindCoverage, 'kind'>): number => rows.reduce((all, row) => all + row[field], 0);
  return {
    entries: sum('entries'),
    rulesTranslated: sum('rulesTranslated'),
    complete: sum('complete'),
    withPage: sum('withPage'),
    withAon: sum('withAon'),
    leftOut: sum('leftOut'),
  };
}

/** One row per kind and a total, columns aligned: kinds left, counts right. */
export function formatCoverage(rows: readonly KindCoverage[]): string {
  const table = [HEADINGS, ...rows.map((row) => cells(row.kind, row)), cells('total', total(rows))];
  const widths = [...HEADINGS.keys()].map((column) => Math.max(...table.map((row) => row[column]?.length ?? 0)));
  return table
    .map((row) =>
      row
        .map((cell, column) => (column === 0 ? cell.padEnd(widths[column] ?? 0) : cell.padStart(widths[column] ?? 0)))
        .join('  '),
    )
    .join('\n');
}
