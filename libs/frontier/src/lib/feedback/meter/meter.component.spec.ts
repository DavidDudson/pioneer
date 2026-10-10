import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { MAX_SEGMENTS, Meter, MeterVariant } from './meter.component';

/** Renders a meter labelled "Hit points" with `inputs` and returns its host element. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(Meter);
  fixture.componentRef.setInput('label', 'Hit points');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function meter(host: HTMLElement): HTMLMeterElement {
  const element = host.querySelector('meter');
  if (element === null) {
    throw new Error('no meter');
  }
  return element;
}

/** The visible number, hidden from assistive tech. */
function number(host: HTMLElement): HTMLElement | null | undefined {
  return host.querySelector(':scope > span:last-child');
}

/** The segment blocks, when drawn as segments. */
function segments(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>(':scope > span[aria-hidden] > span')];
}

describe(Meter, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideFrontierI18nTesting()],
    });
  });

  it('renders a native meter named by its label, with the range and thresholds', async () => {
    const host = await render({
      value: 12,
      max: 30,
      low: 8,
      high: 15,
      optimum: 30,
    });
    const element = meter(host);
    expect(element.getAttribute('aria-label')).toBe('Hit points');
    expect([element.value, element.min, element.max, element.low, element.high, element.optimum]).toStrictEqual([
      12, 0, 30, 8, 15, 30,
    ]);
  });

  it('gives the meter a value text and shows the number beside it, read only once', async () => {
    const host = await render({ value: 12, max: 30 });
    expect(meter(host).getAttribute('aria-valuetext')).toBe('12 of 30');
    expect(number(host)?.textContent.trim()).toBe('12/30');
    expect(number(host)?.getAttribute('aria-hidden')).toBe('true');
  });

  it('formats the numbers in the UI locale', async () => {
    const host = await render({ value: 1200, max: 2500 });
    expect(number(host)?.textContent.trim()).toBe('1,200/2,500');
  });

  it('fills with the accent without thresholds and a status tone with them', async () => {
    const plain = await render({ value: 2, max: 30 });
    expect(meter(plain).className).toContain('meter-value:bg-accent-solid');
    const low = await render({
      value: 2,
      max: 30,
      low: 8,
      high: 15,
      optimum: 30,
    });
    expect(meter(low).className).toContain('meter-value:bg-danger-solid');
  });

  it('draws one block per point in the segmented variant, filled up to the value', async () => {
    const host = await render({
      value: 2,
      max: 4,
      low: 1,
      high: 2,
      optimum: 0,
      variant: MeterVariant.Segmented,
    });
    expect(segments(host).map((segment) => segment.classList.contains('bg-warning-solid'))).toStrictEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(meter(host).classList.contains('sr-only')).toBe(true);
  });

  it('counts segments from min', async () => {
    const host = await render({
      value: 3,
      min: 1,
      max: 4,
      variant: MeterVariant.Segmented,
    });
    expect(segments(host).map((segment) => segment.classList.contains('bg-accent-solid'))).toStrictEqual([
      true,
      true,
      false,
    ]);
  });

  it('draws a bar when there are too many points to segment', async () => {
    const host = await render({
      value: 3,
      max: MAX_SEGMENTS + 1,
      variant: MeterVariant.Segmented,
    });
    expect(segments(host)).toHaveLength(0);
    expect(meter(host).classList.contains('sr-only')).toBe(false);
  });

  it('clamps the shown number into the range, as the native meter does', async () => {
    const over = await render({ value: 35, max: 30 });
    expect(number(over)?.textContent.trim()).toBe('30/30');
    expect(meter(over).getAttribute('aria-valuetext')).toBe('30 of 30');
    const under = await render({ value: -4, max: 30 });
    expect(number(under)?.textContent.trim()).toBe('0/30');
  });

  it('draws a bar when the range or value is fractional', async () => {
    const fractionalValue = await render({
      value: 1.5,
      max: 4,
      variant: MeterVariant.Segmented,
    });
    expect(segments(fractionalValue)).toHaveLength(0);
    const fractionalRange = await render({
      value: 1,
      max: 3.5,
      variant: MeterVariant.Segmented,
    });
    expect(segments(fractionalRange)).toHaveLength(0);
  });
});
