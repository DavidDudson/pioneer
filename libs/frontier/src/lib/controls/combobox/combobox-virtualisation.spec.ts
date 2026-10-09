import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { highlighted, LONG_LIST, longList, optionElements, press, render, stubLayout } from './combobox-testing';
import { Combobox } from './combobox.component';

describe(`${Combobox.name} with a long list`, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
