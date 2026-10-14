import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  headers,
  nameCellAt,
  nameCells,
  press,
  render,
  rowLabels,
  rowText,
  search,
  settle,
  stubLayout,
} from '../testing/origin-picker-testing';
import { slotRow } from '../testing/slot-picker-fixtures';
import { SlotPicker } from './slot-picker.component';

const LONG_LIST = 300;
const SEARCH_DELAY = 500;

const FIRE = slotRow({ id: 'fire', name: 'Fire' });
const WATER = slotRow({ id: 'water', name: 'Water' });
const LOCKED = slotRow({ id: 'void', name: 'Void', disabledReason: 'Not in the loaded packs' });

describe(SlotPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('is a name and source table', async () => {
    const { host } = await render(SlotPicker, { rows: [FIRE, WATER] });
    expect(headers(host)).toStrictEqual(['Name', 'Source']);
  });

  it('shows the source of each option', async () => {
    const { host } = await render(SlotPicker, { rows: [FIRE, WATER] });
    expect(rowText(host, 0)).toContain('Player Core');
    expect(rowText(host, 1)).toContain('Player Core');
  });

  it('says why an option cannot be picked', async () => {
    const { host } = await render(SlotPicker, { rows: [FIRE, LOCKED] });
    expect(rowText(host, 1)).toContain('Not in the loaded packs');
  });

  it('searches the name', async () => {
    vi.useFakeTimers();
    const rendered = await render(SlotPicker, { rows: [FIRE, WATER] });
    search(rendered, 'wat');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY);
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Water']);
  });

  it('copes with a long list', async () => {
    const rows = Array.from({ length: LONG_LIST }, (_unused, index) =>
      slotRow({ id: `o${index}`, name: `Option ${index}` }),
    );
    const { host } = await render(SlotPicker, { rows });
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe(String(LONG_LIST + 1));
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(SlotPicker, { rows: [], loading: true });
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when the slot offers nothing', async () => {
    const { host } = await render(SlotPicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
  });

  it('stays closed until it is pressed when it is not to open on init', async () => {
    const { host } = await render(SlotPicker, { rows: [FIRE, WATER], openOnInit: false });
    expect(nameCells(host)).toHaveLength(0);
  });

  it('picks on click and commits the option', async () => {
    const rendered = await render(SlotPicker, { rows: [FIRE, WATER] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('water');
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(SlotPicker, { rows: [FIRE, WATER], value: 'water' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('water');
  });
});
