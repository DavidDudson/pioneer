import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { RuleId } from '@pioneer/rules/engine';
import { Selector } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import type { StatisticRoller } from '../statistics/statistic-roller';
import { ENTRY_NAMES, GLOOM_WALKER } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { claimableStrike, DARKNESS_RULE } from '../testing/strike-fixtures';
import { StrikesView } from './strikes.component';
import type { NamedStrike } from './strikes.component';

interface Claim {
  readonly selector: Selector;
  readonly rule: RuleId;
  readonly on: boolean;
}

/** The claimable longsword, offering Gloom Walker for its damage and nothing for its attack. */
function damageClaimable(claimed: boolean): readonly NamedStrike[] {
  const [named] = claimableStrike(false);
  if (named === undefined) {
    return [];
  }
  const damageSituations = {
    offered: [{ id: DARKNESS_RULE, entry: GLOOM_WALKER }],
    claimed: new Set(claimed ? [DARKNESS_RULE] : []),
  };
  return [{ ...named, situations: undefined, damageSituations }];
}

async function render(strikes: readonly NamedStrike[], claims: Claim[]): Promise<HTMLElement> {
  const roller: StatisticRoller = {
    roll: () => undefined,
    claim: (selector, rule, on) => {
      claims.push({ selector, rule, on });
    },
  };
  TestBed.configureTestingModule({
    providers: [provideRulesUiI18nTesting(), { provide: STATISTIC_ROLLER, useValue: roller }],
  });
  const fixture: ComponentFixture<StrikesView> = TestBed.createComponent(StrikesView);
  fixture.componentRef.setInput('strikes', strikes);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function toggleOf(page: HTMLElement): HTMLButtonElement {
  const toggle = page.querySelector<HTMLButtonElement>('pio-statistic-conditions button');
  if (toggle === null) {
    throw new Error('Expected a situation toggle');
  }
  return toggle;
}

describe('StrikesView damage situations', () => {
  it('offers a rule element that changes the damage as a toggle claiming it for the Strike', async () => {
    const claims: Claim[] = [];
    const toggle = toggleOf(await render(damageClaimable(false), claims));

    expect(toggle.textContent.trim()).toBe('Extra damage when its condition holds (Gloom Walker)');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();

    expect(claims).toStrictEqual([{ selector: Selector.parse('strike:longsword'), rule: DARKNESS_RULE, on: true }]);
  });

  it('shows a claimed damage situation as pressed and lets it go when flipped back', async () => {
    const claims: Claim[] = [];
    const toggle = toggleOf(await render(damageClaimable(true), claims));

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();

    expect(claims.map(({ on }) => on)).toStrictEqual([false]);
  });
});
