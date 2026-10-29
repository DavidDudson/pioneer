import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import { SlotPicker } from '@pioneer/rules/ui';
import { kernelMessages } from '@pioneer/shared/kernel';
import { provideI18n } from '@pioneer/shared/web';

import { playRoutes } from '../../play.routes';

/* Helpers for the rules playground specs: open the page, pick a tool, type, read the page. */

export function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

/** Opens the playground; `providers` replace defaults such as the statistics loader. */
export async function openPlayground(providers: readonly Provider[] = []): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      ...providers,
      provideRouter([{ path: 'play', children: playRoutes }]),
      provideI18n({ en: async () => ({ ...kernelMessages, ...frontierMessages }) }),
    ],
  });
  const harness = await RouterTestingHarness.create('/play/rules');
  await harness.fixture.whenStable();
  return harness;
}

export async function typeJson(harness: RouterTestingHarness, text: string): Promise<void> {
  const textarea = present(harness.routeNativeElement?.querySelector('textarea'));
  textarea.value = text;
  textarea.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

/**
 * Picks the row named `option` in `picker`, as a press on its row does. The table renders no rows in the page harness
 * (#734), so the pick is made on the picker itself: its own specs press the rows.
 */
async function pickByLabel(
  harness: RouterTestingHarness,
  picker: Picker<string, object>,
  option: string,
): Promise<void> {
  const row = present(picker.rows().find((candidate) => picker.rowLabel()(candidate) === option));
  picker.value.set(picker.rowValue()(row));
  harness.detectChanges();
  await harness.fixture.whenStable();
}

/** The picker of the field labelled `label`. */
function pickerIn(harness: RouterTestingHarness, label: string): Picker<string, object> {
  const fields = [...present(harness.routeNativeElement).querySelectorAll<HTMLElement>('fr-field')];
  const field = present(fields.find((candidate) => candidate.querySelector('fr-label')?.textContent.trim() === label));
  const match = harness.fixture.debugElement
    .queryAll(By.directive(Picker))
    .find((candidate) => candidate.nativeElement instanceof Node && field.contains(candidate.nativeElement));
  return present(match).injector.get<Picker<string, object>>(Picker);
}

export async function chooseSchema(harness: RouterTestingHarness, label: string): Promise<void> {
  const [first] = harness.fixture.debugElement.queryAll(By.directive(Picker));
  await pickByLabel(harness, present(first).injector.get<Picker<string, object>>(Picker), label);
}

export async function typeInto(
  harness: RouterTestingHarness,
  input: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): Promise<void> {
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

export function pageText(harness: RouterTestingHarness): string {
  return present(harness.routeNativeElement).textContent;
}

/** The second text area: roll options for the verdict tool, character inputs for statistics. */
export function secondTextArea(harness: RouterTestingHarness): HTMLTextAreaElement {
  return present(present(harness.routeNativeElement).querySelectorAll('textarea').item(1));
}

export function textAreas(harness: RouterTestingHarness): HTMLTextAreaElement[] {
  return [...present(harness.routeNativeElement).querySelectorAll('textarea')];
}

/** Picks the option `option` in the picker of the field labelled `label`. */
export async function chooseIn(harness: RouterTestingHarness, label: string, option: string): Promise<void> {
  await pickByLabel(harness, pickerIn(harness, label), option);
}

/**
 * Picks the row named `name` in the slot picker of the field labelled `label`, as a press on its row does. The table
 * renders no rows in the page harness (#734), so the pick is made on the picker itself: its own specs press the rows.
 */
export async function pickRowIn(harness: RouterTestingHarness, label: string, name: string): Promise<void> {
  const fields = [...present(harness.routeNativeElement).querySelectorAll<HTMLElement>('fr-field')];
  const field = present(fields.find((candidate) => candidate.querySelector('fr-label')?.textContent.trim() === label));
  const picker = harness.fixture.debugElement
    .queryAll(By.directive(SlotPicker))
    .find((candidate) => field.querySelector('pio-slot-picker') === candidate.nativeElement)
    ?.injector.get(SlotPicker);
  const row = present(
    present(picker)
      .rows()
      .find((candidate) => candidate.name === name),
  );
  present(picker).value.set(row.id);
  await harness.fixture.whenStable();
}

/** Presses the option `option` of the segmented control in the field labelled `label`. */
export async function pressIn(harness: RouterTestingHarness, label: string, option: string): Promise<void> {
  const fields = [...present(harness.routeNativeElement).querySelectorAll<HTMLElement>('fr-field')];
  const field = present(fields.find((candidate) => candidate.querySelector('fr-label')?.textContent.trim() === label));
  const buttons = [...field.querySelectorAll<HTMLButtonElement>('fr-segmented button')];
  present(buttons.find((candidate) => candidate.textContent.trim() === option)).click();
  await harness.fixture.whenStable();
}
