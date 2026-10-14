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
import { SLOT_FACTS, slotRow } from '../testing/slot-picker-fixtures';
import { SlotPicker } from './slot-picker.component';

const LONG_LIST = 300;
const SEARCH_DELAY = 500;

const FIRE = slotRow({ id: 'fire', name: 'Fire' });
const WATER = slotRow({ id: 'water', name: 'Water' });
const EMBER = slotRow({ id: 'ember', name: 'Ember', facts: SLOT_FACTS });
const LOCKED = slotRow({ id: 'void', name: 'Void', disabledReason: 'Not in the loaded packs' });

describe(SlotPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("is a table of the name, the entry's facts and the source", async () => {
    const { host } = await render(SlotPicker, { rows: [FIRE, WATER] });
    expect(headers(host)).toStrictEqual(['Name', 'Level', 'Traits', 'Summary', 'Source']);
  });

  it('shows the source of each option', async () => {
    const { host } = await render(SlotPicker, { rows: [FIRE, WATER] });
    expect(rowText(host, 0)).toContain('Player Core');
    expect(rowText(host, 1)).toContain('Player Core');
  });

  it('shows the level, rarity, traits and summary of an option that names a content entry', async () => {
    const { host } = await render(SlotPicker, { rows: [EMBER] });
    const text = rowText(host, 0);
    expect(
      ['3', 'Uncommon', 'Fire', 'Magical', 'Burns what it touches.'].filter((fact) => !text.includes(fact)),
    ).toStrictEqual([]);
  });

  it('falls back to the name and source for an option no entry stands behind', async () => {
    const { host } = await render(SlotPicker, { rows: [FIRE, EMBER] });
    expect(rowLabels(host)).toStrictEqual(['Fire', 'Ember']);
    expect(rowText(host, 0)).toContain('Player Core');
    expect(rowText(host, 0)).not.toContain('Uncommon');
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
