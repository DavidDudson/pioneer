import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TextAreaField } from './text-area-field.component';

function render(): ComponentFixture<TextAreaField> {
  const fixture = TestBed.createComponent(TextAreaField);
  fixture.componentRef.setInput('label', 'Notes');
  fixture.componentRef.setInput('hint', 'Only you can see these.');
  fixture.detectChanges();
  return fixture;
}

function find(fixture: ComponentFixture<TextAreaField>, selector: string): HTMLElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Expected ${selector}`);
  }
  return element;
}

function textarea(fixture: ComponentFixture<TextAreaField>): HTMLTextAreaElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector('textarea');
  if (element === null) {
    throw new Error('Expected a textarea');
  }
  return element;
}

/** The text of whatever the textarea's `aria-describedby` points at. */
function description(fixture: ComponentFixture<TextAreaField>): string {
  const ids = textarea(fixture).getAttribute('aria-describedby');
  if (ids === null) {
    throw new Error('Expected aria-describedby');
  }
  return find(fixture, `#${ids}`).textContent.trim();
}

describe(TextAreaField, () => {
  it('labels the textarea and describes it with the hint', () => {
    const fixture = render();
    const label = find(fixture, 'label');
    expect(label.getAttribute('for')).toBe(textarea(fixture).id);
    expect(label.textContent.trim()).toBe('Notes');
    expect(description(fixture)).toBe('Only you can see these.');
  });

  it('keeps typed text, newlines included, in its value', () => {
    const fixture = render();
    const element = textarea(fixture);
    element.value = 'Owes the innkeeper 5 gp.\nAvoid the north road.';
    element.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe('Owes the innkeeper 5 gp.\nAvoid the north road.');
  });

  it('passes rows and monospace to the textarea', () => {
    const fixture = render();
    fixture.componentRef.setInput('rows', 3);
    fixture.componentRef.setInput('monospace', true);
    fixture.detectChanges();
    expect(textarea(fixture).rows).toBe(3);
    expect(textarea(fixture).classList).toContain('font-mono');
  });

  it('holds a validation error back until touched', () => {
    const fixture = render();
    fixture.componentRef.setInput('errors', [{ kind: 'required', message: 'Notes are required.' }]);
    fixture.detectChanges();
    expect(textarea(fixture).getAttribute('aria-invalid')).toBeNull();
    expect(description(fixture)).toBe('Only you can see these.');
  });

  it('shows the validation error in place of the hint once touched, and marks the textarea invalid', () => {
    const fixture = render();
    fixture.componentRef.setInput('errors', [{ kind: 'required', message: 'Notes are required.' }]);
    fixture.componentRef.setInput('touched', true);
    fixture.detectChanges();
    expect(textarea(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(description(fixture)).toBe('Notes are required.');
  });
});
