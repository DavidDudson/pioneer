import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FIGHTER_VITALS } from '../testing/vitals-fixtures';
import type { Vital } from './vital';
import { VitalsView } from './vitals.component';

async function render(vitals: readonly Vital[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(VitalsView);
  fixture.componentRef.setInput('vitals', vitals);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected the vitals to render the element');
  }
  return value;
}

function textOf(element: Element | null | undefined): string | undefined {
  return element?.textContent.replaceAll(/\s+/gu, ' ').trim();
}

describe(VitalsView, () => {
  it('shows Armor Class as a row laid out as a skill, with its total and its rank read out by name', async () => {
    const host = await render(FIGHTER_VITALS);
    const row = present(host.querySelector('fr-surface fr-list-item'));
    expect(textOf(row)).toContain('Armor Class');
    expect(textOf(row)).toContain('20');
    expect(textOf(row.querySelector('pio-proficiency-rank .sr-only'))).toBe('Trained');
    expect(row.querySelector('[frDisclosureSummary]')).toBeNull();
  });

  it('puts the saves together in one card, a row each laid out as a skill, with no card of their own apiece', async () => {
    const host = await render(FIGHTER_VITALS);
    expect(host.querySelectorAll('fr-surface')).toHaveLength(2);
    const card = present(host.querySelectorAll('fr-surface').item(1));
    const rows = [...card.querySelectorAll('fr-list-item')];
    expect(rows.map((row) => textOf(row))).toStrictEqual([
      expect.stringContaining('Fortitude'),
      expect.stringContaining('Will'),
    ]);
    expect(card.querySelector('[frDisclosureSummary]')).toBeNull();
    expect(textOf(present(rows[0]).querySelector('pio-proficiency-rank .sr-only'))).toBe('Expert');
  });

  it('shows a placeholder tile per vital while they load', async () => {
    const host = await render(undefined);
    expect(host.querySelectorAll('fr-surface fr-skeleton')).toHaveLength(3);
  });
});
