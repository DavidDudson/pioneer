import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { Input } from './input.component';

interface Rendered {
  readonly fixture: ComponentFixture<Input>;
  readonly input: HTMLInputElement;
  readonly commits: () => number;
  readonly cancels: () => number;
  readonly typed: () => readonly string[];
}

function render(inputs: ComponentInputs<Input> = {}): Rendered {
  const fixture = TestBed.createComponent(Input);
  fixture.componentRef.setInput('ariaLabel', 'Name');

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  let commits = 0;
  let cancels = 0;
  const typed: string[] = [];
  fixture.componentInstance.committed.subscribe(() => {
    commits += 1;
  });
  fixture.componentInstance.cancelled.subscribe(() => {
    cancels += 1;
  });
  fixture.componentInstance.typed.subscribe((raw) => {
    typed.push(raw);
  });
  fixture.detectChanges();
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  const input = (fixture.nativeElement as HTMLElement).querySelector('input');

  if (input === null) {
    throw new Error('Expected an input');
  }

  return {
    fixture,
    input,
    commits: (): number => commits,
    cancels: (): number => cancels,
    typed: (): readonly string[] => typed,
  };
}

type CommitKey = 'Enter' | 'Escape';

interface KeyOptions {
  readonly key: CommitKey;
  readonly isComposing?: boolean;
  readonly keyCode?: number;
}

function press(rendered: Rendered, options: KeyOptions): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: options.key,
    isComposing: options.isComposing ?? false,
    // oxlint-disable-next-line typescript/no-deprecated -- the init member Safari's post-composition Enter is simulated with
    keyCode: options.keyCode ?? 0,
    bubbles: true,
    cancelable: true,
  });

  rendered.input.dispatchEvent(event);
  rendered.fixture.detectChanges();

  return event;
}

/** The two signals of an IME at work, each as the init of a key press that would otherwise commit or cancel. */
const IME_SIGNALS: readonly { readonly name: string; readonly options: (key: CommitKey) => KeyOptions }[] = [
  { name: 'isComposing', options: (key) => ({ key, isComposing: true }) },
  { name: 'keyCode 229, as Safari sends after a composition ends', options: (key) => ({ key, keyCode: 229 }) },
];

describe(Input, () => {
  it('is a text input named by ariaLabel, with no id or description outside a field', () => {
    const { input } = render();
    expect(input.type).toBe('text');
    expect(input.getAttribute('aria-label')).toBe('Name');
    expect(input.hasAttribute('id')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it.each(['text', 'search', 'number', 'date'] as const)('renders a %s input', (type) => {
    expect(render({ type }).input.type).toBe(type);
  });

  it('shows the value, placeholder and number attributes', () => {
    const { input } = render({ type: 'number', value: '4', placeholder: 'Any', min: 1, max: 9, step: 1 });
    expect(input.value).toBe('4');
    expect(input.placeholder).toBe('Any');
    expect([input.min, input.max, input.step]).toStrictEqual(['1', '9', '1']);
  });

  it('reports the raw text after every edit', () => {
    const rendered = render();
    rendered.input.value = 'Seelah';
    rendered.input.dispatchEvent(new Event('input'));
    expect(rendered.typed()).toStrictEqual(['Seelah']);
  });

  it('commits on Enter without blocking a form submit', () => {
    const rendered = render();
    const event = press(rendered, { key: 'Enter' });
    expect(rendered.commits()).toBe(1);
    expect(rendered.cancels()).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it('cancels on Escape', () => {
    const rendered = render();
    const event = press(rendered, { key: 'Escape' });
    expect(rendered.cancels()).toBe(1);
    expect(rendered.commits()).toBe(0);
    expect(event.defaultPrevented).toBe(true);
  });

  describe.each(IME_SIGNALS)('while an IME composes ($name)', ({ options }) => {
    it('does not commit on Enter', () => {
      const rendered = render();
      press(rendered, options('Enter'));
      expect(rendered.commits()).toBe(0);
    });

    it('leaves Escape, which abandons the composition, to the IME', () => {
      const rendered = render();
      const event = press(rendered, options('Escape'));
      expect(rendered.cancels()).toBe(0);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  it('commits again once composition is over', () => {
    const rendered = render();
    press(rendered, { key: 'Enter', isComposing: true });
    press(rendered, { key: 'Enter' });
    expect(rendered.commits()).toBe(1);
  });

  it('marks itself invalid only when told to', () => {
    const rendered = render({ invalid: true });
    expect(rendered.input.getAttribute('aria-invalid')).toBe('true');
    rendered.fixture.componentRef.setInput('invalid', false);
    rendered.fixture.detectChanges();
    expect(rendered.input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('disables the input', () => {
    expect(render({ disabled: true }).input.disabled).toBe(true);
  });

  it('takes focus on focus()', () => {
    const rendered = render();
    // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
    document.body.append(rendered.fixture.nativeElement as HTMLElement);
    rendered.fixture.componentInstance.focus();
    expect(document.activeElement).toBe(rendered.input);
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
