import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { DateInput } from './date-input.component';

interface Rendered {
  readonly fixture: ComponentFixture<DateInput>;
  readonly input: HTMLInputElement;
  readonly commits: () => number;
  readonly cancels: () => number;
}

function render(inputs: Readonly<Record<string, unknown>> = {}): Rendered {
  const fixture = TestBed.createComponent(DateInput);
  fixture.componentRef.setInput('ariaLabel', 'Session date');
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

describe(DateInput, () => {
  it('is a native date input named by ariaLabel', () => {
    const { input } = render();
    expect(input.type).toBe('date');
    expect(input.getAttribute('aria-label')).toBe('Session date');
  });

  it('shows the bound date as an ISO date, and nothing without one', () => {
    const empty = render();
    expect(empty.input.value).toBe('');
    const dated = render({ value: Temporal.PlainDate.from('2026-10-10') });
    expect(dated.input.value).toBe('2026-10-10');
  });

  it('takes a picked date as a PlainDate', () => {
    const rendered = render();
    type(rendered, '2026-03-14');
    const value = rendered.fixture.componentInstance.value();
    expect(value?.equals(Temporal.PlainDate.from('2026-03-14'))).toBe(true);
  });

  it('clears its value when the date is cleared', () => {
    const rendered = render({ value: Temporal.PlainDate.from('2026-10-10') });
    type(rendered, '');
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
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
