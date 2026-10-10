import { describe, expect, it } from 'vitest';

import {
  button,
  openPlayground,
  present,
  press,
  rollButton,
  typeDc,
  typeExpression,
} from './testing/playground-harness';

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
    expect(root.textContent).toContain('Enter an expression and roll; results show here.');
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
});
