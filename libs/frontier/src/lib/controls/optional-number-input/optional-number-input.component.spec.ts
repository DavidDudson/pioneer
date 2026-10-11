import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { OptionalNumberInput } from './optional-number-input.component';

interface Rendered {
  readonly fixture: ComponentFixture<OptionalNumberInput>;
  readonly input: HTMLInputElement;
  readonly commits: () => number;
}

function render(inputs: Readonly<Record<string, unknown>> = {}): Rendered {
  const fixture = TestBed.createComponent(OptionalNumberInput);
  fixture.componentRef.setInput('ariaLabel', 'Highest level');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  let commits = 0;
  fixture.componentInstance.committed.subscribe(() => {
    commits += 1;
  });
  fixture.detectChanges();
  const input = (fixture.nativeElement as HTMLElement).querySelector('input');
  if (input === null) {
    throw new Error('Expected an input');
  }
  return { fixture, input, commits: (): number => commits };
}

function type(rendered: Rendered, text: string): void {
  rendered.input.value = text;
  rendered.input.dispatchEvent(new Event('input'));
  rendered.fixture.detectChanges();
}

describe(OptionalNumberInput, () => {
  it('is a whole-number input named by ariaLabel, empty with its placeholder when there is no value', () => {
    const { input } = render({ placeholder: 'Any' });
    expect(input.type).toBe('number');
    expect(input.step).toBe('1');
    expect(input.getAttribute('aria-label')).toBe('Highest level');
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('Any');
  });

  it('shows the bound value, 0 included', () => {
    expect(render({ value: 0 }).input.value).toBe('0');
    expect(render({ value: 5 }).input.value).toBe('5');
  });

  it('takes a typed whole number, and an emptied box as no value', () => {
    const rendered = render({ value: 3 });
    type(rendered, '7');
    expect(rendered.fixture.componentInstance.value()).toBe(7);
    type(rendered, '');
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
  });

  it('keeps the last value while the box holds a fraction', () => {
    const rendered = render({ value: 3 });
    type(rendered, '2.5');
    expect(rendered.fixture.componentInstance.value()).toBe(3);
  });

  it('takes a fraction when its step is one, with the decimal keypad', () => {
    const rendered = render({ step: 0.1 });
    expect(rendered.input.step).toBe('0.1');
    expect(rendered.input.inputMode).toBe('decimal');
    type(rendered, '0.1');
    expect(rendered.fixture.componentInstance.value()).toBe(0.1);
  });

  it('commits on Enter', () => {
    const rendered = render();
    rendered.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(rendered.commits()).toBe(1);
  });
});
