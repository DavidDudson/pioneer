import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE } from '../search-input/search-input.component';
import {
  FEATS,
  highlighted,
  listbox,
  optionElements,
  press,
  render,
  settle,
  stubLayout,
  type,
} from './combobox-testing';
import { Combobox } from './combobox.component';

describe(Combobox, () => {
  beforeEach(() => {
    stubLayout();
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

  it('shows a description under an option, and keeps a disabled one from being picked', async () => {
    const rendered = render([
      { value: 'power-attack', label: 'Power Attack' },
      { value: 'sudden-charge', label: 'Sudden Charge', description: 'Needs expert in Athletics', disabled: true },
    ]);
    await press(rendered, 'ArrowDown');
    const [, blocked] = optionElements(rendered);
    expect(blocked?.textContent).toContain('Needs expert in Athletics');
    expect(blocked?.getAttribute('aria-disabled')).toBe('true');
    blocked?.click();
    await settle(rendered);
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
    expect(rendered.commits()).toBe(0);
  });

  it('reaches a disabled option with the arrow keys, so its description is read, but Enter does not pick it', async () => {
    const rendered = render([
      { value: 'power-attack', label: 'Power Attack' },
      { value: 'sudden-charge', label: 'Sudden Charge', description: 'Needs expert in Athletics', disabled: true },
    ]);
    await press(rendered, 'ArrowDown');
    await press(rendered, 'ArrowDown');
    await vi.waitFor(() => {
      expect(highlighted(rendered)?.textContent).toContain('Needs expert in Athletics');
    });
    await press(rendered, 'Enter');
    await settle(rendered);
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
    expect(rendered.commits()).toBe(0);
  });

  it('clears its text when a form resets the value to the empty string', async () => {
    const rendered = render();
    await press(rendered, 'ArrowDown');
    optionElements(rendered)[2]?.click();
    await settle(rendered);
    rendered.fixture.componentRef.setInput('value', '');
    await settle(rendered);
    expect(rendered.input.value).toBe('');
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

  it('fills in the label once its option loads after the value', async () => {
    const rendered = render([], 'power-attack');
    await settle(rendered);
    expect(rendered.input.value).toBe('');
    rendered.fixture.componentRef.setInput('options', FEATS);
    await settle(rendered);
    expect(rendered.input.value).toBe('Power Attack');
  });

  it('shows the query while nothing is picked, and puts it back over typing on Escape', async () => {
    const rendered = render();
    rendered.fixture.componentRef.setInput('query', 'attack');
    await settle(rendered);
    expect(rendered.input.value).toBe('attack');
    type(rendered, 'shield');
    await press(rendered, 'Escape');
    expect(rendered.input.value).toBe('attack');
  });

  it('replaces what was typed when the query is set again', async () => {
    const rendered = render();
    rendered.fixture.componentRef.setInput('query', 'attack');
    await settle(rendered);
    type(rendered, 'shield');
    rendered.fixture.componentRef.setInput('query', 'charge');
    await settle(rendered);
    expect(rendered.input.value).toBe('charge');
  });

  it('opens its list from outside', async () => {
    const rendered = render();
    rendered.fixture.componentInstance.open();
    await settle(rendered);
    expect(rendered.input.getAttribute('aria-expanded')).toBe('true');
    expect(optionElements(rendered)).toHaveLength(3);
  });

  it('commits on Enter while the list is closed, leaving the value as it was', async () => {
    const rendered = render(FEATS, 'power-attack');
    await press(rendered, 'Enter');
    expect(rendered.commits()).toBe(1);
    expect(rendered.input.getAttribute('aria-expanded')).toBe('false');
    expect(rendered.fixture.componentInstance.value()).toBe('power-attack');
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

  it('commits and closes when the picked option is picked again', async () => {
    const rendered = render(FEATS, 'sudden-charge');
    await press(rendered, 'ArrowDown');
    await vi.waitFor(() => {
      expect(highlighted(rendered)?.textContent.trim()).toBe('Sudden Charge');
    });
    await press(rendered, 'Enter');
    expect(rendered.commits()).toBe(1);
    expect(rendered.input.getAttribute('aria-expanded')).toBe('false');
    expect(rendered.fixture.componentInstance.value()).toBe('sudden-charge');
  });

  it('puts the picked label back even when the last search left its option out', async () => {
    const rendered = render(FEATS, 'power-attack');
    await settle(rendered);
    type(rendered, 'Sud');
    rendered.fixture.componentRef.setInput('options', FEATS.slice(1));
    await settle(rendered);
    await press(rendered, 'Escape');
    expect(rendered.input.value).toBe('Power Attack');
  });

  it('replaces the last options with skeleton rows while the next ones load', async () => {
    const rendered = render();
    await press(rendered, 'ArrowDown');
    rendered.fixture.componentRef.setInput('loading', true);
    await settle(rendered);
    expect(optionElements(rendered)).toStrictEqual([]);
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

    it('emits every keystroke as typed, before the debounce', () => {
      const rendered = render();
      const typed: string[] = [];
      rendered.fixture.componentInstance.typed.subscribe((text) => {
        typed.push(text);
      });
      type(rendered, 'Pow');
      type(rendered, 'Power');
      expect(typed).toStrictEqual(['Pow', 'Power']);
      expect(rendered.searches).toStrictEqual([]);
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
