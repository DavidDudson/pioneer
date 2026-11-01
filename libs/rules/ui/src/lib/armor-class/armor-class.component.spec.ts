import { TestBed } from '@angular/core/testing';
import { Proficiency, StatisticKind } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { ADJUSTED_WILL, PINNED_AC } from '../testing/override-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FIGHTER_VITALS, UNARMORED_VITALS } from '../testing/vitals-fixtures';
import type { Vital } from '../vitals/vital';
import { ArmorClass } from './armor-class.component';

async function render(vital: Vital | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(ArmorClass);
  fixture.componentRef.setInput('vital', vital);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected the block to render the element');
  }
  return value;
}

function textOf(element: Element | null | undefined): string | undefined {
  return element?.textContent.replaceAll(/\s+/gu, ' ').trim();
}

describe(ArmorClass, () => {
  it('shows nothing while the vital loads', async () => {
    const host = await render(undefined);
    expect(host.querySelector('fr-stack')).toBeNull();
  });

  it('shows its name, its total large and its rank read out by name', async () => {
    const host = await render(FIGHTER_VITALS[0]);
    expect(textOf(host)).toContain('Armor Class');
    const total = present(host.querySelector('fr-text[variant="display"]'));
    const rank = present(host.querySelector('pio-proficiency-rank .sr-only'));
    expect(textOf(total)).toBe('20');
    expect(textOf(rank)).toBe('Trained');
  });

  it('has the rank badge note the armour that sets it', async () => {
    const host = await render(FIGHTER_VITALS[0]);
    present(host.querySelector('pio-proficiency-badge button')).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Breastplate');
    });
  });

  it('says unarmored out of armour', async () => {
    const host = await render(UNARMORED_VITALS[0]);
    present(host.querySelector('pio-proficiency-badge button')).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Unarmored');
    });
  });

  it('marks a total a set override pinned, with the computed value beside it', async () => {
    const vital: Vital = {
      statistic: { name: 'Armor Class', kind: StatisticKind.Dc, result: PINNED_AC },
      rank: Proficiency.Trained,
    };
    const host = await render(vital);
    expect(textOf(host)).toContain('22Pinnedcomputed 20');
  });

  it('marks a total a user adjusted by hand', async () => {
    const vital: Vital = {
      statistic: { name: 'Armor Class', kind: StatisticKind.Dc, result: ADJUSTED_WILL },
      rank: Proficiency.Trained,
    };
    const host = await render(vital);
    expect(textOf(host)).toContain('Adjusted by hand');
  });

  it('marks neither on an untouched total', async () => {
    const host = await render(FIGHTER_VITALS[0]);
    expect(textOf(host)).not.toMatch(/Pinned|Adjusted/u);
  });
});
