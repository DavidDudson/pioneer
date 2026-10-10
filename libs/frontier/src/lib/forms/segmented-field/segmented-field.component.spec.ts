import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { SelectOption } from '../../controls/select/select.component';
import { SegmentedField } from './segmented-field.component';

const UNITS: readonly SelectOption<string>[] = [
  { value: 'feet', label: 'Feet' },
  { value: 'metres', label: 'Metres' },
];

function render(inputs: Readonly<Record<string, unknown>> = {}): ComponentFixture<SegmentedField<string>> {
  const fixture = TestBed.createComponent(SegmentedField<string>);
  fixture.componentRef.setInput('label', 'Distance unit');
  fixture.componentRef.setInput('hint', 'Rules distances are in feet.');
  fixture.componentRef.setInput('options', UNITS);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

function find(fixture: ComponentFixture<SegmentedField<string>>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Expected ${selector}`);
  }
  return element;
}

function buttons(fixture: ComponentFixture<SegmentedField<string>>): HTMLButtonElement[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
}

/** The text of whatever the group's `aria-describedby` points at. */
function description(fixture: ComponentFixture<SegmentedField<string>>): string {
  const ids = find(fixture, '[role="toolbar"]').getAttribute('aria-describedby');
  if (ids === null) {
    throw new Error('Expected aria-describedby');
  }
  return find(fixture, `#${ids}`).textContent.trim();
}

describe(SegmentedField, () => {
  it('names the button group with the label and describes it with the hint', () => {
    const fixture = render();
    const group = find(fixture, '[role="toolbar"]');
    const label = find(fixture, 'label');
    expect(label.textContent.trim()).toBe('Distance unit');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    expect(label.getAttribute('for')).toBe(group.id);
    expect(description(fixture)).toBe('Rules distances are in feet.');
  });

  it('shows the bound value as the pressed option', () => {
    const fixture = render({ value: 'metres' });
    expect(buttons(fixture).map((button) => button.getAttribute('aria-pressed'))).toStrictEqual(['false', 'true']);
  });

  it('takes a pressed option as its value', () => {
    const fixture = render({ value: 'feet' });
    buttons(fixture)[1]?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('metres');
  });

  it('shows the validation error in place of the hint once touched, and marks the group invalid', () => {
    const fixture = render({ errors: [{ kind: 'required', message: 'Pick a unit.' }] });
    expect(find(fixture, '[role="toolbar"]').hasAttribute('aria-invalid')).toBe(false);
    fixture.componentRef.setInput('touched', true);
    fixture.detectChanges();
    expect(find(fixture, '[role="toolbar"]').getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe('Pick a unit.');
  });

  it('keeps a hidden label for screen readers and disables every option', () => {
    const fixture = render({ hideLabel: true, disabled: true });
    expect(find(fixture, 'label').classList).toContain('sr-only');
    expect(buttons(fixture).map((button) => button.disabled)).toStrictEqual([true, true]);
  });
});
