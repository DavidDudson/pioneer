import { TestBed } from '@angular/core/testing';
import type { RuleId } from '@pioneer/rules/engine';
import type { Selector } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { claimable, CLAIMABLE_STATISTICS, FOOTING_RULE } from '../testing/conditional-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { STATISTIC_ROLLER } from './statistic-roller';
import type { StatisticRoller } from './statistic-roller';
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

interface Claim {
  readonly selector: Selector;
  readonly rule: RuleId;
  readonly on: boolean;
}

function claimingRoller(claims: Claim[]): StatisticRoller {
  return {
    roll: () => undefined,
    claim: (selector, rule, on) => {
      claims.push({ selector, rule, on });
    },
  };
}

async function renderClaiming(
  statistics: readonly NamedStatistic[],
  roller: StatisticRoller | undefined,
): Promise<HTMLElement> {
  const rolling = roller === undefined ? [] : [{ provide: STATISTIC_ROLLER, useValue: roller }];
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting(), ...rolling] });
  const fixture = TestBed.createComponent(StatisticsView);
  fixture.componentRef.setInput('statistics', statistics);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function toggleIn(host: HTMLElement): HTMLElement {
  return present(host.querySelector<HTMLElement>('pio-statistic-conditions button'));
}

describe('StatisticsView situations', () => {
  it('offers a conditional line as a toggle that claims its situation for that statistic', async () => {
    const claims: Claim[] = [];
    const host = await renderClaiming(claimable(false), claimingRoller(claims));

    const toggle = toggleIn(host);
    expect(textOf(toggle)).toBe('+2 circumstance when you Climb (Sure Footing)');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();

    const [statistic] = CLAIMABLE_STATISTICS;
    expect(claims).toStrictEqual([{ selector: statistic?.result.selector, rule: FOOTING_RULE, on: true }]);
  });

  it('shows a claimed situation pressed, and lets go of it when flipped back', async () => {
    const claims: Claim[] = [];
    const host = await renderClaiming(claimable(true), claimingRoller(claims));

    const toggle = toggleIn(host);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();

    expect(claims.map(({ on }) => on)).toStrictEqual([false]);
  });

  it('words the line as plain text where nothing can claim it', async () => {
    const host = await renderClaiming(CLAIMABLE_STATISTICS, undefined);

    expect(host.querySelector('pio-statistic-conditions button')).toBeNull();
    const conditions = present(host.querySelector('pio-statistic-conditions'));
    expect(textOf(conditions)).toBe('+2 circumstance when you Climb (Sure Footing)');
  });
});
