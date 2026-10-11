import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
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

async function render(statistics: readonly NamedStatistic[] | undefined): Promise<ComponentFixture<StatisticsView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(StatisticsView);
  fixture.componentRef.setInput('statistics', statistics);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture;
}

function hostOf(fixture: ComponentFixture<StatisticsView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** An item's texts and badges in order, joined with " | " so the parts stay apart. */
function partsOf(element: Element): string {
  return [...element.querySelectorAll('fr-text, fr-badge')]
    .filter((part) => part.querySelector('fr-text, fr-badge') === null)
    .map((part) => textOf(part))
    .join(' | ');
}

/** Each row as read: a disclosure's summary, which names what it opens, or a failure's parts. */
function rows(host: HTMLElement): string[] {
  const items = [...host.querySelectorAll('[role="listitem"]')].filter(
    (item) => item.closest('pio-breakdown') === null,
  );
  return items.map((item) => {
    const summary = item.querySelector('summary');
    return summary === null ? partsOf(item) : textOf(summary);
  });
}

describe(StatisticsView, () => {
  it('names each statistic in its summary with its total, a check signed and a DC plain', async () => {
    const host = hostOf(await render(FIGHTER_STATISTICS));

    expect(rows(host)).toStrictEqual(['Armor Class 20', 'Fortitude +10', 'Will +6']);
  });

  it('expands a total in place to its breakdown', async () => {
    const fixture = await render(FIGHTER_STATISTICS);
    const ac = present(hostOf(fixture).querySelector('details'));
    expect(ac.open).toBe(false);

    present(ac.querySelector('summary')).click();
    await fixture.whenStable();

    expect(ac.open).toBe(true);
    const breakdown = present(ac.querySelector('pio-breakdown'));
    expect(textOf(breakdown)).toContain('Breastplate counts instead.');
  });

  it('marks a statistic the engine could not derive as failed, with why', async () => {
    const host = hostOf(await render([{ name: 'Perception', kind: StatisticKind.Check, result: CYCLE }]));

    expect(rows(host)).toStrictEqual([
      'Perception | Failed | “@stat.save:will” at position 1 closes a loop: perception, save:will depend on one another.',
    ]);
    expect(host.querySelector('details')).toBeNull();
  });

  it('says so when there are no statistics', async () => {
    const host = hostOf(await render([]));

    const empty = present(host.querySelector('fr-empty-state'));
    expect(textOf(empty)).toBe('No statistics.');
  });

  it('shows a placeholder row per statistic while loading', async () => {
    const host = hostOf(await render(undefined));

    expect(host.querySelectorAll('details')).toHaveLength(0);
    expect(host.querySelectorAll('[role="listitem"] fr-skeleton')).toHaveLength(5);
  });
});
