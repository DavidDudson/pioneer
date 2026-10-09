import { describe, expect, it } from 'vitest';

import { button, openPlayground, pick, present, press, typeExpression, typeNumber } from './playground-harness';

describe('DicePlaygroundPage with a target', () => {
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

  it.each(['0', '100', ''])('does not add a weakness with the value box holding “%s”', async (entry) => {
    const harness = await openPlayground([2]);
    await press(harness, 'Apply to a target');
    pick(harness, 1, 'cold');
    await typeNumber(harness, 0, entry);

    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('Enter a value from 1 to 99.');
    expect(button(harness, 'Add weakness').disabled).toBe(true);

    const valueInput = present(root.querySelectorAll<HTMLInputElement>('input[type="number"]')[0]);
    valueInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await harness.fixture.whenStable();
    expect(root.querySelector('button[aria-label^="Remove weakness"]')).toBeNull();
  });

  it('removes a resistance so the full damage is taken again', async () => {
    const harness = await openPlayground([6]);
    await typeExpression(harness, '1d8[slashing]');
    await press(harness, 'Apply to a target');
    pick(harness, 2, 'physical');
    await press(harness, 'Add resistance');
    const remove = present(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[aria-label="Remove resistance Physical 5"]'),
    );
    remove.click();
    await harness.fixture.whenStable();
    await press(harness, 'Roll');

    expect(present(harness.routeNativeElement).textContent).toContain('Damage taken: 6');
  });

  it('lists an immunity added twice only once', async () => {
    const harness = await openPlayground([4]);
    await press(harness, 'Apply to a target');
    pick(harness, 0, 'fire');
    await press(harness, 'Add immunity');
    pick(harness, 0, 'fire');
    await press(harness, 'Add immunity');

    const removes = harness.routeNativeElement?.querySelectorAll('button[aria-label="Remove immunity to Fire"]');
    expect(removes?.length).toBe(1);
  });

  it('only offers a critical hit with a target', async () => {
    const harness = await openPlayground([2]);
    expect(button(harness, 'Critical hit').disabled).toBe(true);
    await press(harness, 'Apply to a target');
    expect(button(harness, 'Critical hit').disabled).toBe(false);
  });
});
