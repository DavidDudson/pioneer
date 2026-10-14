import { Feet, HitPoints } from '@pioneer/rules/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ancestryRow } from '../testing/origin-picker-fixtures';
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
  sortButton,
  stubLayout,
  textOf,
} from '../testing/origin-picker-testing';
import { AncestryPicker } from './ancestry-picker.component';

const LONG_LIST = 300;

const ELF = ancestryRow({ id: 'elf', name: 'Elf' });
const DWARF = ancestryRow({
  id: 'dwarf',
  name: 'Dwarf',
  hitPoints: HitPoints.parse(10),
  speed: Feet.parse(20),
  boosts: [['con'], ['wis'], ['cha']],
  flaws: ['cha'],
  languages: ['Common', 'Dwarven'],
  traits: ['Dwarf', 'Humanoid'],
});
const LOCKED = ancestryRow({ id: 'locked', name: 'Kitsune', disabledReason: 'Not in the loaded packs' });
const HIT_POINTS_HEADER = 1;
const SPEED_HEADER = 3;

describe(AncestryPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens straight to the table, with a column for each fact to choose by', async () => {
    const { host } = await render(AncestryPicker, { rows: [ELF, DWARF] });
    expect(headers(host)).toStrictEqual([
      'Name',
      'Hit points',
      'Size',
      'Speed',
      'Attribute boosts',
      'Flaws',
      'Languages',
      'Traits',
      'Source',
    ]);
  });

  it('shows what an ancestry gives and costs in rich cells', async () => {
    const { host } = await render(AncestryPicker, { rows: [ELF, DWARF] });
    const text = rowText(host, 0);
    const facts = ['6 HP', 'Medium', '30 ft', 'Constitution', 'Common', 'Elven', 'Elf', 'Humanoid'];
    expect(facts.filter((fact) => !text.includes(fact))).toStrictEqual([]);
  });

  it('sorts by hit points, ascending then descending', async () => {
    const rendered = await render(AncestryPicker, { rows: [DWARF, ELF] });
    sortButton(rendered.host, HIT_POINTS_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Elf', 'Dwarf']);
    sortButton(rendered.host, HIT_POINTS_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Dwarf', 'Elf']);
  });

  it('sorts by speed', async () => {
    const rendered = await render(AncestryPicker, { rows: [ELF, DWARF] });
    sortButton(rendered.host, SPEED_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Dwarf', 'Elf']);
  });

  it('disables an ancestry that cannot be picked and says why', async () => {
    const { host, fixture } = await render(AncestryPicker, { rows: [ELF, LOCKED] });
    const locked = nameCellAt(host, 1);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(textOf(locked)).toContain('Not in the loaded packs');
    locked.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(AncestryPicker, { rows: [], loading: true });
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-busy')).toBe('true');
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when the slot offers no ancestries', async () => {
    const { host } = await render(AncestryPicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('searches by name', async () => {
    vi.useFakeTimers();
    const rendered = await render(AncestryPicker, { rows: [ELF, DWARF] });
    search(rendered, 'dwa');
    await vi.advanceTimersByTimeAsync(500);
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Dwarf']);
  });

  it('picks on click and commits', async () => {
    const rendered = await render(AncestryPicker, { rows: [ELF, DWARF] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('dwarf');
    expect(rendered.commits()).toBe(1);
  });

  it('picks the highlighted ancestry on Enter after the arrows move the highlight', async () => {
    const rendered = await render(AncestryPicker, { rows: [ELF, DWARF] });
    await press(rendered, 'ArrowDown');
    await press(rendered, 'Enter');
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.value()).toBe('dwarf');
    });
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(AncestryPicker, { rows: [ELF, DWARF], value: 'dwarf' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('dwarf');
  });

  it('renders only the rows in view of a long list', async () => {
    const rows = Array.from({ length: LONG_LIST }, (_entry, index) =>
      ancestryRow({ id: `ancestry-${index}`, name: `Ancestry ${index + 1}` }),
    );
    const { host } = await render(AncestryPicker, { rows });
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe(String(LONG_LIST + 1));
    expect(nameCells(host).length).toBeLessThan(LONG_LIST);
  });
});
