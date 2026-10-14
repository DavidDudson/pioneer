import { By } from '@angular/platform-browser';
import { AncestryPicker, BackgroundPicker } from '@pioneer/rules/ui';
import type { BackgroundPickerRow } from '@pioneer/rules/ui';
import { vi } from 'vitest';

import { harnessOf, present } from './sheet-page-harness';

/**
 * Opens the Background field and lists the rows its picker was given, as the page builds them. The table renders no
 * rows in the page harness (#734), so the rows are read from the picker itself.
 */
export async function backgroundRowsShown(root: HTMLElement): Promise<readonly BackgroundPickerRow[]> {
  const field = await vi.waitFor(() =>
    present(
      [...root.querySelectorAll<HTMLElement>('fr-inline-field')].find(
        (each) => each.querySelector('fr-text')?.textContent.trim() === 'Background',
      ),
    ),
  );
  present(field.querySelector<HTMLElement>('button')).click();
  return vi.waitFor(() => {
    const found = harnessOf(root).fixture.debugElement.query(By.directive(BackgroundPicker));
    const component: unknown = found.componentInstance;
    if (!(component instanceof BackgroundPicker)) {
      throw new TypeError('Expected the background picker to be open');
    }
    const rows = component.rows();
    if (rows.length === 0) {
      throw new Error('Expected the background picker to have rows');
    }
    return rows;
  });
}

/**
 * Opens the ancestry field and picks the ancestry named `name`, as a press on its row does; returns the field. The
 * table renders no rows in the page harness (#734), so the pick is made on the picker itself: its own specs press the
 * rows.
 */
export async function pickAncestry(root: HTMLElement, name: string): Promise<HTMLElement> {
  const field = present(
    [...root.querySelectorAll<HTMLElement>('fr-inline-field')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim() === 'Ancestry',
    ),
  );
  present(field.querySelector<HTMLElement>('button')).click();
  const picker = await vi.waitFor(() => {
    const found = harnessOf(root).fixture.debugElement.query(By.directive(AncestryPicker));
    const component: unknown = found.componentInstance;
    if (!(component instanceof AncestryPicker)) {
      throw new TypeError('Expected the ancestry picker to be open');
    }
    return component;
  });
  const row = present(picker.rows().find((each) => each.name.startsWith(name)));
  picker.value.set(row.id);
  picker.committed.emit();
  return field;
}
