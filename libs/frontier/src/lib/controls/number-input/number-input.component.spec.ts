import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { NumberInput } from './number-input.component';

interface Rendered {
  readonly fixture: ComponentFixture<NumberInput>;
  readonly input: HTMLInputElement;
  readonly commits: () => number;
  readonly cancels: () => number;
}

function render(inputs: ComponentInputs<NumberInput> = {}): Rendered {
  const fixture = TestBed.createComponent(NumberInput);
  fixture.componentRef.setInput('ariaLabel', 'Level');

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  let commits = 0;
  let cancels = 0;
  fixture.componentInstance.committed.subscribe(() => {
    commits += 1;
  });
  fixture.componentInstance.cancelled.subscribe(() => {
    cancels += 1;
  });
  fixture.detectChanges();
  // SAFETY: nativeElement is typed any; it is an HTMLElement under the DOM test environment.
  const input = (fixture.nativeElement as HTMLElement).querySelector('input');

  if (input === null) {
    throw new Error('Expected an input');
  }

  return { fixture, input, commits: (): number => commits, cancels: (): number => cancels };
}

function type(rendered: Rendered, text: string): void {
  rendered.input.value = text;
  rendered.input.dispatchEvent(new Event('input'));
  rendered.fixture.detectChanges();
}

function press(rendered: Rendered, key: 'Enter' | 'Escape'): void {
  rendered.input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  rendered.fixture.detectChanges();
}

function buttons(rendered: Rendered): ReadonlyArray<HTMLButtonElement> {
  // SAFETY: nativeElement is typed any; it is an HTMLElement under the DOM test environment.
  return [...(rendered.fixture.nativeElement as HTMLElement).querySelectorAll('button')];
}

describe(NumberInput, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('is a whole-number input with a numeric keypad, named by ariaLabel', () => {
    const { input } = render();
    expect(input.type).toBe('number');
    expect(input.inputMode).toBe('numeric');
    expect(input.step).toBe('1');
    expect(input.getAttribute('aria-label')).toBe('Level');
    expect(input.classList).toContain('tabular-nums');
  });

  it('sets its figures lining as well as tabular', () => {
    const { input } = render();
    expect(input.classList).toContain('lining-nums');
  });

  it('shows the bound value', () => {
    const { input } = render({ value: 3 });
    expect(input.value).toBe('3');
  });

  it('passes min and max to the input only when set', () => {
    const open = render();
    expect(open.input.hasAttribute('min')).toBe(false);
    expect(open.input.hasAttribute('max')).toBe(false);
    const bounded = render({ min: 1, max: 20 });
    expect(bounded.input.min).toBe('1');
    expect(bounded.input.max).toBe('20');
  });

  it('takes a typed whole number as its value', () => {
    const rendered = render({ value: 3 });
    type(rendered, '-4');
    expect(rendered.fixture.componentInstance.value()).toBe(-4);
    expect(rendered.fixture.componentInstance.complete()).toBe(true);
  });

  it.each([
    { state: 'empty', text: '', complete: false },
    { state: 'a fraction', text: '2.5', complete: false },
    { state: 'a lone minus', text: '-', complete: false },
  ])('keeps the last whole number while the box is $state, and reports it incomplete', ({ text, complete }) => {
    const rendered = render({ value: 3 });
    type(rendered, text);
    expect(rendered.fixture.componentInstance.value()).toBe(3);
    expect(rendered.fixture.componentInstance.complete()).toBe(complete);
    type(rendered, '7');
    expect(rendered.fixture.componentInstance.value()).toBe(7);
    expect(rendered.fixture.componentInstance.complete()).toBe(true);
  });

  it('takes an emptied box as no value, and complete, when optional', () => {
    const rendered = render({ value: 3, optional: true, placeholder: 'Any' });
    expect(rendered.input.placeholder).toBe('Any');
    type(rendered, '');
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
    expect(rendered.fixture.componentInstance.complete()).toBe(true);
  });

  it('keeps the last number and reports incomplete for a fraction in a whole-number box when optional', () => {
    const rendered = render({ value: 3, optional: true });
    type(rendered, '2.5');
    expect(rendered.fixture.componentInstance.value()).toBe(3);
    expect(rendered.fixture.componentInstance.complete()).toBe(false);
  });

  it.each([
    { bounds: { min: 10 }, typed: '1', expected: 10 },
    { bounds: { max: 20 }, typed: '99', expected: 20 },
    { bounds: {}, typed: '99', expected: 99 },
  ])('clamps against one-sided bounds $bounds', ({ bounds, typed, expected }) => {
    const rendered = render({ value: 15, clamp: true, ...bounds });
    type(rendered, typed);
    expect(rendered.fixture.componentInstance.value()).toBe(expected);
  });

  it('shows no value as an empty box and 0 as 0', () => {
    expect(render().input.value).toBe('');
    expect(render({ value: 0 }).input.value).toBe('0');
  });

  it('emits entered for numbers only', () => {
    const rendered = render({ value: 3, optional: true });
    const seen: Array<number> = [];
    rendered.fixture.componentInstance.entered.subscribe((entered) => {
      seen.push(entered);
    });
    type(rendered, '5');
    type(rendered, '');
    type(rendered, '-');
    expect(seen).toStrictEqual([5]);
  });

  it('clamps a typed number to min and max, without rewriting the box until Enter', () => {
    const rendered = render({ value: 5, min: 10, max: 20, clamp: true });
    type(rendered, '1');
    expect(rendered.fixture.componentInstance.value()).toBe(10);
    expect(rendered.input.value).toBe('1');
    type(rendered, '15');
    expect(rendered.fixture.componentInstance.value()).toBe(15);
    type(rendered, '99');
    expect(rendered.fixture.componentInstance.value()).toBe(20);
    press(rendered, 'Enter');
    expect(rendered.input.value).toBe('20');
  });

  it('keeps an out-of-range number when not clamping', () => {
    const rendered = render({ value: 5, min: 10, max: 20 });
    type(rendered, '99');
    expect(rendered.fixture.componentInstance.value()).toBe(99);
  });

  it('takes a fraction when its step is one tenth, with the decimal keypad', () => {
    const rendered = render({ step: 0.1 });
    expect(rendered.input.step).toBe('0.1');
    expect(rendered.input.inputMode).toBe('decimal');
    type(rendered, '0.1');
    expect(rendered.fixture.componentInstance.value()).toBe(0.1);
  });

  it('has no stepper buttons unless asked', () => {
    expect(buttons(render())).toHaveLength(0);
  });

  describe('steppers', () => {
    it('steps down and up by step, within the bounds', () => {
      const rendered = render({ value: 1, min: 0, max: 2, steppers: true });
      const [down, up] = buttons(rendered);
      down?.click();
      rendered.fixture.detectChanges();
      expect(rendered.fixture.componentInstance.value()).toBe(0);
      expect(down?.disabled).toBe(true);
      up?.click();
      up?.click();
      rendered.fixture.detectChanges();
      expect(rendered.fixture.componentInstance.value()).toBe(2);
      expect(up?.disabled).toBe(true);
      expect(rendered.input.value).toBe('2');
    });

    it('starts an empty box at min, or 0, on the first press either way', () => {
      const bounded = render({ min: 4, steppers: true });
      buttons(bounded)[1]?.click();
      expect(bounded.fixture.componentInstance.value()).toBe(4);
      const open = render({ steppers: true });
      buttons(open)[0]?.click();
      expect(open.fixture.componentInstance.value()).toBe(0);
    });

    it('emits entered on every press', () => {
      const rendered = render({ value: 1, steppers: true });
      const seen: Array<number> = [];
      rendered.fixture.componentInstance.entered.subscribe((entered) => {
        seen.push(entered);
      });
      buttons(rendered)[1]?.click();
      buttons(rendered)[1]?.click();
      buttons(rendered)[0]?.click();
      expect(seen).toStrictEqual([2, 3, 2]);
    });

    it('steps from the last number while the box holds mid-edit text', () => {
      const rendered = render({ value: 3, steppers: true });
      type(rendered, '-');
      buttons(rendered)[1]?.click();
      expect(rendered.fixture.componentInstance.value()).toBe(4);
      expect(rendered.fixture.componentInstance.complete()).toBe(true);
    });

    it.each([
      { bounds: { min: 2 }, disabled: [true, false] },
      { bounds: { max: 2 }, disabled: [false, true] },
      { bounds: {}, disabled: [false, false] },
    ])('disables only the stepper at a one-sided bound $bounds', ({ bounds, disabled }) => {
      const rendered = render({ value: 2, steppers: true, ...bounds });
      expect(buttons(rendered).map((button) => button.disabled)).toStrictEqual(disabled);
    });

    it('leaves both steppers on for an empty box with bounds', () => {
      const rendered = render({ min: 0, max: 5, steppers: true });
      expect(buttons(rendered).every((button) => !button.disabled)).toBe(true);
    });

    it('steps a fraction without float noise', () => {
      const rendered = render({ value: 0.2, step: 0.1, steppers: true });
      buttons(rendered)[1]?.click();
      expect(rendered.fixture.componentInstance.value()).toBe(0.3);
    });

    it('disables both buttons with the control', () => {
      const rendered = render({ value: 1, steppers: true, disabled: true });
      expect(buttons(rendered).every((button) => button.disabled)).toBe(true);
    });
  });

  it('commits on Enter and cancels on Escape', () => {
    const rendered = render();
    press(rendered, 'Enter');
    expect(rendered.commits()).toBe(1);
    press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.commits()).toBe(1);
  });

  it('marks itself invalid and disables when told to', () => {
    const { input } = render({ invalid: true, disabled: true });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.disabled).toBe(true);
  });
});
