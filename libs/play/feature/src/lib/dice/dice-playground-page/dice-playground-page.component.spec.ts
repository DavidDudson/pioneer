import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import type { Select } from '@pioneer/frontier';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { playRoutes } from '../../play.routes';
import { RANDOM_SOURCE } from '../random-source';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

async function openPlayground(faces: readonly number[]): Promise<RouterTestingHarness> {
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

async function typeExpression(harness: RouterTestingHarness, text: string): Promise<void> {
  const input = present(harness.routeNativeElement?.querySelector('input'));
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

async function typeDc(harness: RouterTestingHarness, value: string): Promise<void> {
  const input = present(harness.routeNativeElement?.querySelector<HTMLInputElement>('input[type="number"]'));
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

function button(harness: RouterTestingHarness, label: string): HTMLButtonElement {
  const buttons = harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? [];
  return present([...buttons].find((candidate) => candidate.textContent.trim() === label));
}

function rollButton(harness: RouterTestingHarness): HTMLButtonElement {
  return button(harness, 'Roll');
}

async function press(harness: RouterTestingHarness, label: string): Promise<void> {
  button(harness, label).click();
  await harness.fixture.whenStable();
}

/** The aria listbox renders in an overlay; set the nth select's model the way a pick would. */
function pick(harness: RouterTestingHarness, index: number, value: string): void {
  const selects = harness.fixture.debugElement.queryAll((element) => element.name === 'fr-select');
  const select = present(selects[index]).componentInstance as Select<string>;
  select.value.set(value);
  harness.detectChanges();
}

/** Types into the nth number box: the DC box when shown comes first, then weakness and resistance values. */
async function typeNumber(harness: RouterTestingHarness, index: number, value: string): Promise<void> {
  const inputs = harness.routeNativeElement?.querySelectorAll<HTMLInputElement>('input[type="number"]') ?? [];
  const input = present([...inputs][index]);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

describe('DicePlaygroundPage', () => {
  it('rolls an expression and shows every die behind the total', async () => {
    const harness = await openPlayground([4, 1, 6, 4]);
    await typeExpression(harness, '4d6kh3[fire]+2');
    rollButton(harness).click();
    await harness.fixture.whenStable();

    const text = present(harness.routeNativeElement).textContent;
    // Text from the route's `play` scope, loaded with the page's code.
    expect(text).toContain('Total 16');
    expect(text).toContain('4d6kh3[fire]+2');
    expect(text).toContain('1 dropped');
    expect(text).toContain('Fire');
  });

  it('explains a mistake with text from the dice scope and does not roll', async () => {
    const harness = await openPlayground([20]);
    await typeExpression(harness, '1d20+x');

    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('“x” at position 6 is not part of a dice expression.');
    expect(rollButton(harness).disabled).toBe(true);
    expect(root.textContent).toContain('No rolls yet.');
  });

  it('rolls twice with fortune, keeps the higher and marks the other discarded', async () => {
    const harness = await openPlayground([5, 14]);
    await press(harness, 'Fortune');
    expect(button(harness, 'Fortune').getAttribute('aria-pressed')).toBe('true');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Total 21');
    expect(text).toContain('Fortune: rolled twice and kept the higher.');
    expect(text).toContain('Roll 1: 12, discarded');
    expect(text).toContain('Roll 2: 21, kept');
  });

  it('keeps the lower with misfortune', async () => {
    const harness = await openPlayground([5, 14]);
    await press(harness, 'Misfortune');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Total 12');
    expect(text).toContain('Roll 1: 12, kept');
    expect(text).toContain('Roll 2: 21, discarded');
  });

  it('rolls once when fortune and misfortune cancel', async () => {
    const harness = await openPlayground([5, 14]);
    await press(harness, 'Fortune');
    await press(harness, 'Misfortune');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Total 12');
    expect(text).toContain('Fortune and misfortune cancel out: rolled once.');
    expect(text).not.toContain('Roll 1');
  });

  it('shows the degree of success against a DC and every step to it', async () => {
    const harness = await openPlayground([20]);
    await press(harness, 'Against a DC');
    expect(button(harness, 'Against a DC').getAttribute('aria-pressed')).toBe('true');
    await typeDc(harness, '30');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Total 27');
    expect(text).toContain('27 misses DC 30.');
    expect(text).toContain('Natural 20: one degree better.');
    expect(text).toContain('Success');
  });

  it('compares the kept roll when fortune rolls twice', async () => {
    const harness = await openPlayground([1, 14]);
    await press(harness, 'Fortune');
    await press(harness, 'Against a DC');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('21 meets or exceeds DC 20.');
    expect(text).not.toContain('Natural 1');
  });

  it('rolls on Enter in the DC box', async () => {
    const harness = await openPlayground([12]);
    await press(harness, 'Against a DC');
    const root = present(harness.routeNativeElement);
    const dcInput = present(root.querySelector<HTMLInputElement>('input[type="number"]'));
    dcInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await harness.fixture.whenStable();

    expect(root.textContent).toContain('19 misses DC 20.');
  });

  it.each(['-3', '100', ''])('does not roll with the DC box holding “%s”', async (entry) => {
    const harness = await openPlayground([20]);
    await press(harness, 'Against a DC');
    await typeDc(harness, entry);

    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('Enter a DC from 0 to 99.');
    expect(rollButton(harness).disabled).toBe(true);

    const dcInput = present(root.querySelector<HTMLInputElement>('input[type="number"]'));
    dcInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await harness.fixture.whenStable();
    expect(root.textContent).toContain('No rolls yet.');
  });

  it('switches fortune back off and rolls once again', async () => {
    const harness = await openPlayground([5, 14]);
    await press(harness, 'Fortune');
    await press(harness, 'Fortune');
    expect(button(harness, 'Fortune').getAttribute('aria-pressed')).toBe('false');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Total 12');
    expect(text).not.toContain('Roll 1');
  });

  it('applies damage to a target with immunity, weakness and resistance and explains each', async () => {
    const harness = await openPlayground([6, 4, 3]);
    await typeExpression(harness, '1d8[slashing]+1d6[fire]+1d4[cold]');
    await press(harness, 'Apply to a target');
    pick(harness, 0, 'fire');
    await press(harness, 'Add immunity');
    pick(harness, 1, 'cold');
    await press(harness, 'Add weakness');
    pick(harness, 2, 'physical');
    await typeNumber(harness, 1, '3');
    await press(harness, 'Add resistance');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Damage taken: 11');
    expect(text).toContain('Resistance 3 to physical: 3 prevented.');
    expect(text).toContain('Immune to fire: 4 ignored.');
    expect(text).toContain('Weakness 5 to cold: 5 more.');
    expect(text).toContain('6 dealt, 3 taken');
  });

  it('doubles a critical, persistent included, and shows persistent damage apart', async () => {
    const harness = await openPlayground([3, 4, 2]);
    await typeExpression(harness, '2d6[piercing]+1d6[persistent,bleed]');
    await press(harness, 'Apply to a target');
    await press(harness, 'Critical hit');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Damage taken: 14');
    expect(text).toContain('Critical hit: 7 doubled to 14.');
    expect(text).toContain('Persistent damage: 4 at the end of each turn');
  });

  it('labels untagged damage as untyped', async () => {
    const harness = await openPlayground([3, 3]);
    await typeExpression(harness, '2d6+4');
    await press(harness, 'Apply to a target');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Untyped');
    expect(text).toContain('Damage taken: 10');
  });

  it('removes an immunity so the type is taken again', async () => {
    const harness = await openPlayground([4]);
    await typeExpression(harness, '1d6[fire]');
    await press(harness, 'Apply to a target');
    pick(harness, 0, 'fire');
    await press(harness, 'Add immunity');
    const remove = present(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[aria-label="Remove immunity to Fire"]'),
    );
    remove.click();
    await harness.fixture.whenStable();
    await press(harness, 'Roll');

    expect(present(harness.routeNativeElement).textContent).toContain('Damage taken: 4');
  });

  it('replaces a weakness to the same type instead of adding a second', async () => {
    const harness = await openPlayground([2]);
    await typeExpression(harness, '1d4[cold]');
    await press(harness, 'Apply to a target');
    pick(harness, 1, 'cold');
    await press(harness, 'Add weakness');
    pick(harness, 1, 'cold');
    await typeNumber(harness, 0, '10');
    await press(harness, 'Add weakness');
    await press(harness, 'Roll');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Damage taken: 12');
    expect(text).not.toContain('Cold 5');
  });

  it('does not add a weakness with a value out of range', async () => {
    const harness = await openPlayground([2]);
    await press(harness, 'Apply to a target');
    pick(harness, 1, 'cold');
    await typeNumber(harness, 0, '0');

    const text = present(harness.routeNativeElement).textContent;
    expect(text).toContain('Enter a value from 1 to 99.');
    expect(button(harness, 'Add weakness').disabled).toBe(true);
  });

  it('only offers a critical hit with a target', async () => {
    const harness = await openPlayground([2]);
    expect(button(harness, 'Critical hit').disabled).toBe(true);
    await press(harness, 'Apply to a target');
    expect(button(harness, 'Critical hit').disabled).toBe(false);
  });
});
