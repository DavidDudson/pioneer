import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FEATS,
  highlighted,
  listbox,
  longList,
  optionElements,
  press,
  render,
  settle,
  stubLayout,
} from './combobox-testing';
import type { Rendered } from './combobox-testing';
import { Combobox } from './combobox.component';

/** Far enough down a 500-row list to put its last rows in view. */
const SCROLLED_PX = 1_000_000;

function renderMulti(values: ReadonlyArray<string> = []): Rendered {
  const rendered = render(FEATS);
  rendered.fixture.componentRef.setInput('multi', true);
  rendered.fixture.componentRef.setInput('values', values);
  rendered.fixture.detectChanges();

  return rendered;
}

async function pickHighlighted(rendered: Rendered): Promise<void> {
  await press(rendered, 'Enter');
  await settle(rendered);
}

describe(`${Combobox.name} multi`, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks the listbox as multi-selectable', async () => {
    const rendered = renderMulti();
    await press(rendered, 'ArrowDown');
    expect(listbox(rendered)?.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('shows the picked values as selected options', async () => {
    const rendered = renderMulti(['power-attack', 'reactive-shield']);
    await press(rendered, 'ArrowDown');
    await vi.waitFor(() => {
      expect(optionElements(rendered).map((option) => option.getAttribute('aria-selected'))).toStrictEqual([
        'true',
        'false',
        'true',
      ]);
    });
  });

  it('adds each pick to the set, keeps the list open and commits every time', async () => {
    const rendered = renderMulti();
    await press(rendered, 'ArrowDown');
    await vi.waitFor(() => {
      expect(highlighted(rendered)?.textContent.trim()).toBe('Power Attack');
    });
    await pickHighlighted(rendered);
    await press(rendered, 'ArrowDown');
    await pickHighlighted(rendered);
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.values()).toStrictEqual(['power-attack', 'sudden-charge']);
    });
    expect(rendered.input.getAttribute('aria-expanded')).toBe('true');
    expect(rendered.commits()).toBe(2);
  });

  it('keeps a pick whose option a later query hides', async () => {
    const rendered = renderMulti(['power-attack']);
    rendered.fixture.componentRef.setInput('options', [{ value: 'sudden-charge', label: 'Sudden Charge' }]);
    await press(rendered, 'ArrowDown');
    await vi.waitFor(() => {
      expect(highlighted(rendered)?.textContent.trim()).toBe('Sudden Charge');
    });
    await pickHighlighted(rendered);
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.values()).toStrictEqual(['power-attack', 'sudden-charge']);
    });
  });
});

interface Paged {
  readonly rendered: Rendered;
  readonly asked: () => number;
}

function renderPaged(hasMore: boolean): Paged {
  const rendered = render(longList());
  let asks = 0;
  rendered.fixture.componentInstance.loadMore.subscribe(() => {
    asks += 1;
  });
  rendered.fixture.componentRef.setInput('hasMore', hasMore);
  rendered.fixture.detectChanges();

  return { rendered, asked: (): number => asks };
}

/** The list scrolls to the highlight; jsdom has no scrolling, so say it did. */
async function scrollToEnd(rendered: Rendered): Promise<void> {
  await press(rendered, 'ArrowDown');
  await press(rendered, 'End');
  const popup = listbox(rendered)?.parentElement;

  if (popup !== null && popup !== undefined) {
    Object.defineProperty(popup, 'scrollTop', { value: SCROLLED_PX, configurable: true });
    popup.dispatchEvent(new Event('scroll'));
  }

  await settle(rendered);
}

describe(`${Combobox.name} loadMore`, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks for the next page once the end of the loaded options is in view', async () => {
    const { rendered, asked } = renderPaged(true);
    await scrollToEnd(rendered);
    await vi.waitFor(() => {
      expect(asked()).toBe(1);
    });
  });

  it('does not ask while the loaded options are all there is', async () => {
    const { rendered, asked } = renderPaged(false);
    await press(rendered, 'ArrowDown');
    await press(rendered, 'End');
    await settle(rendered);
    expect(asked()).toBe(0);
  });

  it('does not ask again while a page is loading', async () => {
    const { rendered, asked } = renderPaged(true);
    rendered.fixture.componentRef.setInput('loadingMore', true);
    await press(rendered, 'ArrowDown');
    await press(rendered, 'End');
    await settle(rendered);
    expect(asked()).toBe(0);
  });
});
