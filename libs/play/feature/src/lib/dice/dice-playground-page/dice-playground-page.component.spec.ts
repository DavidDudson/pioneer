import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
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
});
