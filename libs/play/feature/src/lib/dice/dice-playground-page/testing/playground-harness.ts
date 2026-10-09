import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages, Select } from '@pioneer/frontier';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { provideI18n } from '@pioneer/shared/web';

import { playRoutes } from '../../../play.routes';
import { RANDOM_SOURCE } from '../../random-source';

/* Drives the dice playground through its route, as the page specs do. */

export function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

export async function openPlayground(faces: readonly number[]): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'play', children: playRoutes }]),
      provideI18n({ en: async () => frontierMessages }),
      { provide: RANDOM_SOURCE, useValue: scriptedRandom(faces.map((face) => DieFace.parse(face))) },
    ],
  });
  const harness = await RouterTestingHarness.create('/play/dice');
  await harness.fixture.whenStable();
  return harness;
}

export async function typeExpression(harness: RouterTestingHarness, text: string): Promise<void> {
  const input = present(harness.routeNativeElement?.querySelector('input'));
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

export async function typeDc(harness: RouterTestingHarness, value: string): Promise<void> {
  const input = present(harness.routeNativeElement?.querySelector<HTMLInputElement>('input[type="number"]'));
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

export function button(harness: RouterTestingHarness, label: string): HTMLButtonElement {
  const buttons = harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [];
  return present([...buttons].find((candidate) => candidate.textContent.trim() === label));
}

export function rollButton(harness: RouterTestingHarness): HTMLButtonElement {
  return button(harness, 'Roll');
}

export async function press(harness: RouterTestingHarness, label: string): Promise<void> {
  button(harness, label).click();
  await harness.fixture.whenStable();
}

/** The aria listbox renders in an overlay; set the nth select's model the way a pick would. */
export function pick(harness: RouterTestingHarness, index: number, value: string): void {
  const selects = harness.fixture.debugElement.queryAll((element) => element.name === 'fr-select');
  const select = present(selects[index]).injector.get(Select);
  select.value.set(value);
  harness.detectChanges();
}

/** Types into the nth number box: the DC box when shown comes first, then weakness and resistance values. */
export async function typeNumber(harness: RouterTestingHarness, index: number, value: string): Promise<void> {
  const inputs = harness.routeNativeElement?.querySelectorAll<HTMLInputElement>('input[type="number"]') ?? [];
  const input = present([...inputs][index]);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}
