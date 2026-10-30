import { By } from '@angular/platform-browser';
import type { RouterTestingHarness } from '@angular/router/testing';
import { Picker } from '@pioneer/frontier/data';

import { present } from './sheet-page-harness';

/** The pickers inside `scope`, in page order. */
function pickersIn(harness: RouterTestingHarness, scope: HTMLElement): readonly Picker<string, object>[] {
  return harness.fixture.debugElement
    .queryAll(By.directive(Picker))
    .filter((each) => each.nativeElement instanceof Node && scope.contains(each.nativeElement))
    .map((each) => each.injector.get<Picker<string, object>>(Picker));
}

/** How many pickers `scope` holds. */
export function pickerCount(harness: RouterTestingHarness, scope: HTMLElement): number {
  return pickersIn(harness, scope).length;
}

/** Which row to pick: the one whose label `matches`, in the `index`th picker (the first by default). */
export interface PickTarget {
  readonly matches: (label: string) => boolean;
  readonly index?: number;
}

/**
 * Picks the row whose label satisfies `matches` in the `index`th picker of `scope`. The table renders no rows in the
 * page harness (#734), so the pick is made on the picker itself: its own specs press the rows.
 */
export function pickRow(harness: RouterTestingHarness, scope: HTMLElement, target: PickTarget): void {
  const picker = present(pickersIn(harness, scope)[target.index ?? 0]);
  const row = present(picker.rows().find((each) => target.matches(picker.rowLabel()(each))));
  picker.value.set(picker.rowValue()(row));
  harness.detectChanges();
}
