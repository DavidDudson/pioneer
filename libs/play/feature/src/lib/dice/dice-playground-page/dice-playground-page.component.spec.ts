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

function rollButton(harness: RouterTestingHarness): HTMLButtonElement {
  return present(harness.routeNativeElement?.querySelector<HTMLButtonElement>('button'));
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
});
