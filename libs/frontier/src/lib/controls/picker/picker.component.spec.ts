import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE } from '../search-input/search-input.component';
import {
  FEATS,
  grid,
  headerCells,
  highlighted,
  longList,
  LONG_LIST,
  open,
  press,
  render,
  rowCells,
  describedText,
  searchBox,
  selectedStates,
  sortButton,
  settle,
  stubLayout,
  type,
} from './picker-testing';
import { Picker } from './picker.component';

describe(Picker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('is a labelled, collapsed trigger with the placeholder until opened', () => {
    const rendered = render();
    expect(rendered.trigger.getAttribute('aria-haspopup')).toBe('grid');
    expect(rendered.trigger.getAttribute('aria-expanded')).toBe('false');
    expect(rendered.trigger.getAttribute('aria-label')).toBe('Feat');
    expect(rendered.trigger.textContent.trim()).toBe('Select…');
    expect(grid(rendered)).toBeNull();
  });

  it('opens a search box and a grid it controls, and asks for the first rows', async () => {
    const rendered = render();
    await open(rendered);
    expect(rendered.trigger.getAttribute('aria-expanded')).toBe('true');
    expect(searchBox(rendered).getAttribute('role')).toBe('combobox');
    expect(grid(rendered)?.getAttribute('aria-label')).toBe('Feat');
    expect(rendered.searches).toStrictEqual(['']);
  });

  it('renders the schema as a grid: headers, and a row of cells per feat', async () => {
    const rendered = render();
    await open(rendered);
    expect(headerCells(rendered).map((cell) => cell.textContent.trim())).toStrictEqual(['Name', 'Level']);
    expect(rowCells(rendered).map((cell) => cell.textContent.trim())).toStrictEqual([
      'Power Attack',
      'Sudden ChargeNeeds expert in Athletics',
      'Reactive Shield',
    ]);
    expect(grid(rendered)?.getAttribute('aria-rowcount')).toBe('4');
  });

  it('picks the highlighted row on Enter, shows its label and commits', async () => {
    const rendered = render();
    await open(rendered);
    await press(rendered, 'ArrowDown');
    await press(rendered, 'ArrowDown');
    await vi.waitFor(() => {
      expect(highlighted(rendered)?.textContent.trim()).toBe('Reactive Shield');
    });
    await press(rendered, 'Enter');
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.value()).toBe('reactive-shield');
    });
    await settle(rendered);
    expect(rendered.trigger.textContent.trim()).toBe('Reactive Shield');
    expect(rendered.commits()).toBe(1);
    expect(rendered.trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('picks a row on click', async () => {
    const rendered = render();
    await open(rendered);
    rowCells(rendered)[2]?.click();
    await settle(rendered);
    expect(rendered.fixture.componentInstance.value()).toBe('reactive-shield');
    expect(rendered.trigger.textContent.trim()).toBe('Reactive Shield');
    expect(rendered.commits()).toBe(1);
  });

  it('marks the picked row selected', async () => {
    const rendered = render(FEATS, 'reactive-shield');
    await open(rendered);
    expect(selectedStates(rendered)).toStrictEqual(['false', 'none', 'true']);
  });

  it('shows why a row cannot be picked, describes its cells with it, and keeps it from being picked', async () => {
    const rendered = render();
    await open(rendered);
    const [, locked] = rowCells(rendered);
    expect(locked?.getAttribute('aria-disabled')).toBe('true');
    expect(describedText(rendered, locked)).toBe('Needs expert in Athletics');
    locked?.click();
    await settle(rendered);
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
    expect(rendered.commits()).toBe(0);
  });

  it('closes on Escape, returns focus to the trigger and cancels', async () => {
    const rendered = render();
    document.body.append(rendered.host);
    await open(rendered);
    await press(rendered, 'Escape');
    expect(rendered.trigger.getAttribute('aria-expanded')).toBe('false');
    expect(rendered.cancels()).toBe(1);
    expect(document.activeElement).toBe(rendered.trigger);
    rendered.host.remove();
  });

  it('closes on Escape pressed on a column sort button', async () => {
    const rendered = render();
    document.body.append(rendered.host);
    await open(rendered);
    sortButton(headerCells(rendered)[0])?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await settle(rendered);
    expect(rendered.trigger.getAttribute('aria-expanded')).toBe('false');
    expect(rendered.cancels()).toBe(1);
    rendered.host.remove();
  });

  it('fires searched once typing goes quiet, and not again for the same query', async () => {
    vi.useFakeTimers();
    const rendered = render();
    await open(rendered);
    type(rendered, 'pow');
    type(rendered, 'power');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE);
    expect(rendered.searches).toStrictEqual(['', 'power']);
    type(rendered, 'power');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE);
    expect(rendered.searches).toStrictEqual(['', 'power']);
  });

  it('keeps the picked label while a search leaves the row out', async () => {
    const rendered = render(FEATS, 'reactive-shield');
    expect(rendered.trigger.textContent.trim()).toBe('Reactive Shield');
    rendered.fixture.componentRef.setInput('rows', [FEATS[0]]);
    await settle(rendered);
    expect(rendered.trigger.textContent.trim()).toBe('Reactive Shield');
  });

  it('sorts a column on a header press: sets aria-sort and asks the caller for the order', async () => {
    const rendered = render();
    await open(rendered);
    const sort = sortButton(headerCells(rendered)[0]);
    sort?.click();
    await settle(rendered);
    expect(headerCells(rendered)[0]?.getAttribute('aria-sort')).toBe('ascending');
    sort?.click();
    await settle(rendered);
    expect(headerCells(rendered)[0]?.getAttribute('aria-sort')).toBe('descending');
    expect(rendered.sorts).toStrictEqual([
      { column: 'name', descending: false },
      { column: 'name', descending: true },
    ]);
  });

  it('shows skeleton rows in place of the rows while loading', async () => {
    const rendered = render();
    rendered.fixture.componentRef.setInput('loading', true);
    await open(rendered);
    expect(grid(rendered)?.getAttribute('aria-busy')).toBe('true');
    expect(rowCells(rendered)).toHaveLength(0);
    expect(rendered.host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('renders only a window of a long list, and says how long it is', async () => {
    const rendered = render(longList());
    await open(rendered);
    expect(rowCells(rendered).length).toBeLessThan(LONG_LIST);
    expect(grid(rendered)?.getAttribute('aria-rowcount')).toBe(String(LONG_LIST + 1));
  });

  it('asks for more rows once the end is near, once per length, and not while loading or without more', async () => {
    const rendered = render(FEATS);
    rendered.fixture.componentRef.setInput('hasMore', true);
    await open(rendered);
    expect(rendered.loads()).toBe(1);
    await settle(rendered);
    expect(rendered.loads()).toBe(1);

    rendered.fixture.componentRef.setInput('rows', [...FEATS, ...longList().slice(0, 2)]);
    rendered.fixture.componentRef.setInput('loadingMore', true);
    await settle(rendered);
    expect(rendered.loads()).toBe(1);
    rendered.fixture.componentRef.setInput('loadingMore', false);
    rendered.fixture.componentRef.setInput('hasMore', false);
    await settle(rendered);
    expect(rendered.loads()).toBe(1);
  });

  it('asks again after a load finishes without adding rows', async () => {
    const rendered = render(FEATS);
    rendered.fixture.componentRef.setInput('hasMore', true);
    await open(rendered);
    expect(rendered.loads()).toBe(1);
    rendered.fixture.componentRef.setInput('loadingMore', true);
    await settle(rendered);
    rendered.fixture.componentRef.setInput('loadingMore', false);
    await settle(rendered);
    grid(rendered)?.parentElement?.dispatchEvent(new Event('scroll'));
    await settle(rendered);
    expect(rendered.loads()).toBe(2);
  });

  it('does not ask for more while the end of a long list is far off', async () => {
    const rendered = render(longList());
    rendered.fixture.componentRef.setInput('hasMore', true);
    await open(rendered);
    expect(rendered.loads()).toBe(0);
  });
});
