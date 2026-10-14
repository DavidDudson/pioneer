import { Attribute } from '@pioneer/rules/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { keyAttributeRow } from '../testing/class-picker-fixtures';
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
import { KeyAttributePicker } from './key-attribute-picker.component';

const MODIFIER_HEADER = 1;

const STRENGTH = keyAttributeRow(Attribute.Strength, 'Strength', 3);
const DEXTERITY = keyAttributeRow(Attribute.Dexterity, 'Dexterity', -1);

describe(KeyAttributePicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has a column for the modifier and the score', async () => {
    const { host } = await render(KeyAttributePicker, { rows: [STRENGTH, DEXTERITY] });
    expect(headers(host)).toStrictEqual(['Name', 'Modifier', 'Score']);
  });

  it('shows the character is standing with its sign', async () => {
    const { host } = await render(KeyAttributePicker, { rows: [STRENGTH, DEXTERITY] });
    expect(rowText(host, 0)).toContain('+3');
    expect(rowText(host, 0)).toContain('16');
    expect(rowText(host, 1)).toContain('-1');
    expect(rowText(host, 1)).toContain('8');
  });

  it('sorts by modifier, ascending then descending', async () => {
    const rendered = await render(KeyAttributePicker, { rows: [STRENGTH, DEXTERITY] });
    sortButton(rendered.host, MODIFIER_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Dexterity', 'Strength']);
    sortButton(rendered.host, MODIFIER_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Strength', 'Dexterity']);
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(KeyAttributePicker, { rows: [], loading: true });
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when the class allows no choice', async () => {
    const { host } = await render(KeyAttributePicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('picks on click and commits the attribute', async () => {
    const rendered = await render(KeyAttributePicker, { rows: [STRENGTH, DEXTERITY] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('dex');
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(KeyAttributePicker, { rows: [STRENGTH, DEXTERITY], value: 'dex' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('dex');
  });
});
