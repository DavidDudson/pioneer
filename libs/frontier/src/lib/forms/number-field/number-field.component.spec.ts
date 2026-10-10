import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { NumberField } from './number-field.component';

function render(inputs: Readonly<Record<string, unknown>> = {}): ComponentFixture<NumberField> {
  const fixture = TestBed.createComponent(NumberField);
  fixture.componentRef.setInput('label', 'Level');
  fixture.componentRef.setInput('hint', 'From 1 to 20.');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

function find(fixture: ComponentFixture<NumberField>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Expected ${selector}`);
  }
  return element;
}

function control(fixture: ComponentFixture<NumberField>): HTMLInputElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector('input');
  if (element === null) {
    throw new Error('Expected an input');
  }
  return element;
}

/** The text of whatever the input's `aria-describedby` points at. */
function description(fixture: ComponentFixture<NumberField>): string {
  const ids = find(fixture, 'input').getAttribute('aria-describedby');
  if (ids === null) {
    throw new Error('Expected aria-describedby');
  }
  return find(fixture, `#${ids}`).textContent.trim();
}

describe(NumberField, () => {
  it('labels the number input and describes it with the hint', () => {
    const fixture = render();
    const input = control(fixture);
    expect(input.type).toBe('number');
    expect(find(fixture, 'label').getAttribute('for')).toBe(input.id);
    expect(find(fixture, 'label').textContent.trim()).toBe('Level');
    expect(description(fixture)).toBe('From 1 to 20.');
  });

  it('binds its value to the input both ways and passes min and max', () => {
    const fixture = render({ value: 3, min: 1, max: 20 });
    const input = control(fixture);
    expect([input.value, input.min, input.max]).toStrictEqual(['3', '1', '20']);
    input.value = '4';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe(4);
  });

  it('shows the validation error in place of the hint once touched, and marks the input invalid', () => {
    const fixture = render({ errors: [{ kind: 'max', message: 'Level is at most 20.' }] });
    expect(find(fixture, 'input').hasAttribute('aria-invalid')).toBe(false);
    fixture.componentRef.setInput('touched', true);
    fixture.detectChanges();
    expect(find(fixture, 'input').getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe('Level is at most 20.');
  });

  it('shows an explicit error even when untouched', () => {
    const fixture = render({ error: 'Level is locked by the GM.' });
    expect(description(fixture)).toBe('Level is locked by the GM.');
  });

  it('keeps a hidden label for screen readers and disables the input', () => {
    const fixture = render({ hideLabel: true, disabled: true });
    expect(find(fixture, 'label').classList).toContain('sr-only');
    expect(control(fixture).disabled).toBe(true);
  });
});
