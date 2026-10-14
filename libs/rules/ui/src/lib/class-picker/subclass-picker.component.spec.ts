import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { subclassRow } from '../testing/class-picker-fixtures';
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
import { SubclassPicker } from './subclass-picker.component';

const GRAMMATICA = subclassRow({ id: 'grammatica', name: 'Ars Grammatica' });
const BATTLE = subclassRow({ id: 'battle', name: 'Battle Magic', note: 'Trains Athletics again' });
const LOCKED = subclassRow({ id: 'locked', name: 'Thesis', disabledReason: 'Needs a higher level' });

describe(SubclassPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has a column for what a subclass grants', async () => {
    const { host } = await render(SubclassPicker, { rows: [GRAMMATICA] });
    expect(headers(host)).toStrictEqual(['Name', 'Summary', 'Notes', 'Source']);
    expect(rowText(host, 0)).toContain('You study the arcane');
  });

  it('says what picking a subclass would train again', async () => {
    const { host } = await render(SubclassPicker, { rows: [GRAMMATICA, BATTLE] });
    expect(rowText(host, 1)).toContain('Trains Athletics again');
  });

  it('disables a subclass that cannot be picked and says why', async () => {
    const { host, fixture } = await render(SubclassPicker, { rows: [GRAMMATICA, LOCKED] });
    const locked = nameCellAt(host, 1);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(textOf(locked)).toContain('Needs a higher level');
    locked.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  it('shows skeleton rows while the content loads', async () => {
    const { host } = await render(SubclassPicker, { rows: [], loading: true });
    expect(host.querySelectorAll('fr-skeleton')).not.toHaveLength(0);
  });

  it('shows the empty message when the class offers no subclass', async () => {
    const { host } = await render(SubclassPicker, { rows: [] });
    expect(nameCells(host)).toHaveLength(0);
    expect(host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('picks on click and commits', async () => {
    const rendered = await render(SubclassPicker, { rows: [GRAMMATICA, BATTLE] });
    nameCellAt(rendered.host, 1).click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('battle');
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(SubclassPicker, { rows: [GRAMMATICA, BATTLE], value: 'battle' });
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('battle');
  });
});
