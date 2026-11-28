import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { FilterBar } from './filter-bar.component';
import { FilterKind, FilterOperator, isComplete, operatorsFor, valueText } from './filter-bar.types';
import type { FilterCondition, FilterField } from './filter-bar.types';

const RARITY: FilterField = {
  id: 'rarity',
  label: 'Rarity',
  kind: FilterKind.Set,
  options: [
    { value: 'common', label: 'Common', count: 12 },
    { value: 'rare', label: 'Rare', count: 3 },
    { value: 'unique', label: 'Unique' },
  ],
};

const TRAITS: FilterField = {
  id: 'trait',
  label: 'Trait',
  kind: FilterKind.Set,
  options: ['Acid', 'Air', 'Cold', 'Earth', 'Fire', 'Mental', 'Poison', 'Sonic', 'Water'].map((label) => ({
    value: label.toLowerCase(),
    label,
    count: label.length,
  })),
};

const FIELDS: ReadonlyArray<FilterField> = [
  RARITY,
  TRAITS,
  { id: 'name', label: 'Name', kind: FilterKind.Text },
  { id: 'released', label: 'Released', kind: FilterKind.Date },
  { id: 'level', label: 'Level', kind: FilterKind.Range },
  {
    id: 'consumable',
    label: 'Consumable',
    kind: FilterKind.Flag,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
];

interface Rendered {
  readonly fixture: ComponentFixture<FilterBar>;
  readonly host: HTMLElement;
  /** The value, as the last change left it. */
  readonly value: () => ReadonlyArray<FilterCondition>;
}

async function render(value: ReadonlyArray<FilterCondition> = []): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(FilterBar);
  fixture.componentRef.setInput('fields', FIELDS);
  fixture.componentRef.setInput('value', value);
  await fixture.whenStable();

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return { fixture, host: fixture.nativeElement as HTMLElement, value: () => fixture.componentInstance.value() };
}

function button(host: HTMLElement, name: string | RegExp): HTMLButtonElement {
  const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => {
    const text = (candidate.getAttribute('aria-label') ?? candidate.textContent).trim();

    return name instanceof RegExp ? name.test(text) : text === name;
  });

  if (found === undefined) {
    throw new Error(`Expected a button named ${String(name)}`);
  }

  return found;
}

async function press(rendered: Rendered, name: string | RegExp): Promise<void> {
  button(rendered.host, name).click();
  await rendered.fixture.whenStable();
}

async function type(rendered: Rendered, label: string, text: string): Promise<void> {
  const input = rendered.host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);

  if (input === null) {
    throw new Error(`Expected a ${label} box`);
  }

  input.value = text;
  input.dispatchEvent(new Event('input'));
  await rendered.fixture.whenStable();
}

function chips(host: HTMLElement): Array<string> {
  return [...host.querySelectorAll('button')]
    .values()
    .map((candidate) => candidate.getAttribute('aria-label') ?? '')
    .filter((label) => label.startsWith('Edit filter'))
    .map((label) => label.replace('Edit filter: ', ''))
    .toArray();
}

function echo(key: string): string {
  return key;
}

const RARE: FilterCondition = { field: 'rarity', operator: FilterOperator.Is, values: ['rare'] };
const LEVELS: FilterCondition = { field: 'level', operator: FilterOperator.Between, values: ['3', '5'] };

describe(FilterBar, () => {
  it('shows each filter as a chip reading field, operator and values', async () => {
    const { host } = await render([RARE, LEVELS]);
    expect(chips(host)).toStrictEqual(['Rarity is Rare', 'Level is between 3 to 5']);
  });

  it('has only the Add filter button when nothing is set', async () => {
    const { host } = await render();
    expect(chips(host)).toStrictEqual([]);
    expect(() => button(host, 'Clear all')).toThrow('Expected a button named Clear all');
    expect(host.querySelector('fr-filter-editor')).toBeNull();
  });

  it('adds a set filter as its value is picked, with no Apply', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    await press(rendered, 'is not');
    expect(rendered.value()).toStrictEqual([]);
    await press(rendered, 'Rare (3)');
    expect(rendered.value()).toStrictEqual([{ field: 'rarity', operator: 'isNot', values: ['rare'] }]);
    expect(() => button(rendered.host, 'Apply')).toThrow('Expected a button named Apply');
  });

  it('keeps the panel open on the filter just added, and closes it on Done', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    await press(rendered, 'Common (12)');
    expect(rendered.host.querySelector('fr-filter-editor')).not.toBeNull();
    await press(rendered, 'is any of');
    await press(rendered, 'Rare (3)');
    expect(rendered.value()).toStrictEqual([{ field: 'rarity', operator: 'isAnyOf', values: ['common', 'rare'] }]);
    await press(rendered, 'Done');
    expect(rendered.host.querySelector('fr-filter-editor')).toBeNull();
    expect(rendered.value()).toHaveLength(1);
  });

  it('defaults to the first operator of the field', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    await press(rendered, 'Common (12)');
    expect(rendered.value()).toStrictEqual([{ field: 'rarity', operator: 'is', values: ['common'] }]);
  });

  it('keeps one value for is, and several for is any of', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    await press(rendered, 'Common (12)');
    await press(rendered, 'Rare (3)');
    expect(rendered.value()[0]?.values).toStrictEqual(['rare']);
    await press(rendered, 'is any of');
    await press(rendered, 'Common (12)');
    expect(rendered.value()[0]).toStrictEqual({ field: 'rarity', operator: 'isAnyOf', values: ['rare', 'common'] });
  });

  it('adds a range filter with an open end', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Level');
    await press(rendered, 'is between');
    await type(rendered, 'Minimum', '3');
    expect(rendered.value()).toStrictEqual([{ field: 'level', operator: 'between', values: ['3', ''] }]);
    expect(chips(rendered.host)).toStrictEqual(['Level is between from 3']);
  });

  it('adds a flag filter from a segmented yes or no', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Consumable');
    await press(rendered, 'Yes');
    expect(rendered.value()).toStrictEqual([{ field: 'consumable', operator: 'is', values: ['yes'] }]);
  });

  it('adds a date filter from date boxes', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Released');
    await press(rendered, 'is between');
    await type(rendered, 'Minimum', '2026-01-02');
    await type(rendered, 'Maximum', '2026-03-04');
    expect(rendered.value()).toStrictEqual([
      { field: 'released', operator: 'between', values: ['2026-01-02', '2026-03-04'] },
    ]);
  });

  it('adds a text filter once the typing settles', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Name');
    await type(rendered, 'Name', 'kyra');
    await vi.waitFor(() => {
      expect(rendered.value()).toStrictEqual([{ field: 'name', operator: 'is', values: ['kyra'] }]);
    });
  });

  it('shows up to 8 options as a toggle group and more as a searchable list', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    expect(rendered.host.querySelector('fr-toggle-group')).not.toBeNull();
    expect(rendered.host.querySelector('fr-combobox')).toBeNull();
    await press(rendered, 'Trait');
    expect(rendered.host.querySelector('fr-toggle-group')).toBeNull();
    expect(rendered.host.querySelector('fr-combobox')).not.toBeNull();
  });

  it('shows no filter until the panel has a value', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    expect(rendered.value()).toStrictEqual([]);
    await press(rendered, 'Common (12)');
    expect(rendered.value()).toHaveLength(1);
  });

  it('changes a filter in place as its values change, starting from its values', async () => {
    const rendered = await render([RARE, LEVELS]);
    await press(rendered, 'Edit filter: Rarity is Rare');
    expect(button(rendered.host, 'Rare (3)').getAttribute('aria-pressed')).toBe('true');
    await press(rendered, 'Common (12)');
    expect(rendered.value()).toStrictEqual([{ field: 'rarity', operator: 'is', values: ['common'] }, LEVELS]);
  });

  it('drops a filter whose values were all cleared when the panel is closed', async () => {
    const rendered = await render([RARE, LEVELS]);
    await press(rendered, 'Edit filter: Rarity is Rare');
    await press(rendered, 'Rare (3)');
    expect(rendered.value()).toStrictEqual([RARE, LEVELS]);
    await press(rendered, 'Done');
    expect(rendered.value()).toStrictEqual([LEVELS]);
  });

  it('removes one filter, or all of them', async () => {
    const rendered = await render([RARE, LEVELS]);
    await press(rendered, 'Remove filter: Rarity is Rare');
    expect(rendered.value()).toStrictEqual([LEVELS]);
    await press(rendered, 'Clear all');
    expect(rendered.value()).toStrictEqual([]);
  });

  it('closes the panel on Done without changing anything', async () => {
    const rendered = await render([RARE]);
    await press(rendered, 'Add filter');
    await press(rendered, 'Done');
    expect(rendered.host.querySelector('fr-filter-editor')).toBeNull();
    expect(rendered.value()).toStrictEqual([RARE]);
  });
});

describe('filter bar types', () => {
  it('offers each kind its operators, the default first', () => {
    expect(operatorsFor(FilterKind.Set)).toStrictEqual(['is', 'isNot', 'isAnyOf']);
    expect(operatorsFor(FilterKind.Flag)).toStrictEqual(['is', 'isNot']);
    expect(operatorsFor(FilterKind.Range)).toStrictEqual(['is', 'between']);
    expect(operatorsFor(FilterKind.Text)).toStrictEqual(['is', 'isNot']);
    expect(operatorsFor(FilterKind.Date)).toStrictEqual(['is', 'between']);
  });

  it('calls a filter complete once it has what its operator needs', () => {
    expect(isComplete({ field: 'a', operator: FilterOperator.Is, values: [] })).toBe(false);
    expect(isComplete({ field: 'a', operator: FilterOperator.Is, values: ['x'] })).toBe(true);
    expect(isComplete({ field: 'a', operator: FilterOperator.IsAnyOf, values: [] })).toBe(false);
    expect(isComplete({ field: 'a', operator: FilterOperator.Between, values: ['', ''] })).toBe(false);
    expect(isComplete({ field: 'a', operator: FilterOperator.Between, values: ['', '4'] })).toBe(true);
  });

  it('reads a date span like a range', () => {
    const released: FilterField = { id: 'released', label: 'Released', kind: FilterKind.Date };

    const condition: FilterCondition = {
      field: 'released',
      operator: FilterOperator.Between,
      values: ['2026-01-02', ''],
    };

    expect(valueText(released, condition, echo)).toBe('frontier.filterBar.range.from');
  });

  it('reads option labels, falling back to the value', () => {
    const condition: FilterCondition = { field: 'rarity', operator: FilterOperator.IsAnyOf, values: ['common', 'x'] };
    expect(valueText(RARITY, condition, echo)).toBe('Common, x');
  });
});
