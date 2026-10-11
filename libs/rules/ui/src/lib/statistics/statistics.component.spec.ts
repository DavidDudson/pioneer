import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { StatisticKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import {
  CONDITIONAL_STATISTICS,
  CYCLE,
  ENTRY_NAMES,
  FIGHTER_STATISTICS,
  GLOOM_WALKER,
} from '../testing/breakdown-fixtures';
import { BEATEN_STATISTICS } from '../testing/conditional-fixtures';
import { PINNED_STATISTICS, PINNED_WILL } from '../testing/override-fixtures';
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

/** The statistics' rows, without the breakdowns' own list items. */
function itemsOf(host: HTMLElement): Element[] {
  return [...host.querySelectorAll('[role="listitem"]')].filter((item) => item.closest('pio-breakdown') === null);
}

/** Each row as read: a disclosure's summary, which names what it opens, or a failure's parts. */
function rows(host: HTMLElement): string[] {
  return itemsOf(host).map((item) => {
    const summary = item.querySelector('summary');
    return summary === null ? partsOf(item) : textOf(summary);
  });
}

/** Each row's conditional lines, as summarised under its disclosure. */
function conditions(host: HTMLElement): string[][] {
  return itemsOf(host).map((item) =>
    [...item.querySelectorAll('pio-statistic-conditions fr-text')].map((part) => textOf(part)),
  );
}

describe(StatisticsView, () => {
  it('names each statistic in its summary with its total, a check signed and a DC plain', async () => {
    const host = hostOf(await render(FIGHTER_STATISTICS));

    expect(rows(host)).toStrictEqual(['Armor Class 20', 'Fortitude +10', 'Will +6']);
  });

  it('marks a pinned total in its summary, with the computed value beside it', async () => {
    const host = hostOf(await render(PINNED_STATISTICS));

    expect(rows(host)).toStrictEqual(['Armor Class 22 Pinned computed 20', 'Fortitude +10', 'Will +6']);
  });

  it('signs a pinned check and its computed value', async () => {
    const host = hostOf(await render([{ name: 'Will', kind: StatisticKind.Check, result: PINNED_WILL }]));

    expect(rows(host)).toStrictEqual(['Will +9 Pinned computed +6']);
  });

  it('summarises a conditional line under its total, with when it holds and where it comes from', async () => {
    const host = hostOf(await render(CONDITIONAL_STATISTICS));

    expect(rows(host).at(-1)).toBe('Stealth +9');
    expect(conditions(host).at(-1)).toStrictEqual([
      '+1 circumstance when you are in darkness (Gloom Walker)',
      '+2 status in some situations (Unseen)',
    ]);
  });

  it('leaves lines that apply, lose, are inactive or failed out of the summary', async () => {
    const host = hostOf(await render(FIGHTER_STATISTICS));

    expect(conditions(host)).toStrictEqual([['+2 circumstance when your shield is raised (Steel Shield)'], [], []]);
  });

  it('leaves out a conditional line an applied one of its type already beats, and says why in the breakdown', async () => {
    const fixture = await render(BEATEN_STATISTICS);
    const athletics = present(hostOf(fixture).querySelector('details'));

    expect(conditions(hostOf(fixture))).toStrictEqual([['+2 circumstance when you Climb (Sure Footing)']]);

    present(athletics.querySelector('summary')).click();
    await fixture.whenStable();

    const breakdown = present(athletics.querySelector('pio-breakdown'));
    expect(textOf(breakdown)).toContain('Applies when you Climb, but Steady Grip already gives as much.');
  });

  it('keeps conditional lines out of the summary, so the toggle is named by statistic and total alone', async () => {
    const host = hostOf(await render(CONDITIONAL_STATISTICS));

    expect(rows(host)).toStrictEqual(['Armor Class 20', 'Fortitude +10', 'Will +6', 'Stealth +9']);
  });

  it('names a conditional line by its entry id when the entry has no display name', async () => {
    const fixture = await render(CONDITIONAL_STATISTICS);
    fixture.componentRef.setInput('entryNames', new Map());
    await fixture.whenStable();

    expect(conditions(hostOf(fixture)).at(-1)?.[0]).toBe(`+1 circumstance when you are in darkness (${GLOOM_WALKER})`);
  });

  it('names the set override that pinned a total in its breakdown', async () => {
    const fixture = await render(PINNED_STATISTICS);
    const ac = present(hostOf(fixture).querySelector('details'));

    present(ac.querySelector('summary')).click();
    await fixture.whenStable();

    const breakdown = present(ac.querySelector('pio-breakdown'));
    expect(textOf(breakdown)).toContain('Set by the GM pins it to 22; computed 20.');
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
