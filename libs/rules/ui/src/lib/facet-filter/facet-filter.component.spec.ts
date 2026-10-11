import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { CommonFacet, FacetValue, RangeBound, SelectionKind } from '@pioneer/rules/sdk';
import type { FilterState } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { SHOP_FACET_COUNTS } from '../testing/facet-filter-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FacetFilterView } from './facet-filter.component';

interface Rendered {
  readonly fixture: ComponentFixture<FacetFilterView>;
  readonly host: HTMLElement;
}

async function render(state: FilterState = new Map()): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(FacetFilterView);
  fixture.componentRef.setInput('counts', SHOP_FACET_COUNTS);
  fixture.componentRef.setInput('state', state);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

const summaries = (host: HTMLElement): string[] =>
  [...host.querySelectorAll('fr-disclosure summary')].map((summary) => summary.textContent.trim());

function chips(host: HTMLElement, facet: string): HTMLButtonElement[] {
  const group = host.querySelector(`[role="group"][aria-label="${facet}"]`);
  return [...(group?.querySelectorAll<HTMLButtonElement>('button[aria-pressed]') ?? [])];
}

function input(host: HTMLElement, label: string): HTMLInputElement {
  const found = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
  if (found === null) {
    throw new Error(`No input ${label}`);
  }
  return found;
}

async function type(rendered: Rendered, label: string, text: string): Promise<void> {
  const box = input(rendered.host, label);
  box.value = text;
  box.dispatchEvent(new Event('input'));
  await rendered.fixture.whenStable();
}

describe(FacetFilterView, () => {
  it('has a row per facet with values in the list, leaving out a facet with none', async () => {
    const { host } = await render();
    expect(summaries(host)).toStrictEqual([
      'Level',
      'Rarity',
      'Traits',
      'Book',
      'Item type',
      'Magical',
      'Weapon group',
    ]);
  });

  it('labels chips with their value and count: a closed set’s name, a book’s title, an open set’s value', async () => {
    const { host } = await render();
    const label = (facet: string): string[] => chips(host, facet).map((chip) => chip.textContent.trim());
    expect(label('Rarity')).toStrictEqual(['Common (21)', 'Uncommon (2)', 'Rare (1)']);
    expect(label('Book')).toStrictEqual(['Player Core (24)']);
    expect(label('Traits')).toStrictEqual(['magical (4)', 'versatile-p (3)', 'agile (2)']);
    expect(label('Magical')).toStrictEqual(['No (20)', 'Yes (4)']);
  });

  it('picks a value with a chip, keeping what a link excluded', async () => {
    const excluded: FilterState = new Map([
      [CommonFacet.Rarity, { kind: SelectionKind.Values, include: [], exclude: [FacetValue.parse('unique')] }],
    ]);
    const rendered = await render(excluded);
    const [, uncommon] = chips(rendered.host, 'Rarity');
    uncommon?.click();
    await rendered.fixture.whenStable();
    expect(rendered.fixture.componentInstance.state().get(CommonFacet.Rarity)).toStrictEqual({
      kind: SelectionKind.Values,
      include: [FacetValue.parse('uncommon')],
      exclude: [FacetValue.parse('unique')],
    });
    expect(summaries(rendered.host)[1]).toBe('Rarity: 1 picked');
  });

  it('bounds a range from a box, and an emptied box opens the bound again', async () => {
    const rendered = await render();
    await type(rendered, 'Highest Level', '2');
    expect(rendered.fixture.componentInstance.state().get(CommonFacet.Level)).toStrictEqual({
      kind: SelectionKind.Range,
      min: undefined,
      max: RangeBound.parse(2),
    });
    expect(summaries(rendered.host)[0]).toBe('Level: limited');
    await type(rendered, 'Highest Level', '');
    expect(rendered.fixture.componentInstance.state().has(CommonFacet.Level)).toBe(false);
  });

  it('shows a range’s bounds and the span of its values in the list', async () => {
    const level: FilterState = new Map([
      [CommonFacet.Level, { kind: SelectionKind.Range, min: RangeBound.parse(1), max: undefined }],
    ]);
    const { host } = await render(level);
    expect(input(host, 'Lowest Level').value).toBe('1');
    expect(input(host, 'Highest Level').value).toBe('');
    expect(input(host, 'Highest Level').placeholder).toBe('Any');
    expect(host.textContent).toContain('0 to 3 in this list');
  });
});
