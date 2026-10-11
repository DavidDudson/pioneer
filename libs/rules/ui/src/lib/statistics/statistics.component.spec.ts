import { TestBed } from '@angular/core/testing';
import { StatisticKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { CYCLE, ENTRY_NAMES, FIGHTER_STATISTICS } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { NamedStatistic } from './statistics.component';
import { StatisticsView } from './statistics.component';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

async function render(statistics: readonly NamedStatistic[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(StatisticsView);
  fixture.componentRef.setInput('statistics', statistics);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** A failure's badge and error, joined with " | " so the parts stay apart. */
function partsOf(element: Element): string {
  return [...element.querySelectorAll('fr-text, fr-badge')]
    .filter((part) => part.querySelector('fr-text, fr-badge') === null)
    .map((part) => textOf(part))
    .join(' | ');
}

/** Each row's term and the text of its value: a disclosure's summary, or a failure's badge and error. */
function rows(host: HTMLElement): string[] {
  return [...host.querySelectorAll('fr-description-item')].map((item) => {
    const term = textOf(item.querySelector('[role="term"]') ?? item);
    const summary = item.querySelector('summary');
    const value = summary === null ? partsOf(item.querySelector('[role="definition"]') ?? item) : textOf(summary);
    return `${term}: ${value}`;
  });
}

describe(StatisticsView, () => {
  it('names each statistic with its total, a check signed and a DC plain', async () => {
    const host = await render(FIGHTER_STATISTICS);

    expect(rows(host)).toStrictEqual(['Armor Class: 20', 'Fortitude: +10', 'Will: +6']);
  });

  it('expands a total in place to its breakdown', async () => {
    const host = await render(FIGHTER_STATISTICS);
    const ac = present(host.querySelector('details'));

    expect(ac.open).toBe(false);
    const breakdown = present(ac.querySelector('pio-breakdown'));
    expect(textOf(breakdown)).toContain('Breastplate');
  });

  it('marks a statistic the engine could not derive as failed, with why', async () => {
    const host = await render([{ name: 'Perception', kind: StatisticKind.Check, result: CYCLE }]);

    expect(rows(host)).toStrictEqual([
      'Perception: Failed | “@stat.save:will” at position 1 closes a loop: perception, save:will depend on one another.',
    ]);
    expect(host.querySelector('details')).toBeNull();
  });

  it('says so when there are no statistics', async () => {
    const host = await render([]);

    const empty = present(host.querySelector('fr-empty-state'));
    expect(textOf(empty)).toBe('No statistics.');
  });

  it('shows placeholder rows while loading', async () => {
    const host = await render(undefined);

    expect(host.querySelectorAll('fr-description-item')).toHaveLength(0);
    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(10);
  });
});
