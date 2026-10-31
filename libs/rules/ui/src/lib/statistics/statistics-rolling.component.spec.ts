import { TestBed } from '@angular/core/testing';
import { StatisticKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { ENTRY_NAMES, FIGHTER_STATISTICS } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { STATISTIC_ROLLER } from './statistic-roller';
import type { RollableStatistic, StatisticRoller } from './statistic-roller';
import { StatisticsView } from './statistics.component';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

/** A roller that records what it is asked to roll. */
function recordingRoller(rolled: RollableStatistic[]): StatisticRoller {
  return {
    roll: (rollable: RollableStatistic): void => {
      rolled.push(rollable);
    },
  };
}

/** Renders the fighter's statistics, with a roller when `rolled` is given. */
async function renderRolling(roller: StatisticRoller | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      ...(roller === undefined ? [] : [{ provide: STATISTIC_ROLLER, useValue: roller }]),
    ],
  });
  const fixture = TestBed.createComponent(StatisticsView);
  fixture.componentRef.setInput('statistics', FIGHTER_STATISTICS);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('StatisticsView rolling', () => {
  it('offers no roll button where the page provides no roller', async () => {
    const host = await renderRolling(undefined);

    expect(host.querySelectorAll('button[aria-label^="Roll "]')).toHaveLength(0);
  });

  it('offers a roll button on each check, not on a DC or a value, naming what it rolls', async () => {
    const host = await renderRolling(recordingRoller([]));
    const checks = FIGHTER_STATISTICS.filter(({ kind }) => kind === StatisticKind.Check).map(
      ({ name }) => `Roll ${name}`,
    );
    const labels = [...host.querySelectorAll('button[aria-label^="Roll "]')].map((button) =>
      String(button.getAttribute('aria-label')).replace(/ [+-]\d+$/u, ''),
    );

    expect(checks.length).toBeGreaterThan(0);
    expect(labels).toStrictEqual(checks);
  });

  it('labels the roll button with the signed modifier it rolls, never an icon', async () => {
    const host = await renderRolling(recordingRoller([]));
    const check = FIGHTER_STATISTICS.find(({ kind }) => kind === StatisticKind.Check);

    const button = present(host.querySelector<HTMLButtonElement>(`button[aria-label^="Roll ${check?.name} "]`));

    expect(button.textContent.trim()).toBe('+10');
    expect(button.querySelector('svg, fr-icon')).toBeNull();
  });

  it('hands the roller the statistic it was pressed on', async () => {
    const rolled: RollableStatistic[] = [];
    const host = await renderRolling(recordingRoller(rolled));
    const check = FIGHTER_STATISTICS.find(({ kind }) => kind === StatisticKind.Check);

    present(host.querySelector<HTMLButtonElement>(`button[aria-label^="Roll ${check?.name} "]`)).click();

    expect(rolled.map(({ name }) => name)).toStrictEqual([check?.name]);
    expect(rolled[0]?.statistic).toBe(check?.result);
  });
});
