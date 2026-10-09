import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { SEARCH_DEBOUNCE } from '../search-input/search-input.component';
import type { SelectOption } from '../select/select.component';
import { Combobox } from './combobox.component';

/** Nothing is laid out in jsdom: give the listbox's scroll container a height and every option a touch-target row. */
const VIEWPORT_PX = 220;
const ROW_PX = 44;
const LONG_LIST = 500;

const FEATS: readonly SelectOption<string>[] = [
  { value: 'power-attack', label: 'Power Attack' },
  { value: 'sudden-charge', label: 'Sudden Charge' },
  { value: 'reactive-shield', label: 'Reactive Shield' },
];

function longList(): readonly SelectOption<string>[] {
  return Array.from({ length: LONG_LIST }, (_entry, index) => ({
    value: `feat-${index}`,
    label: `Feat ${index + 1}`,
  }));
}

interface Rendered {
  readonly fixture: ComponentFixture<Combobox<string>>;
  readonly input: HTMLInputElement;
  readonly searches: string[];
  readonly commits: () => number;
  readonly cancels: () => number;
}

function render(options: readonly SelectOption<string>[] = FEATS, value?: string): Rendered {
  TestBed.configureTestingModule({
    providers: [...provideFrontierI18nTesting()],
  });
  const fixture = TestBed.createComponent(Combobox<string>);
  fixture.componentRef.setInput('ariaLabel', 'Feat');
  fixture.componentRef.setInput('options', options);
  if (value !== undefined) {
    fixture.componentRef.setInput('value', value);
  }
  const searches: string[] = [];
  let commits = 0;
  let cancels = 0;
  fixture.componentInstance.searched.subscribe((query) => {
    searches.push(query);
  });
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
  return {
    fixture,
    input,
    searches,
    commits: (): number => commits,
    cancels: (): number => cancels,
  };
}

async function settle(rendered: Rendered): Promise<void> {
  rendered.fixture.detectChanges();
  await rendered.fixture.whenStable();
  rendered.fixture.detectChanges();
}

async function press(rendered: Rendered, key: string): Promise<void> {
  rendered.input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle(rendered);
}

function type(rendered: Rendered, text: string): void {
  rendered.input.value = text;
  rendered.input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
  rendered.fixture.detectChanges();
}

function listbox(rendered: Rendered): HTMLElement | null {
  return (rendered.fixture.nativeElement as HTMLElement).querySelector('[role="listbox"]');
}

function optionElements(rendered: Rendered): HTMLElement[] {
  return [...(rendered.fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="option"]')];
}

function highlighted(rendered: Rendered): HTMLElement | undefined {
  const id = rendered.input.getAttribute('aria-activedescendant');
  return optionElements(rendered).find((option) => option.id === id);
}

describe(Combobox, () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT_PX);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: VIEWPORT_PX, height: ROW_PX }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a labelled, collapsed combobox until opened', () => {
    const rendered = render();
    expect(rendered.input.getAttribute('role')).toBe('combobox');
    expect(rendered.input.getAttribute('aria-label')).toBe('Feat');
    expect(rendered.input.getAttribute('aria-expanded')).toBe('false');
    expect(listbox(rendered)).toBeNull();
  });

  it('opens a named listbox it controls on ArrowDown', async () => {
    const rendered = render();
    await press(rendered, 'ArrowDown');
    expect(rendered.input.getAttribute('aria-expanded')).toBe('true');
    expect(listbox(rendered)?.getAttribute('aria-label')).toBe('Feat');
    expect(rendered.input.getAttribute('aria-controls')).toBe(listbox(rendered)?.id);
  });

  it('names each option by its label and gives its place in the whole list', async () => {
    const rendered = render();
    await press(rendered, 'ArrowDown');
    expect(optionElements(rendered).map((option) => option.textContent.trim())).toStrictEqual([
      'Power Attack',
      'Sudden Charge',
      'Reactive Shield',
    ]);
    expect(optionElements(rendered).map((option) => option.getAttribute('aria-posinset'))).toStrictEqual([
      '1',
      '2',
      '3',
    ]);
    expect(optionElements(rendered)[0]?.getAttribute('aria-setsize')).toBe('3');
  });

  it('picks the highlighted option on Enter, shows its label and commits', async () => {
    const rendered = render();
    await press(rendered, 'ArrowDown');
    await press(rendered, 'ArrowDown');
    await vi.waitFor(() => {
      expect(highlighted(rendered)?.textContent.trim()).toBe('Sudden Charge');
    });
    await press(rendered, 'Enter');
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.value()).toBe('sudden-charge');
    });
    await settle(rendered);
    expect(rendered.input.value).toBe('Sudden Charge');
    expect(rendered.commits()).toBe(1);
    expect(rendered.input.getAttribute('aria-expanded')).toBe('false');
    expect(rendered.searches).toStrictEqual([]);
  });

  it('picks an option on click', async () => {
    const rendered = render();
    await press(rendered, 'ArrowDown');
    optionElements(rendered)[2]?.click();
    await settle(rendered);
    expect(rendered.fixture.componentInstance.value()).toBe('reactive-shield');
    expect(rendered.input.value).toBe('Reactive Shield');
    expect(rendered.commits()).toBe(1);
  });

  it('shows the picked option as selected when the list opens again', async () => {
    const rendered = render(FEATS, 'sudden-charge');
    await press(rendered, 'ArrowDown');
    await vi.waitFor(() => {
      expect(optionElements(rendered).map((option) => option.getAttribute('aria-selected'))).toStrictEqual([
        'false',
        'true',
        'false',
      ]);
    });
    expect(rendered.commits()).toBe(0);
  });

  it('shows the label of a value set from outside', async () => {
    const rendered = render(FEATS, 'power-attack');
    await settle(rendered);
    expect(rendered.input.value).toBe('Power Attack');
  });

  it('puts the picked label back over a typed query on Escape and cancels', async () => {
    const rendered = render(FEATS, 'power-attack');
    await settle(rendered);
    type(rendered, 'Sud');
    await settle(rendered);
    await press(rendered, 'Escape');
    expect(rendered.input.value).toBe('Power Attack');
    expect(rendered.fixture.componentInstance.value()).toBe('power-attack');
    expect(rendered.cancels()).toBe(1);
  });

  it('shows skeleton rows and a busy listbox while loading', async () => {
    const rendered = render([]);
    rendered.fixture.componentRef.setInput('loading', true);
    await press(rendered, 'ArrowDown');
    expect(listbox(rendered)?.getAttribute('aria-busy')).toBe('true');
    expect((rendered.fixture.nativeElement as HTMLElement).querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
    expect((rendered.fixture.nativeElement as HTMLElement).textContent).not.toContain('No matches');
  });

  it('says so when nothing matches', async () => {
    const rendered = render([]);
    await press(rendered, 'ArrowDown');
    expect(listbox(rendered)?.hasAttribute('aria-busy')).toBe(false);
    await vi.waitFor(() => {
      expect((rendered.fixture.nativeElement as HTMLElement).textContent).toContain('No matches');
    });
  });

  describe('a long list', () => {
    it('renders only a window of the options, plus the first and last', async () => {
      const rendered = render(longList());
      await press(rendered, 'ArrowDown');
      const rendering = optionElements(rendered);
      expect(rendering.length).toBeLessThan(LONG_LIST / 10);
      expect(rendering[0]?.getAttribute('aria-posinset')).toBe('1');
      expect(rendering.at(-1)?.getAttribute('aria-posinset')).toBe(String(LONG_LIST));
      expect(rendering[0]?.getAttribute('aria-setsize')).toBe(String(LONG_LIST));
    });

    it('reaches the real last option on End and the first on Home', async () => {
      const rendered = render(longList());
      await press(rendered, 'ArrowDown');
      await press(rendered, 'End');
      await vi.waitFor(() => {
        expect(highlighted(rendered)?.getAttribute('aria-posinset')).toBe(String(LONG_LIST));
      });
      await press(rendered, 'Home');
      await vi.waitFor(() => {
        expect(highlighted(rendered)?.getAttribute('aria-posinset')).toBe('1');
      });
    });

    it('keeps the highlight rendered as arrows walk past the window', async () => {
      const rendered = render(longList());
      await press(rendered, 'ArrowDown');
      // Faster than any scroll: each press renders once, then the next comes.
      const steps = 20;
      for (let step = 0; step < steps; step += 1) {
        rendered.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        rendered.fixture.detectChanges();
      }
      await vi.waitFor(() => {
        expect(highlighted(rendered)?.getAttribute('aria-posinset')).toBe(String(steps + 1));
      });
    });
  });

  describe('searching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens as the user types and searches once typing goes quiet', () => {
      const rendered = render();
      type(rendered, 'Pow');
      type(rendered, 'Power');
      expect(rendered.input.getAttribute('aria-expanded')).toBe('true');
      vi.advanceTimersByTime(SEARCH_DEBOUNCE - 1);
      expect(rendered.searches).toStrictEqual([]);
      vi.advanceTimersByTime(1);
      expect(rendered.searches).toStrictEqual(['Power']);
    });

    it('drops a pending query on Escape', () => {
      const rendered = render();
      type(rendered, 'Pow');
      rendered.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      vi.advanceTimersByTime(SEARCH_DEBOUNCE);
      expect(rendered.searches).toStrictEqual([]);
      expect(rendered.cancels()).toBe(1);
    });

    it('never searches once destroyed', () => {
      const rendered = render();
      type(rendered, 'Power');
      rendered.fixture.destroy();
      vi.advanceTimersByTime(SEARCH_DEBOUNCE);
      expect(rendered.searches).toStrictEqual([]);
    });
  });
});
