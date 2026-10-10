import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
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

export async function chooseSchema(harness: RouterTestingHarness, label: string): Promise<void> {
  present(harness.routeNativeElement?.querySelector('button')).click();
  await harness.fixture.whenStable();
  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  present(options.find((option) => option.textContent.trim() === label)).click();
  await harness.fixture.whenStable();
}

export async function typeInto(harness: RouterTestingHarness, input: HTMLInputElement, text: string): Promise<void> {
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

/** Opens the select in the field labelled `label` and picks the option `option`. */
export async function chooseIn(harness: RouterTestingHarness, label: string, option: string): Promise<void> {
  const fields = [...present(harness.routeNativeElement).querySelectorAll<HTMLElement>('fr-field')];
  const field = present(fields.find((candidate) => candidate.querySelector('fr-label')?.textContent.trim() === label));
  present(field.querySelector('button')).click();
  await harness.fixture.whenStable();
  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  present(options.find((candidate) => candidate.textContent.trim() === option)).click();
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
