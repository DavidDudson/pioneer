import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FIGHTER_VITALS, UNARMORED_VITALS } from '../testing/vitals-fixtures';
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

function textOf(element: Element | null | undefined): string | undefined {
  return element?.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** Each tile's summary, the rank read out, and the caption beside the rank. */
function tilesOf(host: HTMLElement): (string | undefined)[][] {
  return [...host.querySelectorAll('fr-surface')].map((tile) => [
    textOf(tile.querySelector('[frDisclosureSummary]')),
    textOf(tile.querySelector('pio-proficiency-rank .sr-only')),
    textOf(
      [...tile.querySelectorAll('fr-text')].find(
        (text) => text.closest('pio-statistics, pio-proficiency-rank') === null,
      ),
    ),
  ]);
}

describe(VitalsView, () => {
  it('shows each vital with its total, its rank read out by name, and what sets Armor Class', async () => {
    const host = await render(FIGHTER_VITALS);
    expect(tilesOf(host)).toStrictEqual([
      ['Armor Class 20', 'Trained', 'Breastplate'],
      ['Fortitude +10', 'Expert', undefined],
      ['Will +6', undefined, undefined],
    ]);
  });

  it('says Armor Class is unarmored when no armour sets it', async () => {
    const host = await render(UNARMORED_VITALS);
    expect(tilesOf(host)).toStrictEqual([['Armor Class 20', 'Trained', 'Unarmored']]);
  });

  it('shows a placeholder tile per vital while they load', async () => {
    const host = await render(undefined);
    expect(host.querySelectorAll('fr-surface fr-skeleton')).toHaveLength(5);
  });
});
