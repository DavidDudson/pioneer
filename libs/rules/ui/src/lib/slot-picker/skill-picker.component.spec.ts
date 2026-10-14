import { Attribute, Proficiency } from '@pioneer/rules/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  headers,
  nameCellAt,
  nameCells,
  press,
  render,
  rowLabels,
  rowText,
  settle,
  sortButton,
  stubLayout,
} from '../testing/origin-picker-testing';
import { skillRow } from '../testing/slot-picker-fixtures';
import { SkillPicker } from './skill-picker.component';

const RANK_HEADER = 2;
const MODIFIER_HEADER = 3;

const ARCANA = skillRow({ id: 'arcana', name: 'Arcana' });
const ATHLETICS = skillRow({
  id: 'athletics',
  name: 'Athletics',
  attribute: Attribute.Strength,
  rank: Proficiency.Expert,
  modifier: -1,
});
const LOCKED = skillRow({ id: 'stealth', name: 'Stealth', disabledReason: 'Trained already' });

describe(SkillPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has a column for the attribute, the rank, the modifier and the armor penalty', async () => {
    const { host } = await render(SkillPicker, { rows: [ARCANA, ATHLETICS] });
    expect(headers(host)).toStrictEqual(['Name', 'Attribute', 'Rank', 'Modifier', 'Armor penalty']);
  });

  it('shows where the character stands in each skill', async () => {
    const { host } = await render(SkillPicker, { rows: [ARCANA, ATHLETICS] });
    expect(['Intelligence', 'Trained', '+5'].filter((fact) => !rowText(host, 0).includes(fact))).toStrictEqual([]);
    expect(['Strength', 'Expert', '-1'].filter((fact) => !rowText(host, 1).includes(fact))).toStrictEqual([]);
  });

  it('sorts by rank, ascending then descending', async () => {
    const rendered = await render(SkillPicker, { rows: [ATHLETICS, ARCANA] });
    sortButton(rendered.host, RANK_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Arcana', 'Athletics']);
    sortButton(rendered.host, RANK_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Athletics', 'Arcana']);
  });

  it('sorts by modifier, ascending', async () => {
    const rendered = await render(SkillPicker, { rows: [ARCANA, ATHLETICS] });
    sortButton(rendered.host, MODIFIER_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Athletics', 'Arcana']);
  });

  it('shows the penalty the worn armour gives a skill, and nothing for one it gives none', async () => {
    const { host } = await render(SkillPicker, {
      rows: [ARCANA, skillRow({ id: 'stealth', name: 'Stealth', armorPenalty: -2 })],
    });
    expect(rowText(host, 0)).not.toContain('-2');
    expect(rowText(host, 1)).toContain('-2');
  });

  it('says why a skill cannot be picked', async () => {
    const { host } = await render(SkillPicker, { rows: [ARCANA, LOCKED] });
    expect(rowText(host, 1)).toContain('Trained already');
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(SkillPicker, { rows: [], loading: true });
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when no skill is on offer', async () => {
    const { host } = await render(SkillPicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('picks on click and commits the skill', async () => {
    const rendered = await render(SkillPicker, { rows: [ARCANA, ATHLETICS] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('athletics');
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(SkillPicker, { rows: [ARCANA, ATHLETICS], value: 'athletics' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('athletics');
  });
});
