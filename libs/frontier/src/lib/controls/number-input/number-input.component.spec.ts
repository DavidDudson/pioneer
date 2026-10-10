import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { NumberInput } from './number-input.component';

interface Rendered {
  readonly fixture: ComponentFixture<NumberInput>;
  readonly input: HTMLInputElement;
  readonly commits: () => number;
  readonly cancels: () => number;
}

function render(inputs: Readonly<Record<string, unknown>> = {}): Rendered {
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

describe(NumberInput, () => {
  it('is a whole-number input with a numeric keypad, named by ariaLabel', () => {
    const { input } = render();
    expect(input.type).toBe('number');
    expect(input.inputMode).toBe('numeric');
    expect(input.step).toBe('1');
    expect(input.getAttribute('aria-label')).toBe('Level');
    expect(input.classList).toContain('tabular-nums');
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
    { state: 'empty', text: '' },
    { state: 'a fraction', text: '2.5' },
  ])('keeps the last whole number while the box is $state, and reports it incomplete', ({ text }) => {
    const rendered = render({ value: 3 });
    type(rendered, text);
    expect(rendered.fixture.componentInstance.value()).toBe(3);
    expect(rendered.fixture.componentInstance.complete()).toBe(false);
    type(rendered, '7');
    expect(rendered.fixture.componentInstance.value()).toBe(7);
    expect(rendered.fixture.componentInstance.complete()).toBe(true);
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
