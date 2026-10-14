import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { heritageRow } from '../testing/origin-picker-fixtures';
import {
  headers,
  nameCellAt,
  nameCells,
  press,
  render,
  rowText,
  settle,
  stubLayout,
  textOf,
} from '../testing/origin-picker-testing';
import { HeritagePicker } from './heritage-picker.component';

const WOODLAND = heritageRow({ id: 'woodland', name: 'Woodland Elf' });
const CHANGELING = heritageRow({ id: 'changeling', name: 'Changeling', ancestry: undefined, grants: [] });
const WRONG = heritageRow({ id: 'wrong', name: 'Cavern Elf', disabledReason: 'Not a heritage of your ancestry' });

describe(HeritagePicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has a column for its ancestry, what it does and what it grants', async () => {
    const { host } = await render(HeritagePicker, { rows: [WOODLAND] });
    expect(headers(host)).toStrictEqual(['Name', 'Ancestry', 'Summary', 'Grants', 'Source']);
    expect(rowText(host, 0)).toContain('Cold resistance');
    expect(rowText(host, 0)).toContain('You resist the cold');
  });

  it('says a heritage any ancestry can take is versatile', async () => {
    const { host } = await render(HeritagePicker, { rows: [CHANGELING] });
    expect(rowText(host, 0)).toContain('Versatile');
  });

  it('disables a heritage that cannot be picked and says why', async () => {
    const { host, fixture } = await render(HeritagePicker, { rows: [WOODLAND, WRONG] });
    const locked = nameCellAt(host, 1);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(textOf(locked)).toContain('Not a heritage of your ancestry');
    locked.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(HeritagePicker, { rows: [], loading: true });
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when the ancestry has no heritage', async () => {
    const { host } = await render(HeritagePicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('picks on click and commits', async () => {
    const rendered = await render(HeritagePicker, { rows: [WOODLAND, CHANGELING] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('changeling');
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(HeritagePicker, { rows: [WOODLAND, CHANGELING], value: 'woodland' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('woodland');
  });
});
