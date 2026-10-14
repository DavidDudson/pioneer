import { HitPoints } from '@pioneer/rules/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { classRow } from '../testing/class-picker-fixtures';
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
import { ClassPicker } from './class-picker.component';

const LONG_LIST = 300;
const HIT_POINTS_HEADER = 2;

const WIZARD = classRow({ id: 'wizard', name: 'Wizard' });
const FIGHTER = classRow({
  id: 'fighter',
  name: 'Fighter',
  keyAttribute: ['str', 'dex'],
  hitPoints: HitPoints.parse(10),
  skills: ['Athletics'],
  additionalSkills: 3,
  traditions: [],
  proficiencies: ['Perception: Expert'],
  note: 'Trains Athletics again',
});
const LOCKED = classRow({ id: 'locked', name: 'Kineticist', disabledReason: 'Not in the loaded packs' });

describe(ClassPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens straight to the table, with a column for each fact to choose by', async () => {
    const { host } = await render(ClassPicker, { rows: [WIZARD, FIGHTER] });
    expect(headers(host)).toStrictEqual([
      'Name',
      'Key attribute',
      'Hit points per level',
      'Trained skills',
      'Tradition',
      'Starting ranks',
      'Notes',
      'Source',
    ]);
  });

  it('shows what a class is in rich cells', async () => {
    const { host } = await render(ClassPicker, { rows: [WIZARD, FIGHTER] });
    const text = rowText(host, 1);
    const facts = ['Strength', 'Dexterity', '10 HP', 'Athletics', '+3 of your choice', 'Perception: Expert'];
    expect(facts.filter((fact) => !text.includes(fact))).toStrictEqual([]);
  });

  it('says what picking a class would train again', async () => {
    const { host } = await render(ClassPicker, { rows: [WIZARD, FIGHTER] });
    expect(rowText(host, 1)).toContain('Trains Athletics again');
  });

  it('sorts by hit points, ascending then descending', async () => {
    const rendered = await render(ClassPicker, { rows: [FIGHTER, WIZARD] });
    sortButton(rendered.host, HIT_POINTS_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Wizard', 'Fighter']);
    sortButton(rendered.host, HIT_POINTS_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Fighter', 'Wizard']);
  });

  it('disables a class that cannot be picked and says why', async () => {
    const { host, fixture } = await render(ClassPicker, { rows: [WIZARD, LOCKED] });
    const locked = nameCellAt(host, 1);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(textOf(locked)).toContain('Not in the loaded packs');
    locked.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(ClassPicker, { rows: [], loading: true });
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-busy')).toBe('true');
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when the slot offers no classes', async () => {
    const { host } = await render(ClassPicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('searches by name', async () => {
    vi.useFakeTimers();
    const rendered = await render(ClassPicker, { rows: [WIZARD, FIGHTER] });
    search(rendered, 'fig');
    await vi.advanceTimersByTimeAsync(500);
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Fighter']);
  });

  it('picks on click and commits', async () => {
    const rendered = await render(ClassPicker, { rows: [WIZARD, FIGHTER] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('fighter');
    expect(rendered.commits()).toBe(1);
  });

  it('picks the highlighted class on Enter after the arrows move the highlight', async () => {
    const rendered = await render(ClassPicker, { rows: [WIZARD, FIGHTER] });
    await press(rendered, 'ArrowDown');
    await press(rendered, 'Enter');
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.value()).toBe('fighter');
    });
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(ClassPicker, { rows: [WIZARD, FIGHTER], value: 'fighter' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('fighter');
  });

  it('renders only the rows in view of a long list', async () => {
    const rows = Array.from({ length: LONG_LIST }, (_entry, index) =>
      classRow({ id: `class-${index}`, name: `Class ${index + 1}` }),
    );
    const { host } = await render(ClassPicker, { rows });
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe(String(LONG_LIST + 1));
    expect(nameCells(host).length).toBeLessThan(LONG_LIST);
  });
});
