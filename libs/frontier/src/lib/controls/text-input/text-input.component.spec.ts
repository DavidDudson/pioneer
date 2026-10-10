import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TextInput } from './text-input.component';

interface Rendered {
  readonly fixture: ComponentFixture<TextInput>;
  readonly input: HTMLInputElement;
  readonly commits: () => number;
  readonly cancels: () => number;
}

function render(inputs: Readonly<Record<string, unknown>> = {}): Rendered {
  const fixture = TestBed.createComponent(TextInput);
  fixture.componentRef.setInput('ariaLabel', 'Name');
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

function press(rendered: Rendered, key: 'Enter' | 'Escape'): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  rendered.input.dispatchEvent(event);
  rendered.fixture.detectChanges();
  return event;
}

describe(TextInput, () => {
  it('is a text input named by ariaLabel, with no id or description outside a field', () => {
    const { input } = render();
    expect(input.type).toBe('text');
    expect(input.getAttribute('aria-label')).toBe('Name');
    expect(input.hasAttribute('id')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the bound value and placeholder', () => {
    const { input } = render({ value: 'Valeros', placeholder: 'Character name' });
    expect(input.value).toBe('Valeros');
    expect(input.placeholder).toBe('Character name');
  });

  it('follows typing in its value', () => {
    const rendered = render({ value: 'Valeros' });
    rendered.input.value = 'Seelah';
    rendered.input.dispatchEvent(new Event('input'));
    expect(rendered.fixture.componentInstance.value()).toBe('Seelah');
  });

  it('commits on Enter without blocking a form submit', () => {
    const rendered = render();
    const event = press(rendered, 'Enter');
    expect(rendered.commits()).toBe(1);
    expect(rendered.cancels()).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it('cancels on Escape', () => {
    const rendered = render();
    const event = press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.commits()).toBe(0);
    expect(event.defaultPrevented).toBe(true);
  });

  it('marks itself invalid only when told to', () => {
    const rendered = render({ invalid: true });
    expect(rendered.input.getAttribute('aria-invalid')).toBe('true');
    rendered.fixture.componentRef.setInput('invalid', false);
    rendered.fixture.detectChanges();
    expect(rendered.input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('disables the input', () => {
    const { input } = render({ disabled: true });
    expect(input.disabled).toBe(true);
  });

  it('leaves spellcheck, autocapitalise and autocorrect to the browser for plain text', () => {
    const { input } = render();
    expect(input.hasAttribute('spellcheck')).toBe(false);
    expect(input.hasAttribute('autocapitalize')).toBe(false);
    expect(input.hasAttribute('autocorrect')).toBe(false);
    expect(input.classList).not.toContain('font-mono');
  });

  it('turns off spellcheck, autocapitalise and autocorrect for monospace text', () => {
    const code = render({ monospace: true });
    expect(code.input.getAttribute('spellcheck')).toBe('false');
    expect(code.input.getAttribute('autocapitalize')).toBe('off');
    expect(code.input.getAttribute('autocorrect')).toBe('off');
    expect(code.input.classList).toContain('font-mono');
  });
});
