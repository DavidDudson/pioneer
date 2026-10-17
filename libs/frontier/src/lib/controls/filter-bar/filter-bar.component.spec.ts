import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

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

const FIELDS: readonly FilterField[] = [
  RARITY,
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
  readonly value: () => readonly FilterCondition[];
}

async function render(value: readonly FilterCondition[] = []): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(FilterBar);
  fixture.componentRef.setInput('fields', FIELDS);
  fixture.componentRef.setInput('value', value);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement, value: () => fixture.componentInstance.value() };
}

function button(host: HTMLElement, name: string | RegExp): HTMLButtonElement {
  const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => {
    const text = (candidate.getAttribute('aria-label') ?? candidate.textContent).trim();
    return typeof name === 'string' ? text === name : name.test(text);
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

function chips(host: HTMLElement): string[] {
  return [...host.querySelectorAll('button')]
    .map((candidate) => candidate.getAttribute('aria-label') ?? '')
    .filter((label) => label.startsWith('Edit filter'))
    .map((label) => label.replace('Edit filter: ', ''));
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

  it('adds a set filter: field, operator, value, apply', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    await press(rendered, 'is not');
    await press(rendered, 'Rare (3)');
    await press(rendered, 'Apply');
    expect(rendered.value()).toStrictEqual([{ field: 'rarity', operator: 'isNot', values: ['rare'] }]);
    expect(rendered.host.querySelector('fr-filter-editor')).toBeNull();
  });

  it('defaults to the first operator of the field', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    await press(rendered, 'Common (12)');
    await press(rendered, 'Apply');
    expect(rendered.value()).toStrictEqual([{ field: 'rarity', operator: 'is', values: ['common'] }]);
  });

  it('keeps one value for is, and several for is any of', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    await press(rendered, 'Common (12)');
    await press(rendered, 'Rare (3)');
    await press(rendered, 'Apply');
    expect(rendered.value()[0]?.values).toStrictEqual(['rare']);

    await press(rendered, 'Add filter');
    await press(rendered, 'Rarity');
    await press(rendered, 'is any of');
    await press(rendered, 'Common (12)');
    await press(rendered, 'Rare (3)');
    await press(rendered, 'Apply');
    expect(rendered.value()[1]).toStrictEqual({ field: 'rarity', operator: 'isAnyOf', values: ['common', 'rare'] });
  });

  it('adds a range filter with an open end', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Level');
    await press(rendered, 'is between');
    await type(rendered, 'Minimum', '3');
    await press(rendered, 'Apply');
    expect(rendered.value()).toStrictEqual([{ field: 'level', operator: 'between', values: ['3', ''] }]);
    expect(chips(rendered.host)).toStrictEqual(['Level is between from 3']);
  });

  it('adds a flag filter', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    await press(rendered, 'Consumable');
    await press(rendered, 'Yes');
    await press(rendered, 'Apply');
    expect(rendered.value()).toStrictEqual([{ field: 'consumable', operator: 'is', values: ['yes'] }]);
  });

  it('will not apply a filter with no value', async () => {
    const rendered = await render();
    await press(rendered, 'Add filter');
    expect(button(rendered.host, 'Apply').disabled).toBe(true);
    await press(rendered, 'Rarity');
    expect(button(rendered.host, 'Apply').disabled).toBe(true);
    await press(rendered, 'Common (12)');
    expect(button(rendered.host, 'Apply').disabled).toBe(false);
  });

  it('changes a filter in place, starting from its values', async () => {
    const rendered = await render([RARE, LEVELS]);
    await press(rendered, 'Edit filter: Rarity is Rare');
    expect(button(rendered.host, 'Rare (3)').getAttribute('aria-pressed')).toBe('true');
    await press(rendered, 'Common (12)');
    await press(rendered, 'Apply');
    expect(rendered.value()).toStrictEqual([{ field: 'rarity', operator: 'is', values: ['common'] }, LEVELS]);
  });

  it('removes one filter, or all of them', async () => {
    const rendered = await render([RARE, LEVELS]);
    await press(rendered, 'Remove filter: Rarity is Rare');
    expect(rendered.value()).toStrictEqual([LEVELS]);
    await press(rendered, 'Clear all');
    expect(rendered.value()).toStrictEqual([]);
  });

  it('closes the panel on cancel without changing anything', async () => {
    const rendered = await render([RARE]);
    await press(rendered, 'Add filter');
    await press(rendered, 'Cancel');
    expect(rendered.host.querySelector('fr-filter-editor')).toBeNull();
    expect(rendered.value()).toStrictEqual([RARE]);
  });
});

describe('filter bar types', () => {
  it('offers each kind its operators, the default first', () => {
    expect(operatorsFor(FilterKind.Set)).toStrictEqual(['is', 'isNot', 'isAnyOf']);
    expect(operatorsFor(FilterKind.Flag)).toStrictEqual(['is', 'isNot']);
    expect(operatorsFor(FilterKind.Range)).toStrictEqual(['is', 'between']);
  });

  it('calls a filter complete once it has what its operator needs', () => {
    expect(isComplete({ field: 'a', operator: FilterOperator.Is, values: [] })).toBe(false);
    expect(isComplete({ field: 'a', operator: FilterOperator.Is, values: ['x'] })).toBe(true);
    expect(isComplete({ field: 'a', operator: FilterOperator.IsAnyOf, values: [] })).toBe(false);
    expect(isComplete({ field: 'a', operator: FilterOperator.Between, values: ['', ''] })).toBe(false);
    expect(isComplete({ field: 'a', operator: FilterOperator.Between, values: ['', '4'] })).toBe(true);
  });

  it('reads option labels, falling back to the value', () => {
    const condition: FilterCondition = { field: 'rarity', operator: FilterOperator.IsAnyOf, values: ['common', 'x'] };
    expect(valueText(RARITY, condition, echo)).toBe('Common, x');
  });
});
