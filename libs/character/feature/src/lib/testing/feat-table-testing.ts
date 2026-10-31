import { expect, onTestFinished, vi } from 'vitest';

import { LISTBOX_PX, OPTION_PX, settle } from './inventory-sheet-testing';
import { present } from './sheet-page-harness';

/** A row of an open feat table: its cells' text, whether it can be picked, and the cell a press on picks it by. */
export interface FeatTableRow {
  /** The first cell: the name, and why the feat can't be picked when it can't. */
  readonly name: string;
  /** Every cell's text, in column order. */
  readonly cells: readonly string[];
  readonly disabled: boolean;
  /** Pressing it picks the feat. */
  readonly pick: () => void;
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/**
 * Gives the virtualised table a height and each row a touch-target height; nothing is laid out in jsdom. A table reads
 * its height once, as the sheet renders it, so call this before `openSheet`; `openFeatTable` calls it again for the
 * specs that open a sheet without it.
 */
export function stubTableLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(LISTBOX_PX);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: LISTBOX_PX, height: OPTION_PX }),
  );
  onTestFinished(() => {
    vi.restoreAllMocks();
  });
}

function rowsIn(field: HTMLElement): FeatTableRow[] {
  return [...field.querySelectorAll<HTMLElement>('fr-picker-row')].map((row): FeatTableRow => {
    const cells = [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')];
    const first = present(cells[0]);
    return {
      name: textOf(first),
      cells: cells.map((cell) => textOf(cell)),
      disabled: first.getAttribute('aria-disabled') === 'true',
      pick: () => {
        first.click();
      },
    };
  });
}

/**
 * Opens the inline editor of a feat slot, which opens its table of feats, and lists the rows once `count` of them show.
 */
export async function openFeatTable(field: HTMLElement, count: number): Promise<FeatTableRow[]> {
  stubTableLayout();
  present(field.querySelector<HTMLElement>('button')).click();
  await settle();
  return vi.waitFor(() => {
    const rows = rowsIn(field);
    expect(rows).toHaveLength(count);
    return rows;
  });
}

/** Opens the inline editor of a picker and lists its rows once at least one shows; the table needn't be of feats. */
export async function openPickerTable(field: HTMLElement): Promise<FeatTableRow[]> {
  stubTableLayout();
  present(field.querySelector<HTMLElement>('button')).click();
  await settle();
  return vi.waitFor(() => {
    const rows = rowsIn(field);
    expect(rows.length).toBeGreaterThan(0);
    return rows;
  });
}
