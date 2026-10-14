import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { backgroundRow } from '../testing/origin-picker-fixtures';
import {
  headers,
  nameCellAt,
  nameCells,
  press,
  render,
  rowLabels,
  rowText,
  settle,
  stubLayout,
} from '../testing/origin-picker-testing';
import { BackgroundPicker } from './background-picker.component';

const SCHOLAR = backgroundRow({ id: 'scholar', name: 'Scholar' });
const BARKEEP = backgroundRow({
  id: 'barkeep',
  name: 'Barkeep',
  skills: ['Diplomacy'],
  lores: ['Alcohol Lore'],
  feats: ['Hobnobber'],
  note: 'Already trained in Diplomacy',
});
const HERMIT = backgroundRow({ id: 'hermit', name: 'Hermit', disabledReason: 'Not in the loaded packs' });

describe(BackgroundPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has a column for its boosts, the skill and Lore it trains and the feat it grants', async () => {
    const { host } = await render(BackgroundPicker, { rows: [SCHOLAR] });
    expect(headers(host)).toStrictEqual([
      'Name',
      'Attribute boosts',
      'Trained skill',
      'Lore',
      'Granted feat',
      'Notes',
      'Source',
    ]);
    const text = rowText(host, 0);
    expect(['Arcana', 'Academia Lore', 'Assurance'].filter((fact) => !text.includes(fact))).toStrictEqual([]);
  });

  it('says in a note when a background would train a skill again, and keeps it pickable', async () => {
    const rendered = await render(BackgroundPicker, { rows: [SCHOLAR, BARKEEP] });
    expect(rowText(rendered.host, 1)).toContain('Already trained in Diplomacy');
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('barkeep');
  });

  it('lists backgrounds and picks one on click', async () => {
    const rendered = await render(BackgroundPicker, { rows: [SCHOLAR, BARKEEP] });
    expect(rowLabels(rendered.host)).toStrictEqual(['Scholar', 'Barkeep']);
    nameCellAt(rendered.host, 0).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('scholar');
    expect(rendered.commits()).toBe(1);
  });

  it('disables a background that cannot be picked and says why', async () => {
    const { host, fixture } = await render(BackgroundPicker, { rows: [SCHOLAR, HERMIT] });
    const locked = nameCellAt(host, 1);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    locked.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(BackgroundPicker, { rows: [], loading: true });
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when no background is loaded', async () => {
    const { host } = await render(BackgroundPicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(BackgroundPicker, { rows: [SCHOLAR, BARKEEP], value: 'scholar' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('scholar');
  });
});
