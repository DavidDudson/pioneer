import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TextField } from './text-field.component';

function render(inputs: Readonly<Record<string, unknown>> = {}): ComponentFixture<TextField> {
  const fixture = TestBed.createComponent(TextField);
  fixture.componentRef.setInput('label', 'Name');
  fixture.componentRef.setInput('hint', 'As it appears on the sheet.');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

function find(fixture: ComponentFixture<TextField>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Expected ${selector}`);
  }
  return element;
}

function control(fixture: ComponentFixture<TextField>): HTMLInputElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector('input');
  if (element === null) {
    throw new Error('Expected an input');
  }
  return element;
}

/** The text of whatever the input's `aria-describedby` points at. */
function description(fixture: ComponentFixture<TextField>): string {
  const ids = find(fixture, 'input').getAttribute('aria-describedby');
  if (ids === null) {
    throw new Error('Expected aria-describedby');
  }
  return find(fixture, `#${ids}`).textContent.trim();
}

describe(TextField, () => {
  it('labels the input and describes it with the hint', () => {
    const fixture = render();
    const label = find(fixture, 'label');
    expect(label.getAttribute('for')).toBe(find(fixture, 'input').id);
    expect(label.textContent.trim()).toBe('Name');
    expect(label.classList).not.toContain('sr-only');
    expect(description(fixture)).toBe('As it appears on the sheet.');
  });

  it('has no description without a hint or error', () => {
    const fixture = render({ hint: undefined });
    expect(find(fixture, 'input').hasAttribute('aria-describedby')).toBe(false);
  });

  it('binds its value to the input both ways', () => {
    const fixture = render({ value: 'Valeros', placeholder: 'Character name' });
    const input = control(fixture);
    expect(input.value).toBe('Valeros');
    expect(input.placeholder).toBe('Character name');
    input.value = 'Seelah';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe('Seelah');
  });

  it('holds a validation error back until touched', () => {
    const fixture = render({ errors: [{ kind: 'required', message: 'Name is required.' }] });
    expect(find(fixture, 'input').hasAttribute('aria-invalid')).toBe(false);
    expect(description(fixture)).toBe('As it appears on the sheet.');
  });

  it('shows the first validation error in place of the hint once touched, and marks the input invalid', () => {
    const fixture = render({
      errors: [
        { kind: 'required', message: 'Name is required.' },
        { kind: 'maxLength', message: 'Name is too long.' },
      ],
      touched: true,
    });
    expect(find(fixture, 'input').getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe('Name is required.');
  });

  it('shows an explicit error even when untouched, over validation errors', () => {
    const fixture = render({
      error: 'That name is taken.',
      errors: [{ kind: 'required', message: 'Name is required.' }],
    });
    expect(find(fixture, 'input').getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe('That name is taken.');
  });

  it('keeps a hidden label for screen readers and disables the input', () => {
    const fixture = render({ hideLabel: true, disabled: true });
    expect(find(fixture, 'label').classList).toContain('sr-only');
    expect(control(fixture).disabled).toBe(true);
  });
});
