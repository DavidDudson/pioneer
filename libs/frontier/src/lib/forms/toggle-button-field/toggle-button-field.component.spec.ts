import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ToggleButtonField } from './toggle-button-field.component';

function render(value: boolean): ComponentFixture<ToggleButtonField> {
  const fixture = TestBed.createComponent(ToggleButtonField);
  fixture.componentRef.setInput('label', 'Share with party');
  fixture.componentRef.setInput('hint', 'Visible to everyone in the campaign.');
  fixture.componentRef.setInput('value', value);
  fixture.detectChanges();
  return fixture;
}

function find(fixture: ComponentFixture<ToggleButtonField>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Expected ${selector}`);
  }
  return element;
}

/** The text of whatever the button's `aria-describedby` points at. */
function description(fixture: ComponentFixture<ToggleButtonField>): string {
  const ids = find(fixture, 'button').getAttribute('aria-describedby');
  if (ids === null) {
    throw new Error('Expected aria-describedby');
  }
  return find(fixture, `#${ids}`).textContent.trim();
}

describe(ToggleButtonField, () => {
  it('shows the label as the button text, with the label element for screen readers only', () => {
    const fixture = render(false);
    const button = find(fixture, 'button');
    const label = find(fixture, 'label');
    expect(button.textContent.trim()).toBe('Share with party');
    expect(label.getAttribute('for')).toBe(button.id);
    expect(label.classList).toContain('sr-only');
    expect(description(fixture)).toBe('Visible to everyone in the campaign.');
  });

  it('turns on with a press and announces it with aria-pressed', () => {
    const fixture = render(false);
    find(fixture, 'button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(true);
    expect(find(fixture, 'button').getAttribute('aria-pressed')).toBe('true');
  });

  it('turns off with a press while on', () => {
    const fixture = render(true);
    find(fixture, 'button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(false);
    expect(find(fixture, 'button').getAttribute('aria-pressed')).toBe('false');
  });

  it('shows the validation error in place of the hint once touched, and marks the button invalid', () => {
    const fixture = render(false);
    fixture.componentRef.setInput('errors', [{ kind: 'unshared', message: 'Share it first.' }]);
    fixture.componentRef.setInput('touched', true);
    fixture.detectChanges();
    expect(find(fixture, 'button').getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe('Share it first.');
  });

  it('cannot be pressed while disabled', () => {
    const fixture = render(false);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    find(fixture, 'button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(false);
  });
});
