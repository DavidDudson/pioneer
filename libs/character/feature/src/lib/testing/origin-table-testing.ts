import type { ModelSignal, OutputEmitterRef, Signal, Type } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AncestryPicker, BackgroundPicker } from '@pioneer/rules/ui';
import type { BackgroundPickerRow } from '@pioneer/rules/ui';
import { vi } from 'vitest';

import { harnessOf, present } from './sheet-page-harness';

/** What a table picker gives a spec to drive: its rows, its pick, and the commit that saves it. */
interface RowPicker<TRow> {
  readonly rows: Signal<readonly TRow[]>;
  readonly value: ModelSignal<string | undefined>;
  readonly committed: OutputEmitterRef<void>;
}

/** Which picker a spec drives: the label of its field and the component it opens. */
export interface PickerTarget<TPicker> {
  readonly label: string;
  readonly type: Type<TPicker>;
}

/** An opened picker and the field it opened in. */
interface OpenedPicker<TPicker> {
  readonly field: HTMLElement;
  readonly picker: TPicker;
}

/** The inline field labelled `label`. */
function fieldLabelled(root: HTMLElement, label: string): HTMLElement {
  return present(
    [...root.querySelectorAll<HTMLElement>('fr-inline-field')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim() === label,
    ),
  );
}

/** Opens the field labelled `label` and returns its field and the picker of `type` it opened. */
async function openPicker<TRow, TPicker extends RowPicker<TRow>>(
  root: HTMLElement,
  { label, type }: PickerTarget<TPicker>,
): Promise<OpenedPicker<TPicker>> {
  const field = await vi.waitFor(() => fieldLabelled(root, label));
  present(field.querySelector<HTMLElement>('button')).click();
  const picker = await vi.waitFor(() => {
    const found = harnessOf(root).fixture.debugElement.query(By.directive(type));
    const component: unknown = found.componentInstance;
    if (!(component instanceof type)) {
      throw new TypeError(`Expected the ${label} picker to be open`);
    }
    return component;
  });
  return { field, picker };
}

/**
 * Opens the field labelled `label` and lists the rows its picker of `type` was given, as the page builds them. The
 * table renders no rows in the page harness (#734), so the rows are read from the picker itself.
 */
export async function rowsShown<TRow, TPicker extends RowPicker<TRow>>(
  root: HTMLElement,
  target: PickerTarget<TPicker>,
): Promise<readonly TRow[]> {
  const { picker } = await openPicker<TRow, TPicker>(root, target);
  return vi.waitFor(() => {
    const rows = picker.rows();
    if (rows.length === 0) {
      throw new Error(`Expected the ${target.label} picker to have rows`);
    }
    return rows;
  });
}

/**
 * Opens the field labelled `label` and picks the row named `name`, as a press on its row does; returns the field. The
 * table renders no rows in the page harness (#734), so the pick is made on the picker itself: its own specs press the
 * rows.
 */
export async function pickRow<
  TRow extends { readonly id: string; readonly name: string },
  TPicker extends RowPicker<TRow>,
>(root: HTMLElement, target: PickerTarget<TPicker>, name: string): Promise<HTMLElement> {
  const { field, picker } = await openPicker<TRow, TPicker>(root, target);
  const row = await vi.waitFor(() => present(picker.rows().find((each) => each.name.startsWith(name))));
  picker.value.set(row.id);
  picker.committed.emit();
  return field;
}

/**
 * Opens the field labelled `label` and picks `value`, as the picker emits it for a row that is not in its rows: a Lore
 * typed into the search box (`lore:Sailing`). Returns the field.
 */
export async function pickValue<TRow, TPicker extends RowPicker<TRow>>(
  root: HTMLElement,
  target: PickerTarget<TPicker>,
  value: string,
): Promise<HTMLElement> {
  const { field, picker } = await openPicker<TRow, TPicker>(root, target);
  picker.value.set(value);
  picker.committed.emit();
  return field;
}

/** Opens the Background field and lists the rows its picker was given. */
export async function backgroundRowsShown(root: HTMLElement): Promise<readonly BackgroundPickerRow[]> {
  return rowsShown(root, { label: 'Background', type: BackgroundPicker });
}

/** Opens the ancestry field and picks the ancestry named `name`; returns the field. */
export async function pickAncestry(root: HTMLElement, name: string): Promise<HTMLElement> {
  return pickRow(root, { label: 'Ancestry', type: AncestryPicker }, name);
}
