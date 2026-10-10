import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { DateField } from './date-field.component';

function render(inputs: Readonly<Record<string, unknown>> = {}): ComponentFixture<DateField> {
  const fixture = TestBed.createComponent(DateField);
  fixture.componentRef.setInput('label', 'Session date');
  fixture.componentRef.setInput('hint', 'When the party next meets.');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

function find(fixture: ComponentFixture<DateField>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Expected ${selector}`);
  }
  return element;
}

function control(fixture: ComponentFixture<DateField>): HTMLInputElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector('input');
  if (element === null) {
    throw new Error('Expected an input');
  }
  return element;
}

/** The text of whatever the input's `aria-describedby` points at. */
function description(fixture: ComponentFixture<DateField>): string {
  const ids = find(fixture, 'input').getAttribute('aria-describedby');
  if (ids === null) {
    throw new Error('Expected aria-describedby');
  }
  return find(fixture, `#${ids}`).textContent.trim();
}

describe(DateField, () => {
  it('labels the date input and describes it with the hint', () => {
    const fixture = render();
    const input = control(fixture);
    expect(input.type).toBe('date');
    expect(find(fixture, 'label').getAttribute('for')).toBe(input.id);
    expect(find(fixture, 'label').textContent.trim()).toBe('Session date');
    expect(description(fixture)).toBe('When the party next meets.');
  });

  it('binds its value to the input both ways', () => {
    const fixture = render({ value: Temporal.PlainDate.from('2026-10-10') });
    const input = control(fixture);
    expect(input.value).toBe('2026-10-10');
    input.value = '2026-10-17';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()?.equals(Temporal.PlainDate.from('2026-10-17'))).toBe(true);
  });

  it('shows the validation error in place of the hint once touched, and marks the input invalid', () => {
    const fixture = render({ errors: [{ kind: 'required', message: 'Pick a date.' }] });
    expect(find(fixture, 'input').hasAttribute('aria-invalid')).toBe(false);
    fixture.componentRef.setInput('touched', true);
    fixture.detectChanges();
    expect(find(fixture, 'input').getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe('Pick a date.');
  });

  it('shows an explicit error even when untouched', () => {
    const fixture = render({ error: 'The GM is away that day.' });
    expect(description(fixture)).toBe('The GM is away that day.');
  });

  it('keeps a hidden label for screen readers and disables the input', () => {
    const fixture = render({ hideLabel: true, disabled: true });
    expect(find(fixture, 'label').classList).toContain('sr-only');
    expect(control(fixture).disabled).toBe(true);
  });
});
