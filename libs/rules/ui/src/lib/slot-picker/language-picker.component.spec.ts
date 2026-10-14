import { Rarity } from '@pioneer/rules/sdk';
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
import { languageRow } from '../testing/slot-picker-fixtures';
import { LanguagePicker } from './language-picker.component';

const RARITY_HEADER = 1;
const SCRIPT_HEADER = 2;

const COMMON = languageRow({ id: 'common', name: 'Common', known: true });
const DRACONIC = languageRow({ id: 'draconic', name: 'Draconic', rarity: Rarity.Uncommon });
const LOCKED = languageRow({ id: 'aklo', name: 'Aklo', rarity: Rarity.Rare, disabledReason: 'Needs a teacher' });

describe(LanguagePicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has a column for the rarity, the script, whether it is known and the source', async () => {
    const { host } = await render(LanguagePicker, { rows: [COMMON, DRACONIC] });
    expect(headers(host)).toStrictEqual(['Name', 'Rarity', 'Script', 'Known', 'Source']);
  });

  it('says whether the character knows each language', async () => {
    const { host } = await render(LanguagePicker, { rows: [COMMON, DRACONIC] });
    expect(rowText(host, 0)).toContain('Known');
    expect(rowText(host, 1)).toContain('Not known');
    expect(rowText(host, 1)).toContain('Uncommon');
  });

  it('sorts by rarity, ascending then descending', async () => {
    const rendered = await render(LanguagePicker, { rows: [DRACONIC, COMMON] });
    sortButton(rendered.host, RARITY_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Common', 'Draconic']);
    sortButton(rendered.host, RARITY_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Draconic', 'Common']);
  });

  it('shows the script of a language that has one', async () => {
    const { host } = await render(LanguagePicker, {
      rows: [COMMON, languageRow({ id: 'draconic', name: 'Draconic', script: 'Iokharic' })],
    });
    expect(rowText(host, 0)).not.toContain('Iokharic');
    expect(rowText(host, 1)).toContain('Iokharic');
  });

  it('sorts by script, those without one first', async () => {
    const rendered = await render(LanguagePicker, {
      rows: [languageRow({ id: 'draconic', name: 'Draconic', script: 'Iokharic' }), COMMON],
    });
    sortButton(rendered.host, SCRIPT_HEADER).click();
    await settle(rendered.fixture);
    expect(rowLabels(rendered.host)).toStrictEqual(['Common', 'Draconic']);
  });

  it('says why a language cannot be picked', async () => {
    const { host } = await render(LanguagePicker, { rows: [COMMON, LOCKED] });
    expect(rowText(host, 1)).toContain('Needs a teacher');
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(LanguagePicker, { rows: [], loading: true });
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when no language is on offer', async () => {
    const { host } = await render(LanguagePicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('picks on click and commits the language', async () => {
    const rendered = await render(LanguagePicker, { rows: [COMMON, DRACONIC] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('draconic');
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(LanguagePicker, { rows: [COMMON, DRACONIC], value: 'draconic' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('draconic');
  });
});
