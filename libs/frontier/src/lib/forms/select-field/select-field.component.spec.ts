import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { SelectOption } from '../../controls/select/select.component';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { SelectField } from './select-field.component';

const ANCESTRIES: readonly SelectOption<string>[] = [
  { value: 'elf', label: 'Elf' },
  { value: 'dwarf', label: 'Dwarf' },
  { value: 'human', label: 'Human' },
  { value: 'orc', label: 'Orc' },
];

function render(inputs: Readonly<Record<string, unknown>> = {}): ComponentFixture<SelectField<string>> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(SelectField<string>);
  fixture.componentRef.setInput('label', 'Ancestry');
  fixture.componentRef.setInput('hint', 'Sets your hit points and speed.');
  fixture.componentRef.setInput('options', ANCESTRIES);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

function find(fixture: ComponentFixture<SelectField<string>>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Expected ${selector}`);
  }
  return element;
}

/** The text of whatever the trigger's `aria-describedby` points at. */
function description(fixture: ComponentFixture<SelectField<string>>): string {
  const ids = find(fixture, 'button').getAttribute('aria-describedby');
  if (ids === null) {
    throw new Error('Expected aria-describedby');
  }
  return find(fixture, `#${ids}`).textContent.trim();
}

describe(SelectField, () => {
  it('labels the trigger and describes it with the hint', () => {
    const fixture = render();
    const label = find(fixture, 'label');
    expect(label.textContent.trim()).toBe('Ancestry');
    expect(label.getAttribute('for')).toBe(find(fixture, 'button').id);
    expect(description(fixture)).toBe('Sets your hit points and speed.');
  });

  it('shows the bound option on the trigger', () => {
    const fixture = render({ value: 'dwarf' });
    expect(find(fixture, 'button').textContent.trim()).toContain('Dwarf');
  });

  it('shows the placeholder while nothing is picked', async () => {
    const fixture = render({ placeholder: 'Pick an ancestry' });
    expect(find(fixture, 'button').textContent.trim()).toContain('Pick an ancestry');
    fixture.componentRef.setInput('placeholder', undefined);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(find(fixture, 'button').textContent.trim()).toContain('Select…');
    });
  });

  it('takes a picked option as its value', async () => {
    const fixture = render();
    find(fixture, 'button').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (element) => element.textContent.trim() === 'Human',
    );
    option?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('human');
    expect(find(fixture, 'button').textContent.trim()).toContain('Human');
  });

  it('shows the validation error in place of the hint once touched, and marks the trigger invalid', () => {
    const fixture = render({ errors: [{ kind: 'required', message: 'Pick an ancestry.' }] });
    expect(find(fixture, 'button').hasAttribute('aria-invalid')).toBe(false);
    fixture.componentRef.setInput('touched', true);
    fixture.detectChanges();
    expect(find(fixture, 'button').getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe('Pick an ancestry.');
  });

  it('keeps a hidden label for screen readers', () => {
    const fixture = render({ hideLabel: true });
    expect(find(fixture, 'label').classList).toContain('sr-only');
  });

  it('disables the trigger but keeps it focusable, and a press does not open it', async () => {
    const fixture = render({ disabled: true });
    const trigger = find(fixture, 'button');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(trigger.tabIndex).toBe(0);
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="option"]')).toBeNull();
  });
});
