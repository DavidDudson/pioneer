import { Attribute } from '@pioneer/rules/sdk';
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
import { attributeRow } from '../testing/slot-picker-fixtures';
import { AttributePicker } from './attribute-picker.component';

const MODIFIER_HEADER = 1;

const STRENGTH = attributeRow({ id: Attribute.Strength, name: 'Strength', modifier: 4, boosted: 5 });
const DEXTERITY = attributeRow({ id: Attribute.Dexterity, name: 'Dexterity', modifier: 0, boosted: 1 });
const LOCKED = attributeRow({
  id: Attribute.Wisdom,
  name: 'Wisdom',
  modifier: -1,
  boosted: 0,
  disabledReason: 'Boosted already at this level',
});

describe(AttributePicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has a column for the modifier and the modifier with the boost', async () => {
    const { host } = await render(AttributePicker, { rows: [STRENGTH, DEXTERITY] });
    expect(headers(host)).toStrictEqual(['Name', 'Modifier', 'With boost']);
  });

  it('shows the modifier now and with the boost', async () => {
    const { host } = await render(AttributePicker, { rows: [STRENGTH, DEXTERITY] });
    expect(['+4', '+5'].filter((fact) => !rowText(host, 0).includes(fact))).toStrictEqual([]);
    expect(['0', '+1'].filter((fact) => !rowText(host, 1).includes(fact))).toStrictEqual([]);
  });

  it('sorts by modifier, ascending', async () => {
    const rendered = await render(AttributePicker, { rows: [STRENGTH, DEXTERITY] });
    sortButton(rendered.host, MODIFIER_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Dexterity', 'Strength']);
  });

  it('says why an attribute cannot be picked', async () => {
    const { host } = await render(AttributePicker, { rows: [STRENGTH, LOCKED] });
    expect(rowText(host, 1)).toContain('Boosted already at this level');
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(AttributePicker, { rows: [], loading: true });
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when no attribute is on offer', async () => {
    const { host } = await render(AttributePicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('picks on click and commits the attribute', async () => {
    const rendered = await render(AttributePicker, { rows: [STRENGTH, DEXTERITY] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('dex');
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(AttributePicker, { rows: [STRENGTH, DEXTERITY], value: 'dex' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('dex');
  });
});
